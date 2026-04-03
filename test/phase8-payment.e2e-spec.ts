import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { AppZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';
import { config } from '../src/infrastructure/config';

const SEEDED = {
  categoryMusic: '33333333-3333-4333-8333-333333333333',
};

describe('Phase 8 - Payment (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  let eventId: string;
  let paidOrderId: string;
  let paidOrderInvoiceId: string;

  jest.setTimeout(120_000);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new AppZodValidationPipe());
    app.useGlobalInterceptors(new LoggingInterceptor());

    await app.init();

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'IamSeed#2026' })
      .expect(200);

    adminToken = adminLogin.body.accessToken as string;

    const userLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@test.com', password: 'UserSeed#2026' })
      .expect(200);

    userToken = userLogin.body.accessToken as string;

    const timestamp = Date.now();
    const createdEvent = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Phase8 Payment Event ${timestamp}`,
        description: 'Event khusus test payment phase 8',
        location: 'Jakarta',
        startDate: '2026-11-01T10:00:00.000Z',
        endDate: '2026-11-01T12:00:00.000Z',
        price: 200000,
        totalTickets: 30,
        categoryId: SEEDED.categoryMusic,
      })
      .expect(201);

    eventId = createdEvent.body.id as string;

    await request(app.getHttpServer())
      .patch(`/api/v1/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/orders should create pending order with xendit invoice metadata', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        eventId,
        quantity: 1,
      })
      .expect(201);

    expect(response.body.id).toBeTruthy();
    expect(response.body.status).toBe('PENDING');
    expect(response.body.xenditInvoiceId).toBeTruthy();
    expect(response.body.paymentUrl).toBeTruthy();

    paidOrderId = response.body.id as string;
    paidOrderInvoiceId = response.body.xenditInvoiceId as string;
  });

  it('POST webhook with invalid callback token should return 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders/webhooks/xendit/invoices')
      .set('x-callback-token', 'invalid-token')
      .send({
        id: paidOrderInvoiceId,
        external_id: `order-${paidOrderId}`,
        status: 'PAID',
      })
      .expect(401);
  });

  it('POST webhook PAID should update order status to PAID', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders/webhooks/xendit/invoices')
      .set('x-callback-token', config.xendit.webhookToken)
      .send({
        id: paidOrderInvoiceId,
        external_id: `order-${paidOrderId}`,
        status: 'PAID',
      })
      .expect(200);

    expect(response.body.received).toBe(true);
    expect(response.body.applied).toBe(true);
    expect(response.body.orderId).toBe(paidOrderId);
    expect(response.body.status).toBe('PAID');
  });

  it('GET /api/v1/orders/:id should return PAID after webhook', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/orders/${paidOrderId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.id).toBe(paidOrderId);
    expect(response.body.status).toBe('PAID');
  });

  it('EXPIRED webhook should release sold ticket quota for pending order', async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}`)
      .expect(200);

    const soldBefore = Number(before.body.soldTickets);

    const createdOrder = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        eventId,
        quantity: 2,
      })
      .expect(201);

    const pendingOrderId = createdOrder.body.id as string;
    const pendingInvoiceId = createdOrder.body.xenditInvoiceId as string;

    const afterCreate = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}`)
      .expect(200);

    expect(Number(afterCreate.body.soldTickets)).toBe(soldBefore + 2);

    const webhookResponse = await request(app.getHttpServer())
      .post('/api/v1/orders/webhooks/xendit/invoices')
      .set('x-callback-token', config.xendit.webhookToken)
      .send({
        id: pendingInvoiceId,
        external_id: `order-${pendingOrderId}`,
        status: 'EXPIRED',
      })
      .expect(200);

    expect(webhookResponse.body.applied).toBe(true);
    expect(webhookResponse.body.status).toBe('EXPIRED');

    const afterExpired = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}`)
      .expect(200);

    expect(Number(afterExpired.body.soldTickets)).toBe(soldBefore);
  });

  it('DELETE event with existing order should return 409 (not 500)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/events/${eventId}/unpublish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    expect(response.body.message).toBe(
      'Event tidak dapat dihapus karena masih dipakai order',
    );
  });
});
