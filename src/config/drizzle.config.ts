import type { Config } from "drizzle-kit";
import { env } from "./env.config";

const drizzle: Config = {
	schema: "./src/modules/**/*.schema.ts",
	out: "./drizzle/migrations",
	dialect: "mysql",
	dbCredentials: {
		host: env.DB_HOST,
		port: env.DB_PORT,
		user: env.DB_USER,
		password: env.DB_PASS,
		database: env.DB_NAME,
	},
	migrations: {
		table: "migrations",
	},
	verbose: true
};

export default drizzle;