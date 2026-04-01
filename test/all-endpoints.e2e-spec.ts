import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { EventStatus } from '../src/common/enums/event-status.enum';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { AppZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';

const SEEDED = {
  categoryMusic: '33333333-3333-4333-8333-333333333333',
  eventMusic: '55555555-5555-4555-8555-555555555555',
};

describe('All Endpoints E2E', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  let newUserToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('App + Auth Endpoints', () => {
    it('GET /api should return hello world', async () => {
      const response = await request(app.getHttpServer()).get('/api').expect(200);
      expect(response.text).toBe('Hello World!');
    });

    it('POST /api/v1/auth/login (admin seeded) should return token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'IamSeed#2026',
        })
        .expect(200);

      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.user?.role).toBe('ADMIN');
      adminToken = response.body.accessToken as string;
    });

    it('POST /api/v1/auth/login (user seeded) should return token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'user@test.com',
          password: 'UserSeed#2026',
        })
        .expect(200);

      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.user?.role).toBe('USER');
      userToken = response.body.accessToken as string;
    });

    it('POST /api/v1/auth/register should create user', async () => {
      const random = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `e2e-${random}@test.com`,
          password: 'Password#123',
          name: `E2E User ${random}`,
        })
        .expect(201);

      expect(response.body.id).toBeTruthy();
      expect(response.body.role).toBe('USER');
      expect(response.body.isActive).toBe(true);

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: response.body.email,
          password: 'Password#123',
        })
        .expect(200);

      newUserToken = login.body.accessToken as string;
      expect(newUserToken).toBeTruthy();
    });

    it('GET /api/v1/auth/me without token should return 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('GET /api/v1/auth/me with token should return current user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.email).toBe('admin@test.com');
      expect(response.body.role).toBe('ADMIN');
    });
  });

  describe('Event Category Endpoints', () => {
    let createdCategoryId = '';
    let createdCategoryName = '';

    it('GET /api/v1/event-categories should return list (public)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/event-categories?page=1&limit=10')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 10);
    });

    it('GET /api/v1/event-categories/:id should return detail (public)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/event-categories/${SEEDED.categoryMusic}`)
        .expect(200);

      expect(response.body.id).toBe(SEEDED.categoryMusic);
    });

    it('POST /api/v1/event-categories without token should return 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/event-categories')
        .send({
          name: `Unauthorized Category ${Date.now()}`,
        })
        .expect(401);
    });

    it('POST /api/v1/event-categories with USER token should return 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/event-categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: `Forbidden Category ${Date.now()}`,
        })
        .expect(403);
    });

    it('POST /api/v1/event-categories with ADMIN token should create category', async () => {
      createdCategoryName = `E2E Category ${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/api/v1/event-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: createdCategoryName,
          description: 'created from all endpoints e2e test',
        })
        .expect(201);

      createdCategoryId = response.body.id as string;
      expect(createdCategoryId).toBeTruthy();
      expect(response.body.name).toBe(createdCategoryName);
    });

    it('POST /api/v1/event-categories duplicate name should return 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/event-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: createdCategoryName,
        })
        .expect(409);
    });

    it('PATCH /api/v1/event-categories/:id with ADMIN token should update category', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/event-categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${createdCategoryName} Updated`,
        })
        .expect(200);

      expect(response.body.id).toBe(createdCategoryId);
      expect(response.body.name).toContain('Updated');
    });

    it('DELETE /api/v1/event-categories/:id with ADMIN token should delete category', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/event-categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('GET /api/v1/event-categories/:id for deleted category should return 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/event-categories/${createdCategoryId}`)
        .expect(404);
    });
  });

  describe('Event Endpoints', () => {
    let draftEventId = '';
    let publishedEventId = '';
    const eventTitle = `E2E Event ${Date.now()}`;

    it('GET /api/v1/events (public) should only contain PUBLISHED status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/events?page=1&limit=10')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      for (const event of response.body.data as Array<{ status?: string }>) {
        expect(event.status).toBe(EventStatus.PUBLISHED);
      }
    });

    it('GET /api/v1/events (admin) should return all status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/events?page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      const statuses = new Set(
        (response.body.data as Array<{ status?: string }>).map(
          (event) => event.status,
        ),
      );
      expect(statuses.has(EventStatus.DRAFT) || statuses.has(EventStatus.PUBLISHED)).toBe(true);
    });

    it('GET /api/v1/events/:id should return detail (public)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/events/${SEEDED.eventMusic}`)
        .expect(200);

      expect(response.body.id).toBe(SEEDED.eventMusic);
    });

    it('GET /api/v1/events/:id with random id should return 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/events/99999999-9999-4999-8999-999999999999')
        .expect(404);
    });

    it('POST /api/v1/events without token should return 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .send({
          title: `${eventTitle} NoAuth`,
          location: 'Jakarta',
          startDate: '2026-09-01T10:00:00.000Z',
          endDate: '2026-09-01T12:00:00.000Z',
          price: 100000,
          totalTickets: 50,
          categoryId: SEEDED.categoryMusic,
        })
        .expect(401);
    });

    it('POST /api/v1/events with USER token should return 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${newUserToken || userToken}`)
        .send({
          title: `${eventTitle} User`,
          location: 'Jakarta',
          startDate: '2026-09-01T10:00:00.000Z',
          endDate: '2026-09-01T12:00:00.000Z',
          price: 100000,
          totalTickets: 50,
          categoryId: SEEDED.categoryMusic,
        })
        .expect(403);
    });

    it('POST /api/v1/events with invalid category should return 404', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `${eventTitle} InvalidCategory`,
          location: 'Jakarta',
          startDate: '2026-09-01T10:00:00.000Z',
          endDate: '2026-09-01T12:00:00.000Z',
          price: 100000,
          totalTickets: 50,
          categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        })
        .expect(404);
    });

    it('POST /api/v1/events with ADMIN token should create DRAFT event', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: eventTitle,
          description: 'created from all endpoints e2e test',
          location: 'Jakarta',
          startDate: '2026-09-01T10:00:00.000Z',
          endDate: '2026-09-01T12:00:00.000Z',
          price: 120000,
          totalTickets: 100,
          categoryId: SEEDED.categoryMusic,
        })
        .expect(201);

      draftEventId = response.body.id as string;
      expect(draftEventId).toBeTruthy();
      expect(response.body.status).toBe(EventStatus.DRAFT);
    });

    it('PATCH /api/v1/events/:id should update event (ADMIN)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/events/${draftEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `${eventTitle} Updated`,
          price: 150000,
        })
        .expect(200);

      expect(response.body.id).toBe(draftEventId);
      expect(response.body.title).toContain('Updated');
      expect(Number(response.body.price)).toBe(150000);
    });

    it('PATCH /api/v1/events/:id/publish should publish event', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/events/${draftEventId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe(EventStatus.PUBLISHED);
      publishedEventId = draftEventId;
    });

    it('PATCH /api/v1/events/:id/publish again should return 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/events/${publishedEventId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('DELETE /api/v1/events/:id when status PUBLISHED should return 400', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/events/${publishedEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('PATCH /api/v1/events/:id/unpublish should set back to DRAFT', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/events/${publishedEventId}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe(EventStatus.DRAFT);
    });

    it('PATCH /api/v1/events/:id/unpublish again should return 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/events/${publishedEventId}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('DELETE /api/v1/events/:id when status DRAFT should return 204', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/events/${publishedEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
});
