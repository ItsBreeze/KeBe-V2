import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260917015842 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "waitlist_subscriber" drop constraint if exists "waitlist_subscriber_email_unique";`);
    this.addSql(`create table if not exists "waitlist_subscriber" ("id" text not null, "email" text not null, "source" text not null default 'v2', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "waitlist_subscriber_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_waitlist_subscriber_email_unique" ON "waitlist_subscriber" ("email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_waitlist_subscriber_deleted_at" ON "waitlist_subscriber" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "waitlist_subscriber" cascade;`);
  }

}
