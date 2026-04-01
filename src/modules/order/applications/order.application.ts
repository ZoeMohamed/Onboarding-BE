import { Injectable } from '@nestjs/common';
import { User } from '../../user/entities/user.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { ListOrdersQueryDto } from '../dto/list-orders-query.dto';
import { OrderService } from '../services/order.service';

@Injectable()
export class OrderApplication {
  constructor(private readonly service: OrderService) {}

  create(dto: CreateOrderDto, currentUser: User) {
    return this.service.create(dto, currentUser);
  }

  list(query: ListOrdersQueryDto, currentUser: User) {
    return this.service.list(query, currentUser);
  }

  detail(id: string, currentUser: User) {
    return this.service.detail(id, currentUser);
  }
}
