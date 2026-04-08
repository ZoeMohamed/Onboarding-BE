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
  eventMusic: '55555555-5555-4555-8555-555555555555',
};

describe('Phase 9 - Ticket Check-in (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  let paidTicketPayload: {
    orderId: string;
    ticketId: string;
    ticketCode: string;
  };
  let unpaidTicketPayload: {
    orderId: string;
    ticketId: string;
    ticketCode: string;
  };

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

    const paidOrder = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        eventId: SEEDED.eventMusic,
        quantity: 1,
      })
      .expect(201);

    const paidOrderId = paidOrder.body.id as string;
    const paidInvoiceId = paidOrder.body.xenditInvoiceId as string;

    await request(app.getHttpServer())
      .post('/api/v1/orders/webhooks/xendit/invoices')
      .set('x-callback-token', config.xendit.webhookToken)
      .send({
        id: paidInvoiceId,
        external_id: `order-${paidOrderId}`,
        status: 'PAID',
      })
      .expect(200);

    const paidDetail = await request(app.getHttpServer())
      .get(`/api/v1/orders/${paidOrderId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const paidTicket = paidDetail.body.tickets?.[0];
    paidTicketPayload = {
      orderId: paidOrderId,
      ticketId: paidTicket.id as string,
      ticketCode: paidTicket.ticketCode as string,
    };

    const unpaidOrder = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        eventId: SEEDED.eventMusic,
        quantity: 1,
      })
      .expect(201);

    const unpaidOrderId = unpaidOrder.body.id as string;

    const unpaidDetail = await request(app.getHttpServer())
      .get(`/api/v1/orders/${unpaidOrderId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const unpaidTicket = unpaidDetail.body.tickets?.[0];
    unpaidTicketPayload = {
      orderId: unpaidOrderId,
      ticketId: unpaidTicket.id as string,
      ticketCode: unpaidTicket.ticketCode as string,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  it('USER token should be forbidden to check-in ticket', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders/tickets/check-in')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        qrPayload: JSON.stringify(paidTicketPayload),
      })
      .expect(403);
  });

  it('ADMIN should be able to check-in paid ticket once', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders/tickets/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        qrPayload: JSON.stringify(paidTicketPayload),
      })
      .expect(200);

    expect(response.body.message).toBe('Check-in berhasil');
    expect(response.body.orderId).toBe(paidTicketPayload.orderId);
    expect(response.body.ticketId).toBe(paidTicketPayload.ticketId);
    expect(response.body.ticketCode).toBe(paidTicketPayload.ticketCode);
    expect(response.body.isUsed).toBe(true);
  });

  it('ADMIN second scan should fail with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders/tickets/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        qrPayload: JSON.stringify(paidTicketPayload),
      })
      .expect(400);

    expect(response.body.message).toBe('Ticket sudah digunakan');
  });

  it('ADMIN scan unpaid ticket should fail with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders/tickets/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        qrPayload: JSON.stringify(unpaidTicketPayload),
      })
      .expect(400);

    expect(response.body.message).toBe('Order belum dibayar');
  });

  it('ADMIN invalid QR payload should fail with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders/tickets/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        qrPayload: 'not-a-json',
      })
      .expect(400);

    expect(response.body.message).toBe('Format QR tidak valid');
  });

  it('ADMIN unknown ticket code should fail with 404', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders/tickets/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        qrPayload: JSON.stringify({
          orderId: unpaidTicketPayload.orderId,
          ticketId: unpaidTicketPayload.ticketId,
          ticketCode: 'TKT-NOTFOUND0001',
        }),
      })
      .expect(404);

    expect(response.body.message).toBe('Ticket tidak ditemukan');
  });
});
