import type { Config } from "drizzle-kit";
import { env } from "./env.config";

if (!env.DATABASE_URL) {
	throw new Error("DATABASE_URL e obrigatoria para o drizzle-kit.");
}

const databaseUrl = new URL(env.DATABASE_URL);

if (!databaseUrl.searchParams.has("sslmode")) {
	databaseUrl.searchParams.set("sslmode", env.DB_SSL ? "require" : "disable");
}

const drizzle: Config = {
	schema: "./src/modules/**/*.schema.ts",
	out: "./drizzle/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: databaseUrl.toString(),
	},
	migrations: {
		table: "migrations",
	},
	verbose: true,
};

export default drizzle;
