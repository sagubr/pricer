export interface EmbeddingApiRequest {
	input: string | string[];
}

export interface EmbeddingApiResponse {
	success?: boolean;
	data?: {
		results?: Array<{
			details?: {
				index?: number;
				input?: string;
				model?: string;
				dimension?: number;
				cached?: boolean;
			};
			vector?: number[];
		}>;
		count?: number;
	};
}
