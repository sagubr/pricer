import {
	pgTable,
	bigserial,
	bigint,
	varchar,
	integer,
	timestamp,
	uuid,
	customType,
	uniqueIndex,
	index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Dimensão confirmada pelo modelo Xenova/all-MiniLM-L6-v2 da API de embedding
const EMBEDDING_DIMENSIONS = 384;

const vector = customType<{ data: number[]; driverData: string }>({
	dataType() {
		return `vector(${EMBEDDING_DIMENSIONS})`;
	},
	toDriver(value: number[]): string {
		return `[${value.join(",")}]`;
	},
	fromDriver(value: string): number[] {
		return value.slice(1, -1).split(",").map(Number);
	},
});

export const brands = pgTable(
	"brands",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		name: varchar("name", { length: 100 }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [uniqueIndex("brands_name_unique").on(table.name)],
);

export const categories = pgTable(
	"categories",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		name: varchar("name", { length: 100 }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [uniqueIndex("categories_name_unique").on(table.name)],
);

export const globalProducts = pgTable(
	"global_products",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		externalId: uuid("external_id").defaultRandom().notNull(),
		name: varchar("name", { length: 255 }).notNull(),
		brandId: bigint("brand_id", { mode: "number" }).references(() => brands.id, {
			onDelete: "set null",
		}),
		categoryId: bigint("category_id", { mode: "number" }).references(() => categories.id, {
			onDelete: "set null",
		}),
		// SHA-256 hex de normalize(name)|normalize(brand ?? "unknown")
		nameBrandHash: varchar("name_brand_hash", { length: 64 }).notNull(),
		// Preenchido após chamada à API de embedding externa (nullable até ser processado)
		embedding: vector("embedding"),
		matchCount: integer("match_count").default(0).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()).notNull(),
	},
	(table) => [
		uniqueIndex("global_products_external_id_unique").on(table.externalId),
		uniqueIndex("global_products_name_brand_hash_unique").on(table.nameBrandHash),
		index("global_products_brand_id_idx").on(table.brandId),
		index("global_products_category_id_idx").on(table.categoryId),
		index("global_products_match_count_idx").on(table.matchCount),
	],
);

export const brandsRelations = relations(brands, ({ many }) => ({
	products: many(globalProducts),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
	products: many(globalProducts),
}));

export const globalProductsRelations = relations(globalProducts, ({ one }) => ({
	brand: one(brands, {
		fields: [globalProducts.brandId],
		references: [brands.id],
	}),
	category: one(categories, {
		fields: [globalProducts.categoryId],
		references: [categories.id],
	}),
}));

export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type GlobalProduct = typeof globalProducts.$inferSelect;
export type NewGlobalProduct = typeof globalProducts.$inferInsert;
