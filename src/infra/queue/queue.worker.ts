import { QueueFactory } from "./queue.factory";
import { emailProvider } from "../email/email.factory";
import { Job } from "bullmq";
import { QueueJobType } from "./queue.types";
import { MAIN_QUEUE } from "@/const/queue";

const jobHandlers: Record<string, (payload: any, job: Job) => Promise<void>> = {
	[QueueJobType.EMAIL]: async (payload) => {
		await emailProvider.send(payload);
	},
};

QueueFactory.registerWorker(MAIN_QUEUE, async (payload, job: Job) => {
	const handler = jobHandlers[job.name];
	if (!handler) throw new Error(`Tipo de job desconhecido: ${job.name}`);
	await handler(payload, job);
});