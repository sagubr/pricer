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

		const metadata = {
			model: $("td")
				.filter((_, el) => $(el).text() === "65")
				.text(),
			series: $("td")
				.filter((_, el) => $(el).text() === "60")
				.text(),
			number: $("td")
				.filter((_, el) => $(el).text() === "38512")
				.text(),
		};

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
}
