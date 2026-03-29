import { db } from "@/infra/db/db.config";
import { logger } from "@/infra/observability/logger.config";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { embeddingService } from "@/modules/embedding/embedding.service";
import {
	categories,
	brands,
	globalProducts,
} from "@/modules/product-catalog/product-catalog.schema";
import {
	establishments,
	invoiceJobs,
	receiptItems,
	receipts,
	type InvoiceJob,
} from "./invoice.schema";
import type {
	InvoiceJobStatus,
	InvoiceParseResponse,
	InvoiceProcessingResponse,
} from "./invoice.types";

interface PersistInvoiceResult {
	receiptId: number;
	wasDeduplicated: boolean;
}

class InvoiceRepository {
	async upsertJob(input: { jobId: string; sourceUrl: string; status: InvoiceJobStatus }) {
		await db
			.insert(invoiceJobs)
			.values({
				jobId: input.jobId,
				sourceUrl: input.sourceUrl,
				status: input.status,
			})
			.onConflictDoUpdate({
				target: invoiceJobs.jobId,
				set: {
					sourceUrl: input.sourceUrl,
					status: input.status,
					errorMessage: null,
				},
			});
	}

	async updateJobStatus(input: {
		jobId: string;
		status: InvoiceJobStatus;
		errorMessage?: string;
		receiptId?: number;
		incrementAttempts?: boolean;
	}) {
		const [job] = await db
			.select()
			.from(invoiceJobs)
			.where(eq(invoiceJobs.jobId, input.jobId))
			.limit(1);

		if (!job) {
			return;
		}

		await db
			.update(invoiceJobs)
			.set({
				status: input.status,
				errorMessage: input.errorMessage || null,
				receiptId: input.receiptId || job.receiptId,
				attempts: input.incrementAttempts ? job.attempts + 1 : job.attempts,
			})
			.where(eq(invoiceJobs.jobId, input.jobId));
	}

	async getJobById(jobId: string): Promise<InvoiceJob | null> {
		const [job] = await db
			.select()
			.from(invoiceJobs)
			.where(eq(invoiceJobs.jobId, jobId))
			.limit(1);
		return job || null;
	}

	async persistProcessedInvoice(input: {
		url: string;
		invoice: InvoiceParseResponse;
		normalization: InvoiceProcessingResponse["normalization"];
	}): Promise<PersistInvoiceResult> {
		const pendingEmbeddings: Array<{ productId: number; text: string }> = [];

		const transactionResult = await db.transaction(async (tx) => {
			const establishmentId = await this.upsertEstablishment(tx, input.invoice);
			const existingReceipt = await this.findExistingReceipt(tx, {
				url: input.url,
				accessKey: input.invoice.metadata?.accessKey,
				establishmentId,
				number: input.invoice.metadata?.number,
				series: input.invoice.metadata?.series,
				emittedAt: this.parseDate(input.invoice.metadata?.emittedAt),
			});

			if (existingReceipt) {
				pendingEmbeddings.push(
					...(await this.findPendingEmbeddingsForReceipt(tx, existingReceipt.id)),
				);

				return {
					receiptId: existingReceipt.id,
					wasDeduplicated: true,
				};
			}

			const [insertedReceipt] = await tx
				.insert(receipts)
				.values({
					establishmentId,
					sourceUrl: input.url,
					model: input.invoice.metadata?.model || null,
					series: input.invoice.metadata?.series || null,
					number: input.invoice.metadata?.number || null,
					accessKey: input.invoice.metadata?.accessKey || null,
					protocol: input.invoice.metadata?.protocol || null,
					emittedAt: this.parseDate(input.invoice.metadata?.emittedAt),
					totalAmount: this.toNumericString(input.invoice.total),
				})
				.onConflictDoNothing({ target: receipts.sourceUrl })
				.returning({ id: receipts.id });

			let receiptId = insertedReceipt?.id;
			if (!receiptId) {
				const [receipt] = await tx
					.select({ id: receipts.id })
					.from(receipts)
					.where(eq(receipts.sourceUrl, input.url))
					.limit(1);
				receiptId = receipt?.id;
			}

			if (!receiptId) {
				throw new Error("Falha ao persistir nota fiscal");
			}

			const normalizedByIndex = new Map(
				input.normalization.data.items.map((item) => [item.index, item]),
			);

			const itemsToInsert: Array<typeof receiptItems.$inferInsert> = [];

			for (const [lineIndex, item] of input.invoice.items.entries()) {
				const normalized = normalizedByIndex.get(lineIndex);
				const normalizedName = normalized?.name || null;
				const normalizedBrand = normalized?.brand || null;
				const normalizedCategory = normalized?.category || null;
				let globalProductId: number | null = null;

				if (normalizedName) {
					const product = await this.findOrCreateGlobalProduct(tx, {
						name: normalizedName,
						brand: normalizedBrand,
						category: normalizedCategory,
					});
					globalProductId = product.id;

					if (product.needsEmbedding) {
						pendingEmbeddings.push({
							productId: product.id,
							text: `${normalizedName} ${normalizedBrand || ""}`.trim(),
						});
					}
				}

				itemsToInsert.push({
					receiptId,
					lineIndex,
					rawDescription: item.description,
					rawCode: item.code || null,
					quantity: this.toNumericString(item.quantity),
					unit: item.unit || null,
					unitPrice: this.toNumericString(item.unit_price),
					totalAmount: this.toNumericString(item.total),
					globalProductId,
					normalizedName,
					confidenceScore: this.toNumericString(normalized?.confidenceScore),
					rejected: normalized?.rejected || false,
					revision: normalized?.revision || false,
				});
			}

			if (itemsToInsert.length > 0) {
				const insertedItems = await tx
					.insert(receiptItems)
					.values(itemsToInsert)
					.onConflictDoNothing({
						target: [receiptItems.receiptId, receiptItems.lineIndex],
					})
					.returning({ globalProductId: receiptItems.globalProductId });

				await this.incrementMatchCounts(tx, insertedItems);
			}

			return {
				receiptId,
				wasDeduplicated: false,
			};
		});

		await this.persistPendingEmbeddings(pendingEmbeddings);

		return transactionResult;
	}

