export interface ParsedIssuerAddress {
	street?: string;
	number?: string;
	neighborhood?: string;
	city?: string;
	state?: string;
}

export interface ParsedIssuerAddress {
	street?: string;
	number?: string;
	neighborhood?: string;
	city?: string;
	state?: string;
}

export function parseIssuerAddress(address: string): ParsedIssuerAddress {
	if (!address) return {};

	const parts = address.split(",").map((p) => p.trim());

	const street = parts[0];
	const number = parts[1];
	const neighborhood = parts[2];
	const cityStatePart = parts[3];
	const statePart = parts[4];

	if (!cityStatePart) return { street, number, neighborhood };

	const match = cityStatePart.match(/\d+\s*-\s*(.+)/);

	const city: string | undefined =
		match ? match[1].trim() : cityStatePart.trim();
	const state: string | undefined = statePart ? statePart.trim() : undefined;

	return {
		street,
		number,
		neighborhood,
		city,
		state,
	};
}

export function buildGeocodeQuery(addr: ParsedIssuerAddress): string | null {
	if (!addr.city || !addr.state) return null;

	const parts = [addr.city, addr.state, "Brazil"].filter(Boolean);

	return parts.join(" ");
}
