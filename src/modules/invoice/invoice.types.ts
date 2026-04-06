import { z } from "zod";
import type { ProductNormalizerResponse } from "../product-normalizer/product-normalizer.types";

export const parseInvoiceSchema = z.object({
	url: z.union([z.url(), z.array(z.url()).min(1)]),
});

export type InvoiceParseRequest = z.infer<typeof parseInvoiceSchema>;

export const reprocessInvoicesSchema = z.object({
	url: z.union([z.url(), z.array(z.url()).min(1)]),
});

export type ReprocessInvoicesRequest = z.infer<typeof reprocessInvoicesSchema>;

export const invoiceJobStatusEnumSchema = z.enum([
	"queued",
	"parsing",
	"processing",
	"completed",
	"failed",
]);

export type InvoiceJobStatus = z.infer<typeof invoiceJobStatusEnumSchema>;

export const invoiceJobStatusParamsSchema = z.object({
	jobId: z.string().min(1),
});

export type InvoiceJobStatusParams = z.infer<typeof invoiceJobStatusParamsSchema>;

export const invoiceIssuerSchema = z.object({
	name: z.string(),
	cnpj: z.string(),
	ie: z.string().optional(),
	address: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	location: z
		.object({
			lat: z.number(),
			lon: z.number(),
		})
		.optional(),
});

export type InvoiceIssuer = z.infer<typeof invoiceIssuerSchema>;

export const invoiceItemSchema = z.object({
	description: z.string(),
	code: z.string().optional(),
	quantity: z.number().optional(),
	unit: z.string().optional(),
	unit_price: z.number().optional(),
	total: z.number(),
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

export const invoicePaymentSchema = z.object({
	method: z.string(),
	value: z.number(),
});

export type InvoicePayment = z.infer<typeof invoicePaymentSchema>;

export const invoiceMetadataSchema = z.object({
	model: z.string().optional(),
	series: z.string().optional(),
	number: z.string().optional(),
	emittedAt: z.string().optional(),
	protocol: z.string().optional(),
	accessKey: z.string().optional(),
});

export type InvoiceMetadata = z.infer<typeof invoiceMetadataSchema>;

export const parseInvoiceResponseSchema = z.object({
	issuer: invoiceIssuerSchema,
	items: z.array(invoiceItemSchema),
	payments: z.array(invoicePaymentSchema).optional(),
	total: z.number().optional(),
	metadata: invoiceMetadataSchema.optional(),
});

export type InvoiceParseResponse = z.infer<typeof parseInvoiceResponseSchema>;

export interface InvoiceProcessingResponse {
	invoice: InvoiceParseResponse;
	normalization: ProductNormalizerResponse;
}

export interface EnqueueInvoiceResponse {
	jobId: string;
	status: InvoiceJobStatus;
}

export interface EnqueueInvoiceBatchResponse {
	jobs: EnqueueInvoiceResponse[];
}

export interface InvoiceJobStatusResponse {
	jobId: string;
	sourceUrl: string;
	status: InvoiceJobStatus;
	receiptId?: number;
	errorMessage?: string;
	updatedAt: string;
}

export interface InvoiceParseJobPayload {
	jobId: string;
	url: string;
}

export interface InvoiceProcessJobPayload {
	jobId: string;
	url: string;
	invoice: InvoiceParseResponse;
}
