import * as cheerio from "cheerio";
import { InvoiceParseResponse } from "../../invoice.types";

export class StandardParser {
	parse(html: string): InvoiceParseResponse {
		const $ = cheerio.load(html);

		const issuerName = $("thead th.text-uppercase b").first().text().trim();

		const issuerInfo = $("tbody tr").first().text();

		const cnpj = issuerInfo.match(/CNPJ:\s*(\d+)/)?.[1] ?? "";
		const ie = issuerInfo.match(/Inscrição Estadual:\s*(\d+)/)?.[1] ?? "";

		const address = $("tbody tr").eq(1).text().trim();

		const items: any[] = [];

		$("#myTable tr").each((_, el) => {
			const tds = $(el).find("td");

			if (tds.length < 4) return;

			const description = $(tds[0]).find("h7").text().trim();

			const code = $(tds[0])
				.text()
				.match(/\(Código:\s*(\d+)\)/)?.[1];

			const quantityText = $(tds[1])
				.text()
				.replace("Qtde total de ítens:", "")
				.trim();

			const quantity = Number(quantityText.replace(",", "."));

			const unit = $(tds[2]).text().replace("UN:", "").trim();

			const totalText = $(tds[3])
				.text()
				.replace("Valor total R$: R$", "")
				.trim();

			const total = Number(totalText.replace(",", "."));

			items.push({
				description,
				code,
				quantity,
				unit,
				total,
			});
		});

		const total = Number(
			$("strong")
				.filter((_, el) =>
					!!$(el)
						.text()
						.match(/^\d+\.\d+$/),
				)
				.last()
				.text(),
		);

		const paymentMethod = $("div[id*='j_idt82']").text().trim();

		const payments =
			paymentMethod ?
				[
					{
						method: paymentMethod,
						value: total,
					},
				]
			:	[];

		const metadata = this.extractMetadata($);

		return {
			issuer: {
				name: issuerName,
				cnpj,
				ie,
				address,
			},
			items,
			payments,
			total,
			metadata,
		};
	}

	private extractMetadata($: ReturnType<typeof cheerio.load>) {
		const metadata: {
			model?: string;
			series?: string;
			number?: string;
			emittedAt?: string;
			protocol?: string;
			accessKey?: string;
		} = {};

		const generalInfoTable = $("table")
			.filter((_, table) => {
				const headerText = $(table)
					.find("thead th")
					.map((__, th) => $(th).text().trim().toLowerCase())
					.get()
					.join("|");

				return (
					headerText.includes("modelo") &&
					headerText.includes("série") &&
					headerText.includes("número") &&
					headerText.includes("data emissão")
				);
			})
			.first();

		if (generalInfoTable.length > 0) {
			const cells = generalInfoTable
				.find("tbody tr")
				.first()
				.find("td")
				.map((_, td) => $(td).text().trim())
				.get();

			metadata.model = cells[0] || undefined;
			metadata.series = cells[1] || undefined;
			metadata.number = cells[2] || undefined;

			const rawEmittedAt = cells[3] || undefined;
			if (rawEmittedAt) {
				metadata.emittedAt =
					this.parseBrazilianDateTime(rawEmittedAt) || rawEmittedAt;
			}
		}

		const protocolValue = $("table")
			.filter((_, table) =>
				$(table)
					.find("thead th")
					.toArray()
					.some((th) => $(th).text().trim().toLowerCase() === "protocolo"),
			)
			.first()
			.find("tbody tr td")
			.first()
			.text()
			.trim();

		if (protocolValue) {
			metadata.protocol = protocolValue;
		}

		const rawAccessKey = $("#collapseTwo td").first().text().trim();
		const normalizedAccessKey = rawAccessKey.replace(/\D/g, "");
		if (normalizedAccessKey.length === 44) {
			metadata.accessKey = normalizedAccessKey;
		}

		return metadata;
	}

	private parseBrazilianDateTime(value: string): string | null {
		const match = value.match(
			/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
		);

		if (!match) {
			return null;
		}

		const [, day, month, year, hour = "00", minute = "00", second = "00"] =
			match;

		return `${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`;
	}
}
