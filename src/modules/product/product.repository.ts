import { db } from "@/infra/db/db.config";
import { and, asc, desc, ilike, isNotNull, sql, type SQL } from "drizzle-orm";
import { brands, categories, globalProducts } from "./product.schema";
import type {
	IProductRepository,
} from "./product.interface";
import type {
	ProductSearchCandidate,
	ProductSemanticCandidate,
} from "./product.types";

class ProductRepository implements IProductRepository {
	async searchByText(input: {
		query: string;
		brand?: string;
		category?: string;
		limit: number;
	}): Promise<ProductSearchCandidate[]> {
		const normalizedQuery = input.query.trim();
		const queryPattern = `%${normalizedQuery}%`;
		const textScore = sql<number>`greatest(
			similarity(${globalProducts.name}, ${normalizedQuery}),
			similarity(concat(${globalProducts.name}, ' ', coalesce(${brands.name}, '')), ${normalizedQuery})
		)`;

		const filters: SQL[] = [
			sql`(
				${globalProducts.name} % ${normalizedQuery}
				OR ${globalProducts.name} ILIKE ${queryPattern}
				OR coalesce(${brands.name}, '') ILIKE ${queryPattern}
			)`,
		];

		if (input.brand) {
			filters.push(ilike(brands.name, `%${input.brand.trim()}%`));
		}

		if (input.category) {
			filters.push(ilike(categories.name, `%${input.category.trim()}%`));
		}

		const rows = await db
			.select({
				id: globalProducts.id,
				externalId: globalProducts.externalId,
				name: globalProducts.name,
				brand: brands.name,
				category: categories.name,
				matchCount: globalProducts.matchCount,
				textScore,
			})
			.from(globalProducts)
			.leftJoin(brands, sql`${globalProducts.brandId} = ${brands.id}`)
			.leftJoin(categories, sql`${globalProducts.categoryId} = ${categories.id}`)
			.where(and(...filters))
			.orderBy(desc(textScore), desc(globalProducts.matchCount), asc(globalProducts.id))
			.limit(input.limit);

		return rows.map((row) => ({
			id: row.id,
			externalId: row.externalId,
			name: row.name,
			brand: row.brand,
			category: row.category,
			matchCount: row.matchCount,
			textScore: this.clampScore(row.textScore),
		}));
	}

	async searchBySemantic(input: {
		vector: number[];
		brand?: string;
		category?: string;
		limit: number;
	}): Promise<ProductSemanticCandidate[]> {
		const vectorLiteral = `[${input.vector.join(",")}]`;
		const cosineDistance = sql<number>`(${globalProducts.embedding} <=> ${vectorLiteral}::vector)`;
		const semanticScore = sql<number>`greatest(0, 1 - ${cosineDistance})`;
		const filters: SQL[] = [isNotNull(globalProducts.embedding)];

		if (input.brand) {
			filters.push(ilike(brands.name, `%${input.brand.trim()}%`));
		}

		if (input.category) {
			filters.push(ilike(categories.name, `%${input.category.trim()}%`));
		}

		const rows = await db
			.select({
				id: globalProducts.id,
				externalId: globalProducts.externalId,
				name: globalProducts.name,
				brand: brands.name,
				category: categories.name,
				matchCount: globalProducts.matchCount,
				semanticScore,
			})
			.from(globalProducts)
			.leftJoin(brands, sql`${globalProducts.brandId} = ${brands.id}`)
			.leftJoin(categories, sql`${globalProducts.categoryId} = ${categories.id}`)
			.where(and(...filters))
			.orderBy(asc(cosineDistance), desc(globalProducts.matchCount), asc(globalProducts.id))
			.limit(input.limit);

		return rows
			.map((row) => ({
				id: row.id,
				externalId: row.externalId,
				name: row.name,
				brand: row.brand,
				category: row.category,
				matchCount: row.matchCount,
				semanticScore: this.clampScore(row.semanticScore),
			}))
			.filter((row) => row.semanticScore > 0);
	}

	private clampScore(value: unknown): number {
		if (typeof value !== "number" || !Number.isFinite(value)) {
			return 0;
		}

		if (value < 0) {
			return 0;
		}

		if (value > 1) {
			return 1;
		}

		return value;
	}
}

export const productRepository = new ProductRepository();
