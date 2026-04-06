import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { invoiceController as controller } from "./invoice.controller";
import {
	InvoiceJobStatusParams,
	InvoiceParseRequest,
	invoiceJobStatusParamsSchema,
	parseInvoiceSchema,
	reprocessInvoicesSchema,
	type ReprocessInvoicesRequest,
} from "./invoice.types";

export default async function invoiceRouter(fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	app.post<{ Body: InvoiceParseRequest }>(
		"/parse",
		{
			schema: {
				body: parseInvoiceSchema,
				tags: ["Invoices"],
				description:
					"Extrai informações de uma NFCe a partir da URL do QRCode",
			},
		},
		(request, reply) => controller.parse(request, reply),
	);

	app.post<{ Body: ReprocessInvoicesRequest }>(
		"/reprocess",
		{
			schema: {
				body: reprocessInvoicesSchema,
				tags: ["Invoices"],
				description:
					"Apaga registros antigos das notas salvas e reenfileira o processamento",
			},
		},
		(request, reply) => controller.reprocess(request, reply),
	);

	app.get<{ Params: InvoiceJobStatusParams }>(
		"/jobs/:jobId",
		{
			schema: {
				params: invoiceJobStatusParamsSchema,
				tags: ["Invoices"],
				description: "Consulta o status assíncrono do processamento da NFCe",
			},
		},
		(request, reply) => controller.getStatus(request, reply),
	);
}
