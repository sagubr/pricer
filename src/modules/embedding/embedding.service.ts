import { env } from "@/config/env.config";
import type { IEmbeddingGateway, IEmbeddingService } from "./embedding.interface";
import { embeddingGateway } from "./embedding.gateway";

class EmbeddingService implements IEmbeddingService {
	private readonly batchSize = 20;

	constructor(private readonly gateway: IEmbeddingGateway = embeddingGateway) {}

	async embedText(text: string): Promise<number[] | null> {
		if (!text.trim()) {
			return null;
		}

		const vector = await this.gateway.embedText(text);
		if (!Array.isArray(vector)) {
			return null;
		}

		if (vector.length !== env.EMBEDDING_DIMENSIONS) {
			return null;
		}

		return vector;
	}

	async embedTexts(texts: string[]): Promise<Array<number[] | null>> {
		if (texts.length === 0) {
			return [];
		}

		if (texts.length === 1) {
			const single = await this.embedText(texts[0]);
			return [single];
		}

		const sanitizedTexts = texts.map((text) => text.trim());
		const vectors: Array<number[] | null> = sanitizedTexts.map(() => null);

		for (let start = 0; start < sanitizedTexts.length; start += this.batchSize) {
			const chunk = sanitizedTexts.slice(start, start + this.batchSize);
			const chunkVectors = await this.gateway.embedTexts(chunk);

			for (const [index, vector] of chunkVectors.entries()) {
				const absoluteIndex = start + index;
				if (!Array.isArray(vector)) {
					vectors[absoluteIndex] = null;
					continue;
				}

				if (vector.length !== env.EMBEDDING_DIMENSIONS) {
					vectors[absoluteIndex] = null;
					continue;
				}

				vectors[absoluteIndex] = vector;
			}
		}

		return vectors;
	}
}

export const embeddingService = new EmbeddingService();
