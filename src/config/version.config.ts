import fs from "fs";
import path from "path";

interface VersionInfo {
	version: string;
	releaseDate: string;
}

class VersionConfig {
	private static instance: VersionConfig;
	private versionInfo: VersionInfo;

	private constructor() {
		this.versionInfo = this.loadVersionFile();
	}

	public static getInstance(): VersionConfig {
		if (!VersionConfig.instance) {
			VersionConfig.instance = new VersionConfig();
		}
		return VersionConfig.instance;
	}

	private loadVersionFile(): VersionInfo {
		const versionPath = path.join(__dirname, "..", "..", "version.json");

		try {
			const content = fs.readFileSync(versionPath, "utf-8");
			return JSON.parse(content);
		} catch (error) {
			console.warn(
				"version.json not found, using default version 1.0.0",
			);
			return {
				version: "1.0.0",
				releaseDate: new Date().toISOString(),
			};
		}
	}

	public getVersion(): string {
		return this.versionInfo.version;
	}

	public getReleaseDate(): string {
		return this.versionInfo.releaseDate;
	}

	public getVersionInfo(): VersionInfo {
		return { ...this.versionInfo };
	}

	public reload(): void {
		this.versionInfo = this.loadVersionFile();
	}
}

export const versionConfig = VersionConfig.getInstance();
