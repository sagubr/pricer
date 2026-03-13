import { nominatimService } from "../nominatin/nominatin.service";
import { productNormalizerService } from "../product-normalizer/product-normalizer.service";
import {
	buildGeocodeQuery,
	parseIssuerAddress,
} from "./drivers/address.parser";
import { createDriver } from "./invoice.factory";
import {
	InvoiceParseResponse,
	InvoiceProcessingResponse,
} from "./invoice.types";
import type { ProductNormalizationInput } from "../product-normalizer/product-normalizer.types";

class InvoiceService {
	async parse(url: string): Promise<InvoiceProcessingResponse> {
		const driver = createDriver(url);
		const html = await driver.fetch(url);
		const invoice = await driver.parse(html);
		await this.enrichIssuerLocation(invoice);
		const normalizationInput = this.buildNormalizationInput(url, invoice);
		const normalization =
			await productNormalizerService.normalizeInvoiceItems(normalizationInput);

		return {
			invoice,
			normalization,
		};
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
}

export const invoiceService = new InvoiceService();
