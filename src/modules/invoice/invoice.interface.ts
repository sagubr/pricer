import type { FastifyReply, FastifyRequest } from "fastify";
import type {
	EnqueueInvoiceResponse,
	InvoiceJobStatusParams,
	InvoiceJobStatusResponse,
	InvoiceParseRequest,
} from "./invoice.types";

export interface IInvoiceService {
	enqueueParse(url: string): Promise<EnqueueInvoiceResponse>;
	getJobStatus(jobId: string): Promise<InvoiceJobStatusResponse>;
}

export interface IInvoiceController {
	parse(
		request: FastifyRequest<{ Body: InvoiceParseRequest }>,
		reply: FastifyReply,
	): Promise<FastifyReply>;
	getStatus(
		request: FastifyRequest<{ Params: InvoiceJobStatusParams }>,
		reply: FastifyReply,
	): Promise<FastifyReply>;
}
