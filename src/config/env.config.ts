import dotenv from "dotenv";
import { z } from "zod";

const envFile = `.env.${process.env.NODE_ENV || "development"}`;

dotenv.config({ path: envFile });

const envSchema = z.object({
	PORT: z.coerce.number().default(3000),
	NODE_ENV: z
		.enum(["development", "production", "staging"])
		.default("development"),
	SERVICE_NAME: z.string().default('pricer-api'),
	LOG_LEVEL: z.string().default("info"),
	CACHE_PROVIDER: z.enum(["redis", "node-cache"]).default("node-cache"),
	CACHE_ADMIN_TOKEN: z.string().min(32, "CACHE_ADMIN_TOKEN deve ter pelo menos 32 caracteres"),
	DATABASE_URL: z.url("DATABASE_URL deve ser uma URL válida").optional(),
	DB_SSL: z.coerce.boolean().default(false),
	DB_SSL_REJECT_UNAUTHORIZED: z.coerce.boolean().default(false),
	DB_CONNECTION_LIMIT: z.coerce.number().default(20),
	DB_TIMEOUT: z.coerce.number().default(60000),
	EMBEDDING_API_URL: z.url("EMBEDDING_API_URL deve ser uma URL válida").optional(),
	EMBEDDING_KEY: z.string().optional(),
	EMBEDDING_DIMENSIONS: z.coerce.number().default(384),
	REDIS_HOST: z.string().default("localhost"),
	REDIS_PORT: z.coerce.number().default(6379),
	REDIS_DB: z.coerce.number().default(0),
	QUEUE_PREFIX: z.string().optional(),
	RATE_LIMIT_MAX: z.coerce.number().default(100),
	RATE_LIMIT_TIME_WINDOW: z.string().default("1 minute"),
	JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
	JWT_EXPIRES_IN: z.enum(["15m", "30m", "1h", "6h", "12h", "1d", "7d"]).default("1h"),
	EMAIL_PROVIDER: z.enum(["sendgrid", "smtp"]).default("sendgrid"),
	SENDGRID_API_KEY: z.string().optional(),
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: z.coerce.number().optional(),
	SMTP_USER: z.string().optional(),
	SMTP_PASS: z.string().optional(),
	EMAIL_FROM_NAME: z.string().min(1, "EMAIL_FROM_NAME é obrigatório"),
	EMAIL_FROM_ADDRESS: z.email("EMAIL_FROM_ADDRESS deve ser um email válido"),
	EMAIL_MAX_ATTEMPTS: z.coerce.number().default(3),
	EMAIL_BATCH_SIZE: z.coerce.number().default(10),
	SENTRY_DSN: z.url("SENTRY_DSN deve ser uma URL válida").optional(),
	IA_PROVIDER: z.enum(["gemini", "groq"]).default("gemini"),
	GEMINI_API_KEY: z.string().optional(),
	GROQ_API_KEY: z.string().optional(),
	URL: z.url("URL deve ser uma URL válida").optional(),
});

export const env = envSchema.parse(process.env);
