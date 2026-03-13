import { initSentry } from "@/infra/observability/sentry";
import { buildApp } from "./app";
import { env } from "@/config/env.config";

initSentry(env.SERVICE_NAME || "api-server");

const start = async () => {
	try {
		const app = await buildApp();
		await app.listen({ port: Number(env.PORT) || 3000, host: "0.0.0.0" });
		console.log(`Server running on port ${env.PORT || 3000}`);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
};

start();
