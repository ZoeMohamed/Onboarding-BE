import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { AppZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';

const expectCacheHeader = (
  value: string | undefined,
  expected: 'MISS' | 'HIT',
  context: string,
) => {
  expect(value).toBe(expected);
  expect(value).toEqual(expected);
  if (value !== expected) {
    throw new Error(
      `${context}: expected X-Cache=${expected}, got ${String(value)}`,
    );
  }
};

describe('Phase 5 - Cache Flow (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;

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

    const userLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@test.com', password: 'UserSeed#2026' })
      .expect(200);

    adminToken = adminLogin.body.accessToken as string;
    userToken = userLogin.body.accessToken as string;

    expect(adminToken).toBeTruthy();
    expect(userToken).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
  });

  it('events list cache should be separated between public and admin scope', async () => {
    const url = '/api/v1/events?page=1&limit=10';

    const publicFirst = await request(app.getHttpServer()).get(url).expect(200);
    expectCacheHeader(
      publicFirst.headers['x-cache'],
      'MISS',
      'public events first request',
    );

    const publicSecond = await request(app.getHttpServer())
      .get(url)
      .expect(200);
    expectCacheHeader(
      publicSecond.headers['x-cache'],
      'HIT',
      'public events second request',
    );

    const adminFirst = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expectCacheHeader(
      adminFirst.headers['x-cache'],
      'MISS',
      'admin events first request',
    );

    const adminSecond = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expectCacheHeader(
      adminSecond.headers['x-cache'],
      'HIT',
      'admin events second request',
    );

    expect(Number(adminSecond.body.meta.total)).toBeGreaterThanOrEqual(
      Number(publicSecond.body.meta.total),
    );
  });

  it('event-categories list cache should invalidate on create/update/delete', async () => {
    const random = Date.now();
    const categoryName = `Cache Category ${random}`;
    const updatedName = `${categoryName} Updated`;
    const listUrl = '/api/v1/event-categories?page=1&limit=10';

    const listFirst = await request(app.getHttpServer()).get(listUrl).expect(200);
    expectCacheHeader(
      listFirst.headers['x-cache'],
      'MISS',
      'event-categories first request',
    );

    const listSecond = await request(app.getHttpServer()).get(listUrl).expect(200);
    expectCacheHeader(
      listSecond.headers['x-cache'],
      'HIT',
      'event-categories second request',
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/event-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: categoryName, description: 'cache test' })
      .expect(201);

    const categoryId = created.body.id as string;
    expect(categoryId).toBeTruthy();

    const searchCreatedUrl = `/api/v1/event-categories?page=1&limit=10&search=${encodeURIComponent(categoryName)}`;
    const afterCreateFirst = await request(app.getHttpServer())
      .get(searchCreatedUrl)
      .expect(200);
    expectCacheHeader(
      afterCreateFirst.headers['x-cache'],
      'MISS',
      'event-categories after create first request',
    );

    const afterCreateSecond = await request(app.getHttpServer())
      .get(searchCreatedUrl)
      .expect(200);
    expectCacheHeader(
      afterCreateSecond.headers['x-cache'],
      'HIT',
      'event-categories after create second request',
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/event-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: updatedName })
      .expect(200);

    const searchUpdatedUrl = `/api/v1/event-categories?page=1&limit=10&search=${encodeURIComponent(updatedName)}`;
    const afterUpdateFirst = await request(app.getHttpServer())
      .get(searchUpdatedUrl)
      .expect(200);
    expectCacheHeader(
      afterUpdateFirst.headers['x-cache'],
      'MISS',
      'event-categories after update first request',
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/event-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const afterDeleteFirst = await request(app.getHttpServer())
      .get(searchUpdatedUrl)
      .expect(200);
    expectCacheHeader(
      afterDeleteFirst.headers['x-cache'],
      'MISS',
      'event-categories after delete first request',
    );
    expect(Number(afterDeleteFirst.body.meta.total)).toBe(0);
  });

  it('events list cache should invalidate on create/publish/unpublish/delete', async () => {
    const random = Date.now();
    const title = `Cache Event ${random}`;
    const searchUrl = `/api/v1/events?page=1&limit=10&search=${encodeURIComponent(title)}`;

    const warmFirst = await request(app.getHttpServer())
      .get(searchUrl)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expectCacheHeader(
      warmFirst.headers['x-cache'],
      'MISS',
      'events warm first request',
    );

    const warmSecond = await request(app.getHttpServer())
      .get(searchUrl)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expectCacheHeader(
      warmSecond.headers['x-cache'],
      'HIT',
      'events warm second request',
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title,
        description: 'cache event',
        location: 'Jakarta',
        startDate: '2026-08-01T10:00:00.000Z',
        endDate: '2026-08-01T12:00:00.000Z',
        price: 100000,
        totalTickets: 25,
        categoryId: '33333333-3333-4333-8333-333333333333',
      })
      .expect(201);

    const eventId = created.body.id as string;
    expect(eventId).toBeTruthy();

    const afterCreateFirst = await request(app.getHttpServer())
      .get(searchUrl)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expectCacheHeader(
      afterCreateFirst.headers['x-cache'],
      'MISS',
      'events after create first request',
    );

    const afterCreateSecond = await request(app.getHttpServer())
      .get(searchUrl)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expectCacheHeader(
      afterCreateSecond.headers['x-cache'],
      'HIT',
      'events after create second request',
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const publicAfterPublishFirst = await request(app.getHttpServer())
      .get(searchUrl)
      .expect(200);
    expectCacheHeader(
      publicAfterPublishFirst.headers['x-cache'],
      'MISS',
      'public events after publish first request',
    );
    expect(Number(publicAfterPublishFirst.body.meta.total)).toBe(1);

    const publicAfterPublishSecond = await request(app.getHttpServer())
      .get(searchUrl)
      .expect(200);
    expectCacheHeader(
      publicAfterPublishSecond.headers['x-cache'],
      'HIT',
      'public events after publish second request',
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/events/${eventId}/unpublish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const publicAfterUnpublishFirst = await request(app.getHttpServer())
      .get(searchUrl)
      .expect(200);
    expectCacheHeader(
      publicAfterUnpublishFirst.headers['x-cache'],
      'MISS',
      'public events after unpublish first request',
    );
    expect(Number(publicAfterUnpublishFirst.body.meta.total)).toBe(0);

    await request(app.getHttpServer())
      .delete(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const adminAfterDeleteFirst = await request(app.getHttpServer())
      .get(searchUrl)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expectCacheHeader(
      adminAfterDeleteFirst.headers['x-cache'],
      'MISS',
      'admin events after delete first request',
    );
    expect(Number(adminAfterDeleteFirst.body.meta.total)).toBe(0);
  });

  it('user should stay forbidden for ADMIN write endpoint', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/event-categories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: `Forbidden Cache ${Date.now()}` })
      .expect(403);

    expect(response.body.success).toBe(false);
  });
});
