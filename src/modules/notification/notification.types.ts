import { z } from "zod";

export const createNotificationSchema = z.object({
	to: z.email(),
	subject: z.string(),
	body: z.string(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
