import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/config/env.config";

export const pool = new Pool({
	connectionString: env.DATABASE_URL,
	ssl:
		env.DB_SSL ?
			{ rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED }
		:	undefined,
	max: env.DB_CONNECTION_LIMIT,
	idleTimeoutMillis: env.DB_TIMEOUT,
});

process.on("SIGINT", async () => {
	console.log("Closing database connections...");
	await pool.end();
	process.exit(0);
});

export const db = drizzle(pool);
