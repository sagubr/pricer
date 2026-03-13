import { Queue, Worker, Job } from "bullmq";
import { logger } from "../observability/logger.config";
import { redis as connection } from "@/config/redis.config";
import { queueSettings } from "./queue.config";

export type QueueProcessor = (payload: any, job: Job) => Promise<void>;

export class QueueFactory {
	private static queues: Map<string, Queue> = new Map();
	private static workers: Map<string, Worker> = new Map();

	static getQueue(queueName: string): Queue {
		if (!this.queues.has(queueName)) {
			this.queues.set(
				queueName,
				new Queue(queueName, { connection, ...queueSettings }),
			);
		}
		return this.queues.get(queueName)!;
	}

	static registerWorker(queueName: string, processor: QueueProcessor) {
		if (this.workers.has(queueName)) return this.workers.get(queueName)!;
		const worker = new Worker(
			queueName,
			async (job) => {
				try {
					await processor(job.data, job);
				} catch (err) {
					logger.error(
						{ err, jobId: job.id },
						`Worker failed for queue ${queueName}`,
					);
					throw err;
				}
			},
			{ connection },
		);
		this.workers.set(queueName, worker);
		return worker;
	}
}