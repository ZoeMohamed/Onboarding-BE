import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { AppZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';

const SEEDED = {
  publishedEvent: '55555555-5555-4555-8555-555555555555',
  draftEvent: '66666666-6666-4666-8666-666666666666',
};

describe('Phase 7 - Orders (e2e)', () => {
  let app: INestApplication<App>;
  let userToken: string;
  let adminToken: string;
  let otherUserToken: string;
  let createdOrderId: string;

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

    const userLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@test.com', password: 'UserSeed#2026' })
      .expect(200);

    userToken = userLogin.body.accessToken as string;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'IamSeed#2026' })
      .expect(200);

    adminToken = adminLogin.body.accessToken as string;

    const random = Date.now();
    const otherEmail = `orders-owner-${random}@test.com`;
    const otherPassword = 'Password#123';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: otherEmail,
        password: otherPassword,
        name: `Orders Owner ${random}`,
      })
      .expect(201);

    const otherLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: otherEmail, password: otherPassword })
      .expect(200);

    otherUserToken = otherLogin.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/orders without token should return 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({ eventId: SEEDED.publishedEvent, quantity: 1 })
      .expect(401);
  });

  it('POST /api/v1/orders with ADMIN token should return 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ eventId: SEEDED.publishedEvent, quantity: 1 })
      .expect(403);
  });

  it('POST /api/v1/orders event tidak ditemukan should return 404', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: 1,
      })
      .expect(404);
  });

  it('POST /api/v1/orders event belum dipublish should return 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ eventId: SEEDED.draftEvent, quantity: 1 })
      .expect(400);

    expect(response.body.message).toBe('Event belum dipublish');
  });

  it('POST /api/v1/orders tiket tidak tersedia should return 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ eventId: SEEDED.publishedEvent, quantity: 999999 })
      .expect(400);

    expect(String(response.body.message)).toContain('Tiket tidak tersedia');
  });

  it('POST /api/v1/orders success should create order + tickets', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ eventId: SEEDED.publishedEvent, quantity: 2 })
      .expect(201);

    expect(response.body.id).toBeTruthy();
    expect(response.body.userId).toBeTruthy();
    expect(response.body.eventId).toBe(SEEDED.publishedEvent);
    expect(response.body.quantity).toBe(2);
    expect(response.body.status).toBe('PENDING');
    expect(Array.isArray(response.body.tickets)).toBe(true);
    expect(response.body.tickets).toHaveLength(2);

    createdOrderId = response.body.id as string;
  });

  it('GET /api/v1/orders should return own orders with pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/orders?page=1&limit=10')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.limit).toBe(10);
    expect(Number(response.body.meta.total)).toBeGreaterThan(0);
  });

  it('GET /api/v1/orders/:id should return detail for owner', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.id).toBe(createdOrderId);
    expect(response.body.userId).toBeTruthy();
    expect(Array.isArray(response.body.tickets)).toBe(true);
    expect(response.body.tickets).toHaveLength(2);
  });

  it('GET /api/v1/orders/:id by other user should return 403', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(403);

    expect(response.body.message).toBe('Bukan pemilik order');
  });

  it('GET /api/v1/orders/:id random id should return 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/orders/99999999-9999-4999-8999-999999999999')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });
});
