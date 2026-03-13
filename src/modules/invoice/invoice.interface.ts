import type { InvoiceProcessingResponse } from "./invoice.types";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { InvoiceParseRequest } from "./invoice.types";

export interface IInvoiceService {
	parse(url: string): Promise<InvoiceProcessingResponse>;
}

export interface IInvoiceController {
	parse(
		request: FastifyRequest<{ Body: InvoiceParseRequest }>,
		reply: FastifyReply,
	): Promise<FastifyReply>;
}
