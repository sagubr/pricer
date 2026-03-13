import { IDriver } from "./drivers/driver.interface";
import { StandardDriver } from "./drivers/standard/standard.driver";

const drivers: Record<string, new () => IDriver> = {
	"portalsped.fazenda.mg.gov.br": StandardDriver,
	"nfce.fazenda.sp.gov.br": StandardDriver,
	"nfce.sefaz.rs.gov.br": StandardDriver,
};

export function createDriver(url: string): IDriver {
	const hostname = new URL(url).hostname.replace("www.", "");

	const Driver = drivers[hostname];

	if (!Driver) {
		throw new Error(`Unsupported SEFAZ portal: ${hostname}`);
	}

	return new Driver();
}
