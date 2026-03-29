import { nominatimService } from "../nominatin/nominatin.service";
import { productNormalizerService } from "../product-normalizer/product-normalizer.service";
import { logger } from "@/infra/observability/logger.config";
import { QueueFactory } from "@/infra/queue/queue.factory";
import { QueueJobType } from "@/infra/queue/queue.types";
import { INVOICE_PARSE_QUEUE, INVOICE_PROCESS_QUEUE } from "@/const/queue";
import { env } from "@/config/env.config";
import {
	buildGeocodeQuery,
	parseIssuerAddress,
} from "./drivers/address.parser";
import { createDriver } from "./invoice.factory";
import {
	EnqueueInvoiceBatchResponse,
	EnqueueInvoiceResponse,
	InvoiceJobStatusResponse,
	InvoiceParseJobPayload,
	InvoiceParseResponse,
	InvoiceProcessJobPayload,
	InvoiceProcessingResponse,
} from "./invoice.types";
import type { ProductNormalizationInput } from "../product-normalizer/product-normalizer.types";
import { createHash } from "node:crypto";
import { invoiceRepository } from "./invoice.repository";
import { NotFoundError } from "@/shared/http/api.error";

const MINUTE_IN_MS = 60 * 1000;
const PARSE_JOB_OPTIONS = {
	attempts: 5,
	backoff: { type: "exponential" as const, delay: 5 * MINUTE_IN_MS },
};
const PROCESS_JOB_OPTIONS = {
	attempts: 5,
	backoff: { type: "exponential" as const, delay: 15 * MINUTE_IN_MS },
};

class InvoiceService {
	async enqueueParse(
		url: string | string[],
	): Promise<EnqueueInvoiceResponse | EnqueueInvoiceBatchResponse> {
		if (Array.isArray(url)) {
			const jobs = await Promise.all(url.map((item) => this.enqueueSingleParse(item)));
			return { jobs };
		}

		return this.enqueueSingleParse(url);
	}

	private async enqueueSingleParse(url: string): Promise<EnqueueInvoiceResponse> {
		const jobId = this.buildJobId(url);
		await invoiceRepository.upsertJob({
			jobId,
			sourceUrl: url,
			status: "queued",
		});

		try {
			await QueueFactory.getQueue(INVOICE_PARSE_QUEUE).add(
				QueueJobType.INVOICE_PARSE,
				{ jobId, url },
				{
					jobId,
					...PARSE_JOB_OPTIONS,
				},
			);
		} catch (error: any) {
			if (!String(error?.message || "").includes("Job is already waiting")) {
				throw error;
			}
		}

		return {
			jobId,
			status: "queued",
		};
	}

	async getJobStatus(jobId: string): Promise<InvoiceJobStatusResponse> {
		const job = await invoiceRepository.getJobById(jobId);
		if (!job) {
			throw new NotFoundError("Job não encontrado");
		}

		return {
			jobId: job.jobId,
			sourceUrl: job.sourceUrl,
			status: job.status,
			receiptId: job.receiptId || undefined,
			errorMessage: job.errorMessage || undefined,
			updatedAt: job.updatedAt.toISOString(),
		};
	}

	async handleParseJob(payload: InvoiceParseJobPayload): Promise<void> {
		await invoiceRepository.updateJobStatus({
			jobId: payload.jobId,
			status: "parsing",
			incrementAttempts: true,
		});

		try {
			const invoice = await this.fetchAndParseInvoice(payload.url);

			await QueueFactory.getQueue(INVOICE_PROCESS_QUEUE).add(
				QueueJobType.INVOICE_PROCESS,
				{
					jobId: payload.jobId,
					url: payload.url,
					invoice,
				} satisfies InvoiceProcessJobPayload,
				{
					jobId: payload.jobId,
					...PROCESS_JOB_OPTIONS,
				},
			);
		} catch (error: any) {
			await invoiceRepository.updateJobStatus({
				jobId: payload.jobId,
				status: "failed",
				errorMessage: this.stringifyError(error),
			});
			throw error;
		}
	}

	async handleProcessJob(payload: InvoiceProcessJobPayload): Promise<void> {
		await invoiceRepository.updateJobStatus({
			jobId: payload.jobId,
			status: "processing",
			incrementAttempts: true,
		});

		try {
			const normalizationInput = this.buildNormalizationInput(
				payload.url,
				payload.invoice,
			);
			const normalization =
				await productNormalizerService.normalizeInvoiceItems(normalizationInput);

			const persisted = await invoiceRepository.persistProcessedInvoice({
				url: payload.url,
				invoice: payload.invoice,
				normalization,
			});

			await invoiceRepository.updateJobStatus({
				jobId: payload.jobId,
				status: "completed",
				receiptId: persisted.receiptId,
			});

			logger.info(
				{
					jobId: payload.jobId,
					receiptId: persisted.receiptId,
					deduplicated: persisted.wasDeduplicated,
				},
				"Invoice processada com sucesso",
			);
		} catch (error: any) {
			await invoiceRepository.updateJobStatus({
				jobId: payload.jobId,
				status: "failed",
				errorMessage: this.stringifyError(error),
			});
			throw error;
		}
	}

	// Mantido para debug síncrono e reaproveitamento em cenários internos
	async parse(url: string): Promise<InvoiceProcessingResponse> {
		const invoice = await this.fetchAndParseInvoice(url);
		const normalizationInput = this.buildNormalizationInput(url, invoice);
		const normalization =
			await productNormalizerService.normalizeInvoiceItems(normalizationInput);

		return {
			invoice,
			normalization,
		};
	}

	private async fetchAndParseInvoice(url: string): Promise<InvoiceParseResponse> {
		const driver = createDriver(url);
		const html = await driver.fetch(url);
		const invoice = await driver.parse(html);
		await this.enrichIssuerLocation(invoice);
		return invoice;
	}

	private async enrichIssuerLocation(invoice: InvoiceParseResponse) {
		try {
			const issuer = invoice.issuer;
			if (!issuer?.address) return;
			const parsed = parseIssuerAddress(issuer.address);
			const query = buildGeocodeQuery(parsed);
			if (!query) return;
			const geo = await nominatimService.geocode(query);
			if (!geo) return;
			invoice.issuer.location = {
				lat: geo.lat,
				lon: geo.lon,
			};
		} catch {}
	}

	private buildNormalizationInput(
		url: string,
		invoice: InvoiceParseResponse,
	): ProductNormalizationInput {
		return {
			source: {
				type: "invoice",
				reference: url,
			},
			metadata: {
				issuerName: invoice.issuer.name,
				issuerDocument: invoice.issuer.cnpj,
				emittedAt: invoice.metadata?.emittedAt,
				total: invoice.total,
			},
			items: invoice.items.map((item, index) => ({
				index,
				description: item.description,
				code: item.code,
				quantity: item.quantity,
				unit: item.unit,
				unitPrice: item.unit_price,
				total: item.total,
			})),
		};
	}

	private buildJobId(url: string): string {
		const hash = createHash("sha256").update(url).digest("hex");
		return `${env.SERVICE_NAME}:${env.NODE_ENV}:${hash}`;
	}

	private stringifyError(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}

		return "Erro desconhecido";
	}
}

export const invoiceService = new InvoiceService();
