import nodemailer from "nodemailer";
import { IEmailProvider, EmailPayload } from "../email.interface";
import { env } from "@/config/env.config";

export class SmtpProvider implements IEmailProvider {
	private transporter: nodemailer.Transporter;

	constructor() {
		if (
			!env.SMTP_HOST ||
			!env.SMTP_PORT ||
			!env.SMTP_USER ||
			!env.SMTP_PASS
		) {
			throw new Error("SMTP configuration is incomplete");
		}

		this.transporter = nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			auth: {
				user: env.SMTP_USER,
				pass: env.SMTP_PASS,
			},
		});
	}

	async send(payload: EmailPayload): Promise<void> {
		await this.transporter.sendMail({
			from: env.EMAIL_FROM_NAME,
			to: payload.to,
			subject: payload.subject,
			html: payload.body,
			cc: payload.cc,
			bcc: payload.bcc,
			replyTo: payload.replyTo,
		});
	}
}
