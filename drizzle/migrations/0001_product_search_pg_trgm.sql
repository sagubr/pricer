CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "global_products_name_trgm_idx"
	ON "global_products" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brands_name_trgm_idx"
	ON "brands" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "global_products_embedding_cosine_idx"
	ON "global_products" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100)
	WHERE "embedding" IS NOT NULL;
