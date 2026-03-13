type ResponseType = "json" | "text" | "raw";

export class HttpClient {
	private timeout: number = 5000;
	private maxRetries: number = 3;

	constructor(timeout?: number, maxRetries?: number) {
		if (timeout) this.timeout = timeout;
		if (maxRetries) this.maxRetries = maxRetries;
	}

	private async request<T>(
		url: string,
		options?: RequestInit & { responseType?: ResponseType },
		retries = 0,
	): Promise<T> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal,
				headers: {
					"Content-Type": "application/json",
					...options?.headers,
				},
			});

			if (!response.ok) {
				throw new Error(
					`HTTP ${response.status}: ${response.statusText}`,
				);
			}

			if (options?.responseType === "text") {
				return (await response.text()) as T;
			}

			return (await response.json()) as T;
		} catch (err) {
			if (retries < this.maxRetries && this.isRetryable(err)) {
				await this.delay(Math.pow(2, retries) * 1000);
				return this.request<T>(url, options, retries + 1);
			}
			throw err;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private isRetryable(err: any): boolean {
		if (err.name === "AbortError") return true;
		if (err instanceof TypeError && err.message.includes("fetch"))
			return true;
		return false;
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async get<T>(
		url: string,
		options?: RequestInit & { responseType?: ResponseType },
	): Promise<T> {
		return this.request<T>(url, { ...options, method: "GET" });
	}

	async post<T>(
		url: string,
		body: any,
		options?: RequestInit & { responseType?: ResponseType },
	): Promise<T> {
		return this.request<T>(url, {
			...options,
			method: "POST",
			body: JSON.stringify(body),
		});
	}

	async delete<T>(
		url: string,
		options?: RequestInit & { responseType?: ResponseType },
	): Promise<T> {
		return this.request<T>(url, { ...options, method: "DELETE" });
	}
}