	private async upsertEstablishment(
		tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
		invoice: InvoiceParseResponse,
	): Promise<number> {
		const [establishment] = await tx
			.insert(establishments)
			.values({
				cnpj: invoice.issuer.cnpj,
				ie: invoice.issuer.ie || null,
				name: invoice.issuer.name,
				address: invoice.issuer.address || null,
				city: invoice.issuer.city || null,
				state: invoice.issuer.state || null,
				latitude: this.toNumericString(invoice.issuer.location?.lat),
				longitude: this.toNumericString(invoice.issuer.location?.lon),
			})
			.onConflictDoUpdate({
				target: establishments.cnpj,
				set: {
					ie: invoice.issuer.ie || null,
					name: invoice.issuer.name,
					address: invoice.issuer.address || null,
					city: invoice.issuer.city || null,
					state: invoice.issuer.state || null,
					latitude: this.toNumericString(invoice.issuer.location?.lat),
					longitude: this.toNumericString(invoice.issuer.location?.lon),
				},
			})
			.returning({ id: establishments.id });

		if (establishment?.id) {
			return establishment.id;
		}

		const [found] = await tx
			.select({ id: establishments.id })
			.from(establishments)
			.where(eq(establishments.cnpj, invoice.issuer.cnpj))
			.limit(1);

		if (!found) {
			throw new Error("Falha ao upsert de estabelecimento");
		}

		return found.id;
	}

	private async findExistingReceipt(
		tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
		input: {
			url: string;
			accessKey?: string;
			establishmentId: number;
			number?: string;
			series?: string;
			emittedAt: Date | null;
		},
	) {
		if (input.accessKey) {
			const [byAccessKey] = await tx
				.select({ id: receipts.id })
				.from(receipts)
				.where(eq(receipts.accessKey, input.accessKey))
				.limit(1);
			if (byAccessKey) {
				return byAccessKey;
			}
		}

		const [bySourceUrl] = await tx
			.select({ id: receipts.id })
			.from(receipts)
			.where(eq(receipts.sourceUrl, input.url))
			.limit(1);
		if (bySourceUrl) {
			return bySourceUrl;
		}

		if (input.number && input.series && input.emittedAt) {
			const [fallback] = await tx
				.select({ id: receipts.id })
				.from(receipts)
				.where(
					and(
						eq(receipts.establishmentId, input.establishmentId),
						eq(receipts.number, input.number),
						eq(receipts.series, input.series),
						eq(receipts.emittedAt, input.emittedAt),
					),
				)
				.limit(1);
			if (fallback) {
				return fallback;
			}
		}

		return null;
	}

	private async findOrCreateGlobalProduct(
		tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
		input: {
			name: string;
			brand: string | null;
			category: string | null;
		},
	): Promise<{ id: number; needsEmbedding: boolean }> {
		const hash = this.buildProductHash(input.name, input.brand);
		const [existing] = await tx
			.select({ id: globalProducts.id, embedding: globalProducts.embedding })
			.from(globalProducts)
			.where(eq(globalProducts.nameBrandHash, hash))
			.limit(1);

		if (existing) {
			return {
				id: existing.id,
				needsEmbedding: !existing.embedding,
			};
		}

		const brandId = await this.upsertNameEntity(tx, brands, input.brand);
		const categoryId = await this.upsertNameEntity(tx, categories, input.category);

		const [created] = await tx
			.insert(globalProducts)
			.values({
				name: input.name,
				brandId,
				categoryId,
				nameBrandHash: hash,
			})
			.onConflictDoNothing({ target: globalProducts.nameBrandHash })
			.returning({ id: globalProducts.id, embedding: globalProducts.embedding });

		if (created) {
			return {
				id: created.id,
				needsEmbedding: true,
			};
		}

		const [concurrentCreated] = await tx
			.select({ id: globalProducts.id, embedding: globalProducts.embedding })
			.from(globalProducts)
			.where(eq(globalProducts.nameBrandHash, hash))
			.limit(1);

		if (!concurrentCreated) {
			throw new Error("Falha ao criar produto global");
		}

		return {
			id: concurrentCreated.id,
			needsEmbedding: !concurrentCreated.embedding,
		};
	}

