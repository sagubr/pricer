ALTER TABLE "receipt_items" DROP COLUMN "unit_price";
--> statement-breakpoint
ALTER TABLE "receipt_items"
	ADD COLUMN "unit_price" numeric(10, 4)
	GENERATED ALWAYS AS (
		CASE
			WHEN "quantity" IS NULL OR "total_amount" IS NULL OR "quantity" = 0 THEN NULL
			ELSE round(("total_amount" / NULLIF("quantity", 0))::numeric, 4)
		END
	) STORED;
