import { beforeEach, describe, expect, it, vi } from "vitest";

const { repositoryMock, embeddingServiceMock, loggerMock } = vi.hoisted(() => ({
	repositoryMock: {
		list: vi.fn(),
		searchByText: vi.fn(),
		searchBySemantic: vi.fn(),
		getInvoiceItemsByProductId: vi.fn(),
	},
	embeddingServiceMock: {
		embedText: vi.fn(),
	},
	loggerMock: {
		warn: vi.fn(),
	},
}));

vi.mock("@/modules/product/product.repository", () => ({
	productRepository: repositoryMock,
}));

vi.mock("@/modules/embedding/embedding.service", () => ({
	embeddingService: embeddingServiceMock,
}));

vi.mock("@/infra/observability/logger.config", () => ({
	logger: loggerMock,
}));

import { productService } from "@/modules/product/product.service";

describe("ProductService.search", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		repositoryMock.list.mockResolvedValue([]);
		repositoryMock.searchByText.mockResolvedValue([]);
		repositoryMock.searchBySemantic.mockResolvedValue([]);
		repositoryMock.getInvoiceItemsByProductId.mockResolvedValue([]);
		embeddingServiceMock.embedText.mockResolvedValue([0.1, 0.2, 0.3]);
	});

	it("lists products with pagination and hasMore", async () => {
		repositoryMock.getInvoiceItemsByProductId.mockResolvedValue([
			{
				receiptId: 100,
				establishmentName: "Mercado Centro",
				rawDescription: "LEITE INTEGRAL 1L",
				unitPrice: 6.99,
				emittedAt: new Date("2026-04-06T10:00:00.000Z"),
			},
		]);

		repositoryMock.list.mockResolvedValue([
			{
				id: 1,
				externalId: "ext-1",
				name: "Leite Integral",
				brand: "Marca A",
				category: "Laticinios",
				matchCount: 12,
			},
			{
				id: 2,
				externalId: "ext-2",
				name: "Leite Desnatado",
				brand: "Marca B",
				category: "Laticinios",
				matchCount: 9,
			},
			{
				id: 3,
				externalId: "ext-3",
				name: "Leite Zero Lactose",
				brand: "Marca C",
				category: "Laticinios",
				matchCount: 7,
			},
		]);

		const result = await productService.list({
			limit: 2,
			offset: 0,
		});

		expect(repositoryMock.list).toHaveBeenCalledWith({
			limit: 3,
			offset: 0,
		});
		expect(result.items).toHaveLength(2);
		expect(result.items[0]).toMatchObject({
			id: 1,
			score: 0,
			semanticScore: 0,
			textScore: 0,
		});
		expect(result.items[0]?.invoices).toHaveLength(1);
		expect(repositoryMock.getInvoiceItemsByProductId).toHaveBeenCalledTimes(2);
		expect(repositoryMock.getInvoiceItemsByProductId).toHaveBeenNthCalledWith(1, 1);
		expect(repositoryMock.getInvoiceItemsByProductId).toHaveBeenNthCalledWith(2, 2);
		expect(result.pagination.hasMore).toBe(true);
	});

	it("lists products without hasMore when returned rows fit limit", async () => {
		repositoryMock.list.mockResolvedValue([
			{
				id: 10,
				externalId: "ext-10",
				name: "Arroz",
				brand: "Marca X",
				category: "Mercearia",
				matchCount: 15,
			},
		]);

		const result = await productService.list({
			limit: 5,
			offset: 5,
		});

		expect(repositoryMock.list).toHaveBeenCalledWith({
			limit: 6,
			offset: 5,
		});
		expect(result.items).toHaveLength(1);
		expect(result.items[0]).toMatchObject({
			id: 10,
			score: 0,
			semanticScore: 0,
			textScore: 0,
		});
		expect(result.items[0]?.invoices).toEqual([]);
		expect(repositoryMock.getInvoiceItemsByProductId).toHaveBeenCalledWith(10);
		expect(result.pagination.hasMore).toBe(false);
	});

	it("filters out products below minimum final score", async () => {
		repositoryMock.searchByText.mockResolvedValue([
			{
				id: 1,
				externalId: "ext-1",
				name: "Leite Integral",
				brand: "Marca Boa",
				category: "Laticinios",
				matchCount: 10,
				textScore: 0.5,
			},
			{
				id: 2,
				externalId: "ext-2",
				name: "Produto Irrelevante",
				brand: "Outra Marca",
				category: "Diversos",
				matchCount: 10,
				textScore: 0.2,
			},
		]);

		const result = await productService.search({
			q: "leite",
			limit: 10,
			offset: 0,
		});

		expect(repositoryMock.searchByText).toHaveBeenCalledWith({
			query: "leite",
			limit: 30,
		});
		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.id).toBe(1);
		expect(result.pagination.hasMore).toBe(false);
	});

	it("calculates hasMore using filtered items", async () => {
		repositoryMock.searchByText.mockResolvedValue([
			{
				id: 1,
				externalId: "ext-1",
				name: "Leite Integral",
				brand: "Marca A",
				category: "Laticinios",
				matchCount: 10,
				textScore: 0.6,
			},
			{
				id: 2,
				externalId: "ext-2",
				name: "Leite Desnatado",
				brand: "Marca B",
				category: "Laticinios",
				matchCount: 10,
				textScore: 0.5,
			},
			{
				id: 3,
				externalId: "ext-3",
				name: "Parafuso",
				brand: "Marca C",
				category: "Ferragens",
				matchCount: 10,
				textScore: 0.2,
			},
		]);

		const result = await productService.search({
			q: "leite",
			limit: 1,
			offset: 0,
		});

		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.id).toBe(1);
		expect(result.pagination.hasMore).toBe(true);
		expect(repositoryMock.getInvoiceItemsByProductId).toHaveBeenCalledTimes(1);
		expect(repositoryMock.getInvoiceItemsByProductId).toHaveBeenCalledWith(1);
	});

	it("falls back to text search when embedding generation fails", async () => {
		embeddingServiceMock.embedText.mockRejectedValue(new Error("embedding unavailable"));
		repositoryMock.searchByText.mockResolvedValue([
			{
				id: 1,
				externalId: "ext-1",
				name: "Leite",
				brand: null,
				category: "Laticinios",
				matchCount: 5,
				textScore: 0.8,
			},
		]);

		const result = await productService.search({
			q: "leite",
			limit: 10,
			offset: 0,
		});

		expect(result.items).toHaveLength(1);
		expect(repositoryMock.searchBySemantic).not.toHaveBeenCalled();
		expect(loggerMock.warn).toHaveBeenCalledTimes(1);
	});
});
