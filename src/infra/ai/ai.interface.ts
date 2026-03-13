export interface IAiResponse<T> {
	data: T;
	usage: {
		promptTokens: number;
		completionTokens: number;
	};
}

export interface IAiProvider {
	generateJson<T>(prompt: string): Promise<IAiResponse<T>>;
}
