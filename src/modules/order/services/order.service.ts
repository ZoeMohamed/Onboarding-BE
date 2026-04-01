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
import { QUEUE_TICKET } from '../../queue/constants/queue.constant';
import { User } from '../../user/entities/user.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { ListOrdersQueryDto } from '../dto/list-orders-query.dto';
import { Order } from '../entities/order.entity';
import { Ticket } from '../entities/ticket.entity';
import { OrderRepository } from './order.repository';

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

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    @InjectQueue(QUEUE_TICKET)
    private readonly ticketQueue: Queue,
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

    return order;
  }

  async list(query: ListOrdersQueryDto, currentUser: User): Promise<ListResult> {
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

  private generateUniqueTicketCodes(quantity: number): string[] {
    const ticketCodes = new Set<string>();

    while (ticketCodes.size < quantity) {
      ticketCodes.add(`TKT-${ticketCodeGenerator()}`);
    }

    return [...ticketCodes];
  }

  private async dispatchTicketJob(orderId: string, tickets: Ticket[]): Promise<void> {
    try {
      await this.ticketQueue.add('generate-ticket-assets', {
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
}
