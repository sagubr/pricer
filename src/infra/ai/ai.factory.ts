import { env } from "@/config/env.config";
import { GeminiProvider } from "./providers/gemini.provider";
import { IAiProvider } from "./ai.interface";
import { GroqProvider } from "./providers/groq.provider";

const providers = {
	gemini: GeminiProvider,
	groq: GroqProvider,
};

function createAiProvider(): IAiProvider {
	const Provider = providers[env.IA_PROVIDER];

	if (!Provider) {
		throw new Error(`Invalid AI provider: ${env.IA_PROVIDER}`);
	}

	return new Provider();
}

export const aiProvider = createAiProvider();
