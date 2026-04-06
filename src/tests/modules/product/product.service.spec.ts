import { beforeEach, describe, expect, it, vi } from "vitest";

const { repositoryMock, embeddingServiceMock, loggerMock } = vi.hoisted(() => ({
	repositoryMock: {
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
		repositoryMock.searchByText.mockResolvedValue([]);
		repositoryMock.searchBySemantic.mockResolvedValue([]);
		repositoryMock.getInvoiceItemsByProductId.mockResolvedValue([]);
		embeddingServiceMock.embedText.mockResolvedValue([0.1, 0.2, 0.3]);
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
			brand: undefined,
			category: undefined,
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
