import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { FastifyAdapter } from "@bull-board/fastify";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { QueueFactory } from "./queue.factory";
import {
	INVOICE_PARSE_QUEUE,
	INVOICE_PROCESS_QUEUE,
	MAIN_QUEUE,
} from "@/const/queue";

const bullboardFastifyAdapter = new FastifyAdapter();
bullboardFastifyAdapter.setBasePath("/bull-board");

const mainQueue = QueueFactory.getQueue(MAIN_QUEUE);
const mainQueueAdapter = new BullMQAdapter(mainQueue);
const invoiceParseQueueAdapter = new BullMQAdapter(
	QueueFactory.getQueue(INVOICE_PARSE_QUEUE),
);
const invoiceProcessQueueAdapter = new BullMQAdapter(
	QueueFactory.getQueue(INVOICE_PROCESS_QUEUE),
);

createBullBoard({
	queues: [
		mainQueueAdapter,
		invoiceParseQueueAdapter,
		invoiceProcessQueueAdapter,
	],
	serverAdapter: bullboardFastifyAdapter,
});

export default fp(async (app: FastifyInstance) => {
	await app.register(bullboardFastifyAdapter.registerPlugin(), {
		prefix: "/bull-board",
	});
});
