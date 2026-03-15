CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "public";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "vector";
--> statement-breakpoint
CREATE TYPE "auth"."login_method" AS ENUM('email', 'username', 'both');--> statement-breakpoint
CREATE TYPE "public"."invoice_job_status" AS ENUM('queued', 'parsing', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "auth"."refresh_tokens" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_id" bigint NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"replaced_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" bigint NOT NULL,
	"refresh_token_hash" varchar(255) NOT NULL,
	"user_agent" varchar(500),
	"ip_address" varchar(45),
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revoked_reason" varchar(100),
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" uuid,
	"email" varchar(255) NOT NULL,
	"username" varchar(100),
	"name" varchar(255),
	"password_hash" varchar(255),
	"login_method" "auth"."login_method" DEFAULT 'email' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"permission_version" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "establishments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"cnpj" varchar(18) NOT NULL,
	"ie" varchar(50),
	"name" varchar(255) NOT NULL,
	"address" varchar(500),
	"city" varchar(100),
	"state" varchar(2),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_jobs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"job_id" varchar(120) NOT NULL,
	"source_url" text NOT NULL,
	"status" "invoice_job_status" DEFAULT 'queued' NOT NULL,
	"receipt_id" bigint,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"receipt_id" bigint NOT NULL,
	"global_product_id" bigint,
	"line_index" smallint NOT NULL,
	"raw_description" text NOT NULL,
	"raw_code" varchar(50),
	"quantity" numeric(10, 4),
	"unit" varchar(20),
	"unit_price" numeric(10, 4),
	"total_amount" numeric(12, 2),
	"normalized_name" varchar(255),
	"confidence_score" numeric(3, 2),
	"rejected" boolean DEFAULT false NOT NULL,
	"revision" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"establishment_id" bigint NOT NULL,
	"source_url" text NOT NULL,
	"model" varchar(10),
	"series" varchar(10),
	"number" varchar(20),
	"access_key" varchar(44),
	"protocol" varchar(50),
	"emitted_at" timestamp with time zone,
	"total_amount" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_products" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand_id" bigint,
	"category_id" bigint,
	"name_brand_hash" varchar(64) NOT NULL,
	"embedding" vector(384),
	"match_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_jobs" ADD CONSTRAINT "invoice_jobs_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_global_product_id_global_products_id_fk" FOREIGN KEY ("global_product_id") REFERENCES "public"."global_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_products" ADD CONSTRAINT "global_products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_products" ADD CONSTRAINT "global_products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_tokens_session_id_idx" ON "auth"."refresh_tokens" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_token_hash_unique" ON "auth"."refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "auth"."refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_external_id_unique" ON "auth"."refresh_tokens" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "auth"."sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_active_idx" ON "auth"."sessions" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_external_id_unique" ON "auth"."sessions" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "auth"."users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "auth"."users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_external_id_unique" ON "auth"."users" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "establishments_cnpj_unique" ON "establishments" USING btree ("cnpj");--> statement-breakpoint
CREATE UNIQUE INDEX "establishments_external_id_unique" ON "establishments" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "establishments_city_idx" ON "establishments" USING btree ("city");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_jobs_job_id_unique" ON "invoice_jobs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "invoice_jobs_status_idx" ON "invoice_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoice_jobs_source_url_idx" ON "invoice_jobs" USING btree ("source_url");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_items_receipt_line_unique" ON "receipt_items" USING btree ("receipt_id","line_index");--> statement-breakpoint
CREATE INDEX "receipt_items_receipt_id_idx" ON "receipt_items" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "receipt_items_product_id_idx" ON "receipt_items" USING btree ("global_product_id");--> statement-breakpoint
CREATE INDEX "receipt_items_rejected_idx" ON "receipt_items" USING btree ("rejected");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_external_id_unique" ON "receipts" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_source_url_unique" ON "receipts" USING btree ("source_url");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_access_key_unique" ON "receipts" USING btree ("access_key");--> statement-breakpoint
CREATE INDEX "receipts_establishment_id_idx" ON "receipts" USING btree ("establishment_id");--> statement-breakpoint
CREATE INDEX "receipts_emitted_at_idx" ON "receipts" USING btree ("emitted_at");--> statement-breakpoint
CREATE INDEX "receipts_dedup_fallback_idx" ON "receipts" USING btree ("establishment_id","number","series","emitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_name_unique" ON "brands" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "global_products_external_id_unique" ON "global_products" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "global_products_name_brand_hash_unique" ON "global_products" USING btree ("name_brand_hash");--> statement-breakpoint
CREATE INDEX "global_products_brand_id_idx" ON "global_products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "global_products_category_id_idx" ON "global_products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "global_products_match_count_idx" ON "global_products" USING btree ("match_count");