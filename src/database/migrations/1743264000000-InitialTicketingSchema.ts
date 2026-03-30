import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialTicketingSchema1743264000000
  implements MigrationInterface
{
  name = 'InitialTicketingSchema1743264000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`DROP TABLE IF EXISTS tickets CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS event_categories CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);

    await queryRunner.query(`DROP TYPE IF EXISTS orders_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS events_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS users_role_enum`);

    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE users_role_enum AS ENUM ('ADMIN', 'USER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE events_status_enum AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE orders_status_enum AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role users_role_enum NOT NULL DEFAULT 'USER',
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    await queryRunner.query(`
      CREATE TABLE event_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_event_categories_name ON event_categories(name);
    `);

    await queryRunner.query(`
      CREATE TABLE events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255) NOT NULL,
        "startDate" TIMESTAMP NOT NULL,
        "endDate" TIMESTAMP NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        "totalTickets" INT NOT NULL,
        "soldTickets" INT NOT NULL DEFAULT 0,
        status events_status_enum NOT NULL DEFAULT 'DRAFT',
        "categoryId" UUID NOT NULL REFERENCES event_categories(id),
        "createdById" UUID NOT NULL REFERENCES users(id),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_events_category_id ON events("categoryId");
    `);

    await queryRunner.query(`
      CREATE TABLE orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL REFERENCES users(id),
        "eventId" UUID NOT NULL REFERENCES events(id),
        quantity INT NOT NULL,
        "totalPrice" DECIMAL(12,2) NOT NULL,
        status orders_status_enum NOT NULL DEFAULT 'PENDING',
        "xenditInvoiceId" VARCHAR(255) UNIQUE,
        "paymentUrl" VARCHAR(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders("userId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_xendit_invoice_id ON orders("xenditInvoiceId");
    `);

    await queryRunner.query(`
      CREATE TABLE tickets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "orderId" UUID NOT NULL REFERENCES orders(id),
        "ticketCode" VARCHAR(255) NOT NULL UNIQUE,
        "qrCodeUrl" VARCHAR(255),
        "pdfUrl" VARCHAR(255),
        "isUsed" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets("orderId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets("ticketCode");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tickets`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders`);
    await queryRunner.query(`DROP TABLE IF EXISTS events`);
    await queryRunner.query(`DROP TABLE IF EXISTS event_categories`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);

    await queryRunner.query(`DROP TYPE IF EXISTS orders_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS events_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS users_role_enum`);
  }
}
