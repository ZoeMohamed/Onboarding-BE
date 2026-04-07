import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { customAlphabet } from 'nanoid';
import { EventStatus } from '../../../common/enums/event-status.enum';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import {
  JOB_GENERATE_TICKET_ASSETS,
  JOB_ORDER_PAID_NOTIFICATION,
  QUEUE_EMAIL,
  QUEUE_TICKET,
} from '../../queue/constants/queue.constant';
import { User } from '../../user/entities/user.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { ListOrdersQueryDto } from '../dto/list-orders-query.dto';
import { XenditInvoiceWebhookDto } from '../dto/xendit-invoice-webhook.dto';
import { Order } from '../entities/order.entity';
import { Ticket } from '../entities/ticket.entity';
import { OrderRepository } from './order.repository';
import { XenditService } from './xendit.service';

type ListResult = {
  data: Order[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

const ticketCodeGenerator = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  12,
);

const WEBHOOK_STATUS_MAP: Record<string, OrderStatus | undefined> = {
  PAID: OrderStatus.PAID,
  SETTLED: OrderStatus.PAID,
  EXPIRED: OrderStatus.EXPIRED,
  VOIDED: OrderStatus.CANCELLED,
};

type WebhookResult = {
  received: true;
  applied: boolean;
  orderId: string | null;
  status: OrderStatus | null;
  message: string;
};

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly xenditService: XenditService,
    @InjectQueue(QUEUE_TICKET)
    private readonly ticketQueue: Queue,
    @InjectQueue(QUEUE_EMAIL)
    private readonly emailQueue: Queue,
  ) {}

  async create(dto: CreateOrderDto, currentUser: User): Promise<Order> {
    const { order, tickets } = await this.orderRepository.runInTransaction(
      async (manager) => {
        const event = await this.orderRepository.findEventByIdForUpdate(
          manager,
          dto.eventId,
        );

        if (!event) {
          throw new NotFoundException('Event tidak ditemukan');
        }

        if (event.status !== EventStatus.PUBLISHED) {
          throw new BadRequestException('Event belum dipublish');
        }

        const remainingTickets = event.totalTickets - event.soldTickets;

        if (remainingTickets < dto.quantity) {
          throw new BadRequestException(
            `Tiket tidak tersedia, sisa ${remainingTickets} tiket`,
          );
        }

        event.soldTickets += dto.quantity;
        await this.orderRepository.saveEvent(manager, event);

        const totalPrice = Number((event.price * dto.quantity).toFixed(2));

        const order = await this.orderRepository.createOrder(manager, {
          userId: currentUser.id,
          eventId: event.id,
          quantity: dto.quantity,
          totalPrice,
          status: OrderStatus.PENDING,
          xenditInvoiceId: null,
          paymentUrl: null,
        });

        const ticketCodes = this.generateUniqueTicketCodes(dto.quantity);
        const tickets = await this.orderRepository.createTickets(
          manager,
          ticketCodes.map((ticketCode) => ({
            orderId: order.id,
            ticketCode,
            qrCodeUrl: null,
            pdfUrl: null,
            isUsed: false,
          })),
        );

        order.tickets = tickets;
        return { order, tickets };
      },
    );

    await this.dispatchTicketJob(order.id, tickets);
    return this.attachInvoice(order, currentUser);
  }

  async list(
    query: ListOrdersQueryDto,
    currentUser: User,
  ): Promise<ListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { data, total } = await this.orderRepository.listByUser(
      currentUser.id,
      page,
      limit,
    );

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async detail(id: string, currentUser: User): Promise<Order> {
    const order = await this.orderRepository.findByIdWithTickets(id);

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    if (order.userId !== currentUser.id) {
      throw new ForbiddenException('Bukan pemilik order');
    }

    return order;
  }

  async handleXenditInvoiceWebhook(
    callbackToken: string | undefined,
    payload: XenditInvoiceWebhookDto,
  ): Promise<WebhookResult> {
    this.xenditService.verifyWebhookToken(callbackToken);

    const mappedStatus = this.mapWebhookStatus(payload.status);

    if (!mappedStatus) {
      return {
        received: true,
        applied: false,
        orderId: null,
        status: null,
        message: `Status webhook ${payload.status} diabaikan`,
      };
    }

    const transactionResult = await this.orderRepository.runInTransaction(
      async (manager) => {
        const orderIdFromExternalId =
          this.xenditService.extractOrderIdFromExternalId(payload.external_id);

        let order = orderIdFromExternalId
          ? await this.orderRepository.findOrderByIdForUpdate(
              manager,
              orderIdFromExternalId,
            )
          : null;

        if (!order) {
          order =
            await this.orderRepository.findOrderByXenditInvoiceIdForUpdate(
              manager,
              payload.id,
            );
        }

        if (!order) {
          this.logger.warn(
            `Webhook invoice ${payload.id} tidak punya order yang cocok`,
          );
          return {
            applied: false,
            order: null,
            shouldDispatchPaidEmail: false,
            message: 'Order tidak ditemukan',
          };
        }

        const previousStatus = order.status;

        if (order.xenditInvoiceId && order.xenditInvoiceId !== payload.id) {
          this.logger.warn(
            `Invoice mismatch untuk order ${order.id}: expected=${order.xenditInvoiceId} got=${payload.id}`,
          );

          return {
            applied: false,
            order,
            shouldDispatchPaidEmail: false,
            message: 'Invoice mismatch',
          };
        }

        order.xenditInvoiceId = payload.id;
        if (!order.paymentUrl && payload.invoice_url) {
          order.paymentUrl = payload.invoice_url;
        }

        if (previousStatus === mappedStatus) {
          const savedOrder = await this.orderRepository.saveOrder(
            manager,
            order,
          );
          return {
            applied: false,
            order: savedOrder,
            shouldDispatchPaidEmail: false,
            message: 'Status order sudah sesuai',
          };
        }

        if (previousStatus !== OrderStatus.PENDING) {
          const savedOrder = await this.orderRepository.saveOrder(
            manager,
            order,
          );
          return {
            applied: false,
            order: savedOrder,
            shouldDispatchPaidEmail: false,
            message: `Status order ${previousStatus} tidak dapat diubah ke ${mappedStatus}`,
          };
        }

        if (
          mappedStatus === OrderStatus.EXPIRED ||
          mappedStatus === OrderStatus.CANCELLED
        ) {
          const event = await this.orderRepository.findEventByIdForUpdate(
            manager,
            order.eventId,
          );

          if (event) {
            event.soldTickets = Math.max(0, event.soldTickets - order.quantity);
            await this.orderRepository.saveEvent(manager, event);
          } else {
            this.logger.warn(
              `Event ${order.eventId} tidak ditemukan saat release kuota order ${order.id}`,
            );
          }
        }

        order.status = mappedStatus;
        const savedOrder = await this.orderRepository.saveOrder(manager, order);

        return {
          applied: true,
          order: savedOrder,
          shouldDispatchPaidEmail: mappedStatus === OrderStatus.PAID,
          message: `Status order diupdate ke ${mappedStatus}`,
        };
      },
    );

    if (transactionResult.shouldDispatchPaidEmail && transactionResult.order) {
      await this.dispatchPaidEmailJob(transactionResult.order);
    }

    return {
      received: true,
      applied: transactionResult.applied,
      orderId: transactionResult.order?.id ?? null,
      status: transactionResult.order?.status ?? null,
      message: transactionResult.message,
    };
  }

  private generateUniqueTicketCodes(quantity: number): string[] {
    const ticketCodes = new Set<string>();

    while (ticketCodes.size < quantity) {
      ticketCodes.add(`TKT-${ticketCodeGenerator()}`);
    }

    return [...ticketCodes];
  }

  private async attachInvoice(order: Order, currentUser: User): Promise<Order> {
    try {
      const invoice = await this.xenditService.createInvoice({
        orderId: order.id,
        amount: order.totalPrice,
        payerEmail: currentUser.email,
        description: `Pembayaran order ${order.id}`,
      });

      order.xenditInvoiceId = invoice.id;
      order.paymentUrl = invoice.invoiceUrl;

      const savedOrder = await this.orderRepository.save(order);
      savedOrder.tickets = order.tickets;

      return savedOrder;
    } catch (error) {
      this.logger.warn(
        `Gagal membuat invoice Xendit order ${order.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );

      return order;
    }
  }

  private mapWebhookStatus(status: string): OrderStatus | undefined {
    const normalizedStatus = status.trim().toUpperCase();
    return WEBHOOK_STATUS_MAP[normalizedStatus];
  }

  private async dispatchTicketJob(
    orderId: string,
    tickets: Ticket[],
  ): Promise<void> {
    try {
      await this.ticketQueue.add(JOB_GENERATE_TICKET_ASSETS, {
        orderId,
        tickets: tickets.map((ticket) => ({
          id: ticket.id,
          ticketCode: ticket.ticketCode,
        })),
      });
    } catch (error) {
      this.logger.warn(
        `Gagal push job ticket queue untuk order ${orderId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async dispatchPaidEmailJob(order: Order): Promise<void> {
    try {
      const [user, event] = await Promise.all([
        this.orderRepository.findUserById(order.userId),
        this.orderRepository.findEventById(order.eventId),
      ]);

      if (!user?.email) {
        this.logger.warn(
          `Skip email order ${order.id} karena email user tidak ditemukan`,
        );
        return;
      }

      await this.emailQueue.add(JOB_ORDER_PAID_NOTIFICATION, {
        orderId: order.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        event: {
          id: order.eventId,
          title: event?.title || 'Event',
        },
        totalPrice: order.totalPrice,
        quantity: order.quantity,
        status: order.status,
      });
    } catch (error) {
      this.logger.warn(
        `Gagal push email queue untuk order ${order.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
