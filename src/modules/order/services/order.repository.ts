import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Event } from '../../event/entities/event.entity';
import { Order } from '../entities/order.entity';
import { Ticket } from '../entities/ticket.entity';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  runInTransaction<T>(handler: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(handler);
  }

  findEventByIdForUpdate(
    manager: EntityManager,
    eventId: string,
  ): Promise<Event | null> {
    return manager
      .getRepository(Event)
      .createQueryBuilder('event')
      .setLock('pessimistic_write')
      .where('event.id = :eventId', { eventId })
      .getOne();
  }

  saveEvent(manager: EntityManager, event: Event): Promise<Event> {
    return manager.getRepository(Event).save(event);
  }

  async createOrder(manager: EntityManager, data: Partial<Order>): Promise<Order> {
    const entity = manager.getRepository(Order).create(data);
    return manager.getRepository(Order).save(entity);
  }

  async createTickets(
    manager: EntityManager,
    data: Partial<Ticket>[],
  ): Promise<Ticket[]> {
    const entities = manager.getRepository(Ticket).create(data);
    return manager.getRepository(Ticket).save(entities);
  }

  async listByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Order[]; total: number }> {
    const [data, total] = await this.orderRepository
      .createQueryBuilder('ord')
      .where('ord."userId" = :userId', { userId })
      .orderBy('ord."createdAt"', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  findById(id: string): Promise<Order | null> {
    return this.orderRepository
      .createQueryBuilder('ord')
      .where('ord.id = :id', { id })
      .getOne();
  }

  findByIdWithTickets(id: string): Promise<Order | null> {
    return this.orderRepository
      .createQueryBuilder('ord')
      .leftJoinAndSelect('ord.tickets', 'ticket')
      .where('ord.id = :id', { id })
      .orderBy('ticket."createdAt"', 'ASC')
      .getOne();
  }

  findTicketsByOrderId(orderId: string): Promise<Ticket[]> {
    return this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket."orderId" = :orderId', { orderId })
      .orderBy('ticket."createdAt"', 'ASC')
      .getMany();
  }
}
