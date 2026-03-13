import type { FastifyReply, FastifyRequest } from "fastify";
import type { IInvoiceController, IInvoiceService } from "./invoice.interface";

import type { InvoiceParseRequest } from "./invoice.types";
import { response } from "@/shared/http/response";
import { invoiceService } from "./invoice.service";

class InvoiceController {
	constructor(private readonly service: IInvoiceService) {}

	async parse(
		request: FastifyRequest<{ Body: InvoiceParseRequest }>,
		reply: FastifyReply,
	) {
		const { url } = request.body;

		const result = await this.service.parse(url);

		return reply
			.status(200)
			.send(response(result, "Nota fiscal parseada com sucesso"));
	}
}

export const invoiceController = new InvoiceController(invoiceService);
