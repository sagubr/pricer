import { env } from "@/config/env.config";
import { GeminiProvider } from "./providers/gemini.provider";
import { IAiProvider } from "./ai.interface";

const providers = {
	gemini: GeminiProvider,
};

function createAiProvider(): IAiProvider {
	const providerKey = "gemini";
	const Provider = providers[providerKey as keyof typeof providers];

	if (!Provider) {
		throw new Error(`Invalid AI provider: ${providerKey}`);
	}

	return new Provider();
}

export const aiProvider = createAiProvider();
