export interface EmailPayload {
	to: string;
	subject: string;
	body: string;
	cc?: string[];
	bcc?: string[];
	replyTo?: string;
}

export interface IEmailProvider {
	send(payload: EmailPayload): Promise<void>;
}
