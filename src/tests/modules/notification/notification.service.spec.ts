import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueueFactory } from "@/infra/queue/queue.factory";
import { QueueJobType } from "@/infra/queue/queue.types";
import { MAIN_QUEUE } from "@/const/queue";
import { notificationService } from "@/modules/notification/notification.service";

vi.mock("@/infra/queue/queue.factory", () => ({
	QueueFactory: {
		getQueue: vi.fn(),
	},
}));

describe("NotificationService", () => {
	const mockAdd = vi.fn();

	const service = notificationService;

	beforeEach(() => {
		vi.clearAllMocks();
		(QueueFactory.getQueue as any).mockReturnValue({
			add: mockAdd,
		});
	});

	it("should send email successfully", async () => {
		mockAdd.mockResolvedValueOnce(undefined);

		await service.sendTestEmailSuccess({
			to: "user@example.com",
			subject: "Test",
			body: "Hello",
		});

		expect(QueueFactory.getQueue).toHaveBeenCalledWith(MAIN_QUEUE);
		expect(mockAdd).toHaveBeenCalledWith(
			QueueJobType.EMAIL,
			{
				to: "user@example.com",
				subject: "Test",
				body: "Hello",
			},
			{
				attempts: 3,
				backoff: { type: "exponential", delay: 2000 },
			},
		);
	});

	it("should throw NotificationLimitExceeded error", async () => {
		await expect(service.sendTestEmailError()).rejects.toThrow(
			"Notification limit exceeded",
		);
	});
});
