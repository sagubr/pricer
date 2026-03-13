import { MAIN_QUEUE } from "@/const/queue";
import { QueueFactory } from "@/infra/queue/queue.factory";
import { QueueJobType } from "@/infra/queue/queue.types";
import { NotificationLimitExceeded } from "./errors/notification.error";
import { CreateNotificationInput } from "./notification.types";
import type { INotificationService } from "./notification.interface";

class NotificationService implements INotificationService {
	async sendTestEmailSuccess(
		payload: CreateNotificationInput,
	): Promise<void> {
		QueueFactory.getQueue(MAIN_QUEUE).add(QueueJobType.EMAIL, payload, {
			attempts: 3,
			backoff: { type: "exponential", delay: 2000 },
		});
	}

	async sendTestEmailError(): Promise<never> {
		throw new NotificationLimitExceeded();
	}
}

export const notificationService = new NotificationService();
