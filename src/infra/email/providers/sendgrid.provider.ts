import sgMail, { ResponseError } from "@sendgrid/mail";
import { IEmailProvider, EmailPayload } from "../email.interface";
import { env } from "@/config/env.config";
import { logger } from "@/infra/observability/logger.config";

export class SendgridProvider implements IEmailProvider {
	constructor() {
		if (!env.SENDGRID_API_KEY) {
			throw new Error("SENDGRID_API_KEY is required");
		}
		sgMail.setApiKey(env.SENDGRID_API_KEY);
	}

	async send(payload: EmailPayload): Promise<void> {
		if (!payload.body || !payload.to || !payload.subject) {
			throw new Error(
				"Email payload incomplete: to, subject and html are required",
			);
		}

		try {
			await sgMail.send({
				to: payload.to,
				from: env.EMAIL_FROM_NAME,
				subject: payload.subject,
				html: payload.body,
				cc: payload.cc,
				bcc: payload.bcc,
				replyTo: payload.replyTo,
			});
		} catch (error: ResponseError | any) {
			if (error.response && error.response.body) {
				logger.error(JSON.stringify(error.response.body, null, 2));
			} else {
				logger.error("Erro desconhecido:", error);
			}
		}
	}
}
