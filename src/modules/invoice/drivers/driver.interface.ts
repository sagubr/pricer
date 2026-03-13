import { InvoiceParseResponse } from "../invoice.types";

export interface IDriver {
	fetch(url: string): Promise<string>;
	parse(html: string): Promise<InvoiceParseResponse>;
}
