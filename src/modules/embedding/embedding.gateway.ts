import { env } from "@/config/env.config";
import { HttpClient } from "@/infra/http/http.client";
import type { IEmbeddingGateway } from "./embedding.interface";
import type { EmbeddingApiRequest, EmbeddingApiResponse } from "./embedding.types";

class EmbeddingGateway implements IEmbeddingGateway {
	constructor(private readonly http: HttpClient = new HttpClient(10000, 2)) {}

	async embedTexts(texts: string[]): Promise<Array<number[] | null>> {
		if (!env.EMBEDDING_API_URL) {
			return texts.map(() => null);
		}

		if (texts.length === 0) {
			return [];
		}

		const payload: EmbeddingApiRequest = {
			input: texts.length === 1 ? texts[0] : texts,
		};

		const embeddingKey = env.EMBEDDING_KEY?.trim();
		const headers = embeddingKey
			? { Authorization: embeddingKey }
			: undefined;

		const response = await this.http.post<EmbeddingApiResponse>(
			env.EMBEDDING_API_URL,
			payload,
			{ headers },
		);
		const results = response.data?.results || [];

		return texts.map((_, index) => {
			const vector = results[index]?.vector;
			return Array.isArray(vector) ? vector : null;
		});
	}

	async embedText(text: string): Promise<number[] | null> {
		const [vector] = await this.embedTexts([text]);
		return vector || null;
	}
}

export const embeddingGateway = new EmbeddingGateway();