	private async upsertNameEntity(
		tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
		table: typeof brands | typeof categories,
		name: string | null,
	): Promise<number | null> {
		if (!name || !name.trim()) {
			return null;
		}

		const normalized = name.trim();
		const [inserted] = await tx
			.insert(table)
			.values({ name: normalized })
			.onConflictDoNothing({ target: table.name })
			.returning({ id: table.id });

		if (inserted) {
			return inserted.id;
		}

		const [found] = await tx
			.select({ id: table.id })
			.from(table)
			.where(eq(table.name, normalized))
			.limit(1);

		return found?.id || null;
	}

	private async incrementMatchCounts(
		tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
		insertedItems: Array<{ globalProductId: number | null }>,
	) {
		const matchCounts = new Map<number, number>();

		for (const item of insertedItems) {
			if (!item.globalProductId) {
				continue;
			}

			const currentCount = matchCounts.get(item.globalProductId) || 0;
			matchCounts.set(item.globalProductId, currentCount + 1);
		}

		for (const [productId, incrementBy] of matchCounts.entries()) {
			await tx
				.update(globalProducts)
				.set({
					matchCount: sql`${globalProducts.matchCount} + ${incrementBy}`,
				})
				.where(eq(globalProducts.id, productId));
		}
	}

	private async findPendingEmbeddingsForReceipt(
		tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
		receiptId: number,
	): Promise<Array<{ productId: number; text: string }>> {
		const rows = await tx
			.select({
				productId: globalProducts.id,
				productName: globalProducts.name,
				brandName: brands.name,
			})
			.from(receiptItems)
			.innerJoin(globalProducts, eq(receiptItems.globalProductId, globalProducts.id))
			.leftJoin(brands, eq(globalProducts.brandId, brands.id))
			.where(
				and(
					eq(receiptItems.receiptId, receiptId),
					isNull(globalProducts.embedding),
				),
			);

		const pendingEmbeddingsByProduct = new Map<number, { productId: number; text: string }>();

		for (const row of rows) {
			if (!pendingEmbeddingsByProduct.has(row.productId)) {
				pendingEmbeddingsByProduct.set(row.productId, {
					productId: row.productId,
					text: `${row.productName} ${row.brandName || ""}`.trim(),
				});
			}
		}

		return Array.from(pendingEmbeddingsByProduct.values());
	}

	private async persistPendingEmbeddings(
		pendingEmbeddings: Array<{ productId: number; text: string }>,
	) {
		if (pendingEmbeddings.length === 0) {
			return;
		}

		const uniquePendingEmbeddings = Array.from(
			new Map(
				pendingEmbeddings.map((embedding) => [embedding.productId, embedding]),
			).values(),
		);

		try {
			const vectors = await embeddingService.embedTexts(
				uniquePendingEmbeddings.map((embedding) => embedding.text),
			);

			for (const [index, vector] of vectors.entries()) {
				if (!vector) {
					continue;
				}

				await db
					.update(globalProducts)
					.set({ embedding: vector })
					.where(eq(globalProducts.id, uniquePendingEmbeddings[index].productId));
			}
		} catch (error) {
			const isRetryable = this.isRetryableEmbeddingError(error);
			logger.warn(
				{ error, items: uniquePendingEmbeddings.length, isRetryable },
				"Falha ao gerar embeddings externos em lote; produtos salvos sem vetor",
			);
		}
	}

	private isRetryableEmbeddingError(error: unknown): boolean {
		if (!(error instanceof Error)) {
			return false;
		}

		return (
			error.message.includes("HTTP 429") ||
			error.message.includes("HTTP 502") ||
			error.message.includes("HTTP 503") ||
			error.message.includes("HTTP 504") ||
			error.name === "AbortError" ||
			error.message.toLowerCase().includes("fetch")
		);
	}

	private buildProductHash(name: string, brand: string | null): string {
		const normalizedName = this.normalizeText(name);
		const normalizedBrand = this.normalizeText(brand || "unknown");
		return createHash("sha256")
			.update(`${normalizedName}|${normalizedBrand}`)
			.digest("hex");
	}

	private normalizeText(value: string): string {
		return value
			.toLowerCase()
			.normalize("NFD")
			.replace(/[^\p{L}\p{N}\s]/gu, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	private parseDate(value?: string): Date | null {
		if (!value) {
			return null;
		}
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	private toNumericString(value: number | null | undefined): string | null {
		if (typeof value !== "number" || !Number.isFinite(value)) {
			return null;
		}

		return String(value);
	}
}

export const invoiceRepository = new InvoiceRepository();
