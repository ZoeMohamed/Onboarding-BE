import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/application.constant';
import AppDataSource from '../data-source';

const SEED_IDS = {
  adminUser: '11111111-1111-4111-8111-111111111111',
  buyerUser: '22222222-2222-4222-8222-222222222222',
  categoryMusic: '33333333-3333-4333-8333-333333333333',
  categoryTech: '44444444-4444-4444-8444-444444444444',
  eventMusic: '55555555-5555-4555-8555-555555555555',
  eventTech: '66666666-6666-4666-8666-666666666666',
  orderPaid: '77777777-7777-4777-8777-777777777777',
  ticket1: '88888888-8888-4888-8888-888888888881',
  ticket2: '88888888-8888-4888-8888-888888888882',
};

async function runSeed() {
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@test.com';
    const adminName = process.env.SEED_ADMIN_NAME ?? 'Admin User';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'IamSeed#2026';

    const buyerEmail = process.env.SEED_USER_EMAIL ?? 'user@test.com';
    const buyerName = process.env.SEED_USER_NAME ?? 'Seed User';
    const buyerPassword = process.env.SEED_USER_PASSWORD ?? 'UserSeed#2026';

    const adminHashedPassword = await bcrypt.hash(
      adminPassword,
      BCRYPT_SALT_ROUNDS,
    );
    const buyerHashedPassword = await bcrypt.hash(
      buyerPassword,
      BCRYPT_SALT_ROUNDS,
    );

    await queryRunner.query(
      `
        INSERT INTO users (id, email, name, password, role, "isActive")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = NOW();
      `,
      [
        SEED_IDS.adminUser,
        adminEmail,
        adminName,
        adminHashedPassword,
        'ADMIN',
        true,
      ],
    );

    await queryRunner.query(
      `
        INSERT INTO users (id, email, name, password, role, "isActive")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = NOW();
      `,
      [
        SEED_IDS.buyerUser,
        buyerEmail,
        buyerName,
        buyerHashedPassword,
        'USER',
        true,
      ],
    );

    await queryRunner.query(
      `
        INSERT INTO event_categories (id, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description;
      `,
      [
        SEED_IDS.categoryMusic,
        'Seed Music Category',
        'Kategori untuk event musik dan konser',
      ],
    );

    await queryRunner.query(
      `
        INSERT INTO event_categories (id, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description;
      `,
      [
        SEED_IDS.categoryTech,
        'Seed Technology Category',
        'Kategori untuk event teknologi dan workshop',
      ],
    );

    await queryRunner.query(
      `
        INSERT INTO events (
          id,
          title,
          description,
          location,
          "startDate",
          "endDate",
          price,
          "totalTickets",
          "soldTickets",
          status,
          "categoryId",
          "createdById"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          location = EXCLUDED.location,
          "startDate" = EXCLUDED."startDate",
          "endDate" = EXCLUDED."endDate",
          price = EXCLUDED.price,
          "totalTickets" = EXCLUDED."totalTickets",
          "soldTickets" = EXCLUDED."soldTickets",
          status = EXCLUDED.status,
          "categoryId" = EXCLUDED."categoryId",
          "createdById" = EXCLUDED."createdById",
          "updatedAt" = NOW();
      `,
      [
        SEED_IDS.eventMusic,
        'Java Jazz Seed Concert',
        'Event seed untuk simulasi pembelian tiket.',
        'Jakarta Convention Center',
        '2026-06-15T12:00:00.000Z',
        '2026-06-15T15:00:00.000Z',
        350000,
        500,
        2,
        'PUBLISHED',
        SEED_IDS.categoryMusic,
        SEED_IDS.adminUser,
      ],
    );

    await queryRunner.query(
      `
        INSERT INTO events (
          id,
          title,
          description,
          location,
          "startDate",
          "endDate",
          price,
          "totalTickets",
          "soldTickets",
          status,
          "categoryId",
          "createdById"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          location = EXCLUDED.location,
          "startDate" = EXCLUDED."startDate",
          "endDate" = EXCLUDED."endDate",
          price = EXCLUDED.price,
          "totalTickets" = EXCLUDED."totalTickets",
          "soldTickets" = EXCLUDED."soldTickets",
          status = EXCLUDED.status,
          "categoryId" = EXCLUDED."categoryId",
          "createdById" = EXCLUDED."createdById",
          "updatedAt" = NOW();
      `,
      [
        SEED_IDS.eventTech,
        'TypeScript Advanced Workshop',
        'Workshop seed untuk kategori teknologi.',
        'Bandung Digital Valley',
        '2026-07-10T02:00:00.000Z',
        '2026-07-10T10:00:00.000Z',
        150000,
        100,
        0,
        'DRAFT',
        SEED_IDS.categoryTech,
        SEED_IDS.adminUser,
      ],
    );

    await queryRunner.query(
      `
        INSERT INTO orders (
          id,
          "userId",
          "eventId",
          quantity,
          "totalPrice",
          status,
          "xenditInvoiceId",
          "paymentUrl"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          "userId" = EXCLUDED."userId",
          "eventId" = EXCLUDED."eventId",
          quantity = EXCLUDED.quantity,
          "totalPrice" = EXCLUDED."totalPrice",
          status = EXCLUDED.status,
          "xenditInvoiceId" = EXCLUDED."xenditInvoiceId",
          "paymentUrl" = EXCLUDED."paymentUrl",
          "updatedAt" = NOW();
      `,
      [
        SEED_IDS.orderPaid,
        SEED_IDS.buyerUser,
        SEED_IDS.eventMusic,
        2,
        700000,
        'PAID',
        'seed-invoice-0001',
        'https://checkout.xendit.co/web/seed-invoice-0001',
      ],
    );

    await queryRunner.query(
      `
        INSERT INTO tickets (id, "orderId", "ticketCode", "qrCodeUrl", "pdfUrl", "isUsed")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          "orderId" = EXCLUDED."orderId",
          "ticketCode" = EXCLUDED."ticketCode",
          "qrCodeUrl" = EXCLUDED."qrCodeUrl",
          "pdfUrl" = EXCLUDED."pdfUrl",
          "isUsed" = EXCLUDED."isUsed";
      `,
      [
        SEED_IDS.ticket1,
        SEED_IDS.orderPaid,
        'TICKET-SEED-0001',
        'https://cdn.example.com/qr/TICKET-SEED-0001.png',
        'https://cdn.example.com/pdf/TICKET-SEED-0001.pdf',
        false,
      ],
    );

    await queryRunner.query(
      `
        INSERT INTO tickets (id, "orderId", "ticketCode", "qrCodeUrl", "pdfUrl", "isUsed")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          "orderId" = EXCLUDED."orderId",
          "ticketCode" = EXCLUDED."ticketCode",
          "qrCodeUrl" = EXCLUDED."qrCodeUrl",
          "pdfUrl" = EXCLUDED."pdfUrl",
          "isUsed" = EXCLUDED."isUsed";
      `,
      [
        SEED_IDS.ticket2,
        SEED_IDS.orderPaid,
        'TICKET-SEED-0002',
        'https://cdn.example.com/qr/TICKET-SEED-0002.png',
        'https://cdn.example.com/pdf/TICKET-SEED-0002.pdf',
        false,
      ],
    );

    await queryRunner.commitTransaction();
    console.log('Seed initial data: success');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Seed initial data: failed');
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

void runSeed();
