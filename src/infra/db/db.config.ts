import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { env } from "@/config/env.config";

export const pool = createPool({
	host: env.DB_HOST,
	port: env.DB_PORT,
	user: env.DB_USER,
	password: env.DB_PASS,
	database: env.DB_NAME,
	waitForConnections: true,
	connectionLimit: env.DB_CONNECTION_LIMIT,
	queueLimit: 0,
	idleTimeout: env.DB_TIMEOUT,
});

process.on("SIGINT", async () => {
	console.log("Closing database connections...");
	await pool.end();
	process.exit(0);
});

export const db = drizzle(pool);
