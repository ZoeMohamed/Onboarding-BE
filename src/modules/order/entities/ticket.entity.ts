import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('tickets')
@Index(['orderId'])
@Index(['ticketCode'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column({ unique: true })
  ticketCode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  qrCodeUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdfUrl: string | null;

  @Column({ default: false })
  isUsed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Order, (order) => order.tickets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
