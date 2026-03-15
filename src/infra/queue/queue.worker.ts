import { QueueFactory } from "./queue.factory";
import { emailProvider } from "../email/email.factory";
import { Job } from "bullmq";
import { QueueJobType } from "./queue.types";
import {
	INVOICE_PARSE_QUEUE,
	INVOICE_PROCESS_QUEUE,
	MAIN_QUEUE,
} from "@/const/queue";
import { invoiceService } from "@/modules/invoice/invoice.service";

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

QueueFactory.registerWorker(INVOICE_PARSE_QUEUE, async (payload, job: Job) => {
	if (job.name !== QueueJobType.INVOICE_PARSE) {
		throw new Error(`Tipo de job desconhecido: ${job.name}`);
	}

	await invoiceService.handleParseJob(payload);
});

QueueFactory.registerWorker(INVOICE_PROCESS_QUEUE, async (payload, job: Job) => {
	if (job.name !== QueueJobType.INVOICE_PROCESS) {
		throw new Error(`Tipo de job desconhecido: ${job.name}`);
	}

	await invoiceService.handleProcessJob(payload);
});