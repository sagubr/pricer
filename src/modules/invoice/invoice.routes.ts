import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { invoiceController as controller } from "./invoice.controller";
import { InvoiceParseRequest, parseInvoiceSchema } from "./invoice.types";

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
}
