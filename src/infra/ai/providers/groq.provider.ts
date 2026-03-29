import OpenAI from "openai";
import { env } from "../../../config/env.config";
import { IAiProvider, IAiResponse } from "../ai.interface";

export class GroqProvider implements IAiProvider {
	private client: OpenAI;

	constructor() {
		this.client = new OpenAI({
			apiKey: env.GROQ_API_KEY,
			baseURL: "https://api.groq.com/openai/v1",
		});
	}

	async generateJson<T>(prompt: string): Promise<IAiResponse<T>> {
		const res = await this.client.chat.completions.create({
			model: "llama-3.3-70b-versatile",
			messages: [
				{
					role: "user",
					content: prompt,
				},
			],
			temperature: 0,
			response_format: { type: "json_object" },
		});

		const content = res.choices[0].message.content || "{}";

		return {
			data: JSON.parse(content) as T,
			usage: {
				promptTokens: res.usage?.prompt_tokens || 0,
				completionTokens: res.usage?.completion_tokens || 0,
			},
		};
	}
}
