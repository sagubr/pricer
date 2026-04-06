import type { FastifyReply, FastifyRequest } from "fastify";
import type { IInvoiceService } from "./invoice.interface";
import { response } from "@/shared/http/response";
import { invoiceService } from "./invoice.service";
import type {
	InvoiceJobStatusParams,
	InvoiceParseRequest,
	ReprocessInvoicesRequest,
} from "./invoice.types";

class InvoiceController {
	constructor(private readonly service: IInvoiceService) {}

	async parse(
		request: FastifyRequest<{ Body: InvoiceParseRequest }>,
		reply: FastifyReply,
	) {
		const { url } = request.body;

		const result = await this.service.enqueueParse(url);
		const message = Array.isArray(url)
			? "Notas fiscais enviadas para processamento"
			: "Nota fiscal enviada para processamento";

		return reply
			.status(202)
			.send(response(result, message));
	}

	async reprocess(
		request: FastifyRequest<{ Body: ReprocessInvoicesRequest }>,
		reply: FastifyReply,
	) {
		const { url } = request.body;
		const result = await this.service.reprocessSaved(url);

		return reply
			.status(202)
			.send(response(result, "Notas fiscais reenfileiradas para reprocessamento"));
	}

	async getStatus(
		request: FastifyRequest<{ Params: InvoiceJobStatusParams }>,
		reply: FastifyReply,
	) {
		const { jobId } = request.params;
		const result = await this.service.getJobStatus(jobId);

		return reply
			.status(200)
			.send(response(result, "Status do processamento obtido com sucesso"));
	}
}

export const invoiceController = new InvoiceController(invoiceService);
