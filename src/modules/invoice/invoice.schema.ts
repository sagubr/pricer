import {
	pgTable,
	bigserial,
	bigint,
	varchar,
	text,
	numeric,
	smallint,
	boolean,
	timestamp,
	uuid,
	integer,
	pgEnum,
	uniqueIndex,
	index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { globalProducts } from "@/modules/product/product.schema";

export const invoiceJobStatusEnum = pgEnum("invoice_job_status", [
	"queued",
	"parsing",
	"processing",
	"completed",
	"failed",
]);

export const establishments = pgTable(
	"establishments",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		externalId: uuid("external_id").defaultRandom().notNull(),
		cnpj: varchar("cnpj", { length: 18 }).notNull(),
		ie: varchar("ie", { length: 50 }),
		name: varchar("name", { length: 255 }).notNull(),
		address: varchar("address", { length: 500 }),
		city: varchar("city", { length: 100 }),
		state: varchar("state", { length: 2 }),
		latitude: numeric("latitude", { precision: 10, scale: 8 }),
		longitude: numeric("longitude", { precision: 11, scale: 8 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()).notNull(),
	},
	(table) => [
		uniqueIndex("establishments_cnpj_unique").on(table.cnpj),
		uniqueIndex("establishments_external_id_unique").on(table.externalId),
		index("establishments_city_idx").on(table.city),
	],
);

export const receipts = pgTable(
	"receipts",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		externalId: uuid("external_id").defaultRandom().notNull(),
		establishmentId: bigint("establishment_id", { mode: "number" })
			.notNull()
			.references(() => establishments.id, { onDelete: "cascade" }),
		// URL do QR code usado como chave de dedup primária quando access_key não está disponível
		sourceUrl: text("source_url").notNull(),
		model: varchar("model", { length: 10 }),
		series: varchar("series", { length: 10 }),
		number: varchar("number", { length: 20 }),
		// Chave de acesso NF-e (44 dígitos) — dedup preferencial; nullable até parser extrair
		accessKey: varchar("access_key", { length: 44 }),
		protocol: varchar("protocol", { length: 50 }),
		emittedAt: timestamp("emitted_at", { withTimezone: true }),
		totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()).notNull(),
	},
	(table) => [
		uniqueIndex("receipts_external_id_unique").on(table.externalId),
		uniqueIndex("receipts_source_url_unique").on(table.sourceUrl),
		uniqueIndex("receipts_access_key_unique").on(table.accessKey),
		index("receipts_establishment_id_idx").on(table.establishmentId),
		index("receipts_emitted_at_idx").on(table.emittedAt),
		// Índice fallback para dedup quando access_key ausente e URL muda
		index("receipts_dedup_fallback_idx").on(
			table.establishmentId,
			table.number,
			table.series,
			table.emittedAt,
		),
	],
);

export const receiptItems = pgTable(
	"receipt_items",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		receiptId: bigint("receipt_id", { mode: "number" })
			.notNull()
			.references(() => receipts.id, { onDelete: "cascade" }),
		// Nullable: preenchido após match ou criação em global_products
		globalProductId: bigint("global_product_id", { mode: "number" }).references(
			() => globalProducts.id,
			{ onDelete: "set null" },
		),
		// Posição 0-based do item no documento original (correlaciona com index da IA)
		lineIndex: smallint("line_index").notNull(),
		rawDescription: text("raw_description").notNull(),
		rawCode: varchar("raw_code", { length: 50 }),
		quantity: numeric("quantity", { precision: 10, scale: 4 }),
		unit: varchar("unit", { length: 20 }),
		unitPrice: numeric("unit_price", { precision: 10, scale: 4 }).generatedAlwaysAs(
			sql`CASE
				WHEN "quantity" IS NULL OR "total_amount" IS NULL OR "quantity" = 0 THEN NULL
				ELSE round(("total_amount" / NULLIF("quantity", 0))::numeric, 4)
			END`,
		),
		totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
		// Output raw da IA para este item (antes de canonicalização em global_products)
		normalizedName: varchar("normalized_name", { length: 255 }),
		confidenceScore: numeric("confidence_score", { precision: 3, scale: 2 }),
		rejected: boolean("rejected").default(false).notNull(),
		revision: boolean("revision").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("receipt_items_receipt_line_unique").on(table.receiptId, table.lineIndex),
		index("receipt_items_receipt_id_idx").on(table.receiptId),
		index("receipt_items_product_id_idx").on(table.globalProductId),
		index("receipt_items_rejected_idx").on(table.rejected),
	],
);

export const invoiceJobs = pgTable(
	"invoice_jobs",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		jobId: varchar("job_id", { length: 120 }).notNull(),
		sourceUrl: text("source_url").notNull(),
		status: invoiceJobStatusEnum("status").default("queued").notNull(),
		receiptId: bigint("receipt_id", { mode: "number" }).references(
			() => receipts.id,
			{ onDelete: "set null" },
		),
		attempts: integer("attempts").default(0).notNull(),
		errorMessage: text("error_message"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()).notNull(),
	},
	(table) => [
		uniqueIndex("invoice_jobs_job_id_unique").on(table.jobId),
		index("invoice_jobs_status_idx").on(table.status),
		index("invoice_jobs_source_url_idx").on(table.sourceUrl),
	],
);

export const establishmentsRelations = relations(establishments, ({ many }) => ({
	receipts: many(receipts),
}));

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
	establishment: one(establishments, {
		fields: [receipts.establishmentId],
		references: [establishments.id],
	}),
	items: many(receiptItems),
}));

export const receiptItemsRelations = relations(receiptItems, ({ one }) => ({
	receipt: one(receipts, {
		fields: [receiptItems.receiptId],
		references: [receipts.id],
	}),
	globalProduct: one(globalProducts, {
		fields: [receiptItems.globalProductId],
		references: [globalProducts.id],
	}),
}));

export const invoiceJobsRelations = relations(invoiceJobs, ({ one }) => ({
	receipt: one(receipts, {
		fields: [invoiceJobs.receiptId],
		references: [receipts.id],
	}),
}));

export type Establishment = typeof establishments.$inferSelect;
export type NewEstablishment = typeof establishments.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
export type ReceiptItem = typeof receiptItems.$inferSelect;
export type NewReceiptItem = typeof receiptItems.$inferInsert;
export type InvoiceJob = typeof invoiceJobs.$inferSelect;
export type NewInvoiceJob = typeof invoiceJobs.$inferInsert;
