export interface IEmbeddingGateway {
	embedTexts(texts: string[]): Promise<Array<number[] | null>>;
	embedText(text: string): Promise<number[] | null>;
}

export interface IEmbeddingService {
	embedText(text: string): Promise<number[] | null>;
	embedTexts(texts: string[]): Promise<Array<number[] | null>>;
}
