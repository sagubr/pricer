import { describe, it, vi, expect } from "vitest";

vi.mock("@/modules/notification/notification.service", () => {
	return {
		notificationService: {
			sendTestEmailSuccess: vi.fn().mockResolvedValue(undefined),
			sendTestEmailError: vi.fn().mockResolvedValue(undefined),
		},
	};
});

async function createApp() {
	const { buildApp } = await import("@/app");
	const app = await buildApp();
	await app.ready();
	return app;
}

describe("NotificationController Integration", () => {
	it("should return 200 on valid payload", async () => {
		const app = await createApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/notifications/send-success",
			payload: {
				to: "user@example.com",
				subject: "Test",
				body: "Hello",
			},
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({
			success: true,
			message: "Notification scheduled",
		});

		await app.close();
	});
});
