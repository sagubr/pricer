import { env } from "@/config/env.config";
import { SendgridProvider } from "./providers/sendgrid.provider";
import { SmtpProvider } from "./providers/smtp.provider";
import { IEmailProvider } from "./email.interface";

const providers = {
	sendgrid: SendgridProvider,
	smtp: SmtpProvider,
};

function createEmailProvider(): IEmailProvider {
	const Provider = providers[env.EMAIL_PROVIDER];

	if (!Provider) {
		throw new Error(`Invalid email provider: ${env.EMAIL_PROVIDER}`);
	}

	return new Provider();
}

export const emailProvider = createEmailProvider();
