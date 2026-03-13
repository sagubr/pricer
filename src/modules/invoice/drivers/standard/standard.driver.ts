import { InvoiceParseResponse } from "../../invoice.types";
import { HttpClient } from "@/infra/http/http.client";
import { StandardParser } from "./standard.parser";
import { IDriver } from "../driver.interface";

export class StandardDriver implements IDriver {
	private parser = new StandardParser();
	private httpClient = new HttpClient();

	async fetch(url: string): Promise<string> {
		const html = await this.httpClient.get<string>(url, {
			responseType: "text",
			headers: {
				"User-Agent": "Mozilla/5.0",
			},
		});
		return html;
	}

	async parse(html: string): Promise<InvoiceParseResponse> {
		return this.parser.parse(html);
	}
}
