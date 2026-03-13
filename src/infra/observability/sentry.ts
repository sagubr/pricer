import { env } from "@/config/env.config";
import * as Sentry from "@sentry/node";

export function initSentry(serviceName: string) {
	if (!env.SENTRY_DSN) return;

	Sentry.init({
		dsn: env.SENTRY_DSN,
		environment: env.NODE_ENV,
		tracesSampleRate: 1.0,
		initialScope: {
			tags: {
				service: serviceName,
			},
		},
	});
}

export { Sentry };
