import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { env } from "../../../config/env.config";
import { IAiProvider, IAiResponse } from "../ai.interface";

export class GeminiProvider implements IAiProvider {
	private model: GenerativeModel;

	constructor() {
		const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || "");
		this.model = genAI.getGenerativeModel({
			model: "gemini-2.5-flash-lite",
			generationConfig: { responseMimeType: "application/json" },
		});
	}

	async generateJson<T>(prompt: string): Promise<IAiResponse<T>> {
		const result = await this.model.generateContent(prompt);
		const response = result.response;

		return {
			data: JSON.parse(response.text()) as T,
			usage: {
				promptTokens:
					result.response.usageMetadata?.promptTokenCount || 0,
				completionTokens:
					result.response.usageMetadata?.candidatesTokenCount || 0,
			},
		};
	}
}
