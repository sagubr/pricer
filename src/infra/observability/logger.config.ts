import pino, { LoggerOptions } from "pino";
import path from "path";
import fs from "fs";
import { env } from "@/config/env.config";

//TODO: Precisamos colocar rotação de log na config do servidor, para rodar logs com mais de 7 dias, senão, os logs vão crescer infinitamente

const rootDir = process.cwd();
const logDir = path.join(rootDir, "logs");

if (!fs.existsSync(logDir)) {
	fs.mkdirSync(logDir, { recursive: true });
}

const logFilePath = path.join(logDir, "app.log");

const transportsByEnv: Record<string, LoggerOptions["transport"]> = {
	development: {
		targets: [
			{
				target: "pino-pretty",
				options: {
					colorize: true,
					translateTime: "SYS:standard",
					ignore: "pid,hostname",
				},
			},
			{
				target: "pino/file",
				options: {
					destination: logFilePath,
				},
			},
		],
	},
	production: {
		targets: [
			{
				target: "pino/file",
				options: {
					destination: logFilePath,
				},
			},
		],
	},
};

const loggerSettings: LoggerOptions = {
	level: env.LOG_LEVEL || "info",
	base: {
		service: env.SERVICE_NAME || "app",
		env: env.NODE_ENV,
	},
	transport: transportsByEnv[env.NODE_ENV] ?? transportsByEnv.production,
};

export const logger = pino(loggerSettings);
