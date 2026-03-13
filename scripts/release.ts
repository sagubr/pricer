#!/usr/bin/env ts-node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface VersionFile {
	version: string;
	releaseDate: string;
}

interface PackageJson {
	version: string;
	[key: string]: any;
}

type BumpType = "major" | "minor" | "patch";

const VERSION_FILE = path.join(__dirname, "..", "version.json");
const PACKAGE_JSON = path.join(__dirname, "..", "package.json");

function getLastTag(): string | null {
	try {
		return execSync("git describe --tags --abbrev=0", { encoding: "utf-8" }).trim();
	} catch {
		return null;
	}
}

function getCommitsSinceTag(tag: string | null): string[] {
	const command = tag
		? `git log ${tag}..HEAD --pretty=format:"%s"`
		: 'git log --pretty=format:"%s"';

	try {
		const output = execSync(command, { encoding: "utf-8" });
		return output.split("\n").filter(Boolean);
	} catch {
		return [];
	}
}

function analyzeBumpType(commits: string[]): BumpType {
	let hasMajor = false;
	let hasMinor = false;
	let hasPatch = false;

	for (const commit of commits) {
		const message = commit.toLowerCase();

		if (message.includes("breaking change") || message.includes("!:")) {
			hasMajor = true;
		}

		if (message.startsWith("feat:") || message.startsWith("feat(")) {
			hasMinor = true;
		}

		if (
			message.startsWith("fix:") ||
			message.startsWith("fix(") ||
			message.startsWith("perf:") ||
			message.startsWith("perf(") ||
			message.startsWith("refactor:") ||
			message.startsWith("refactor(")
		) {
			hasPatch = true;
		}
	}

	if (hasMajor) return "major";
	if (hasMinor) return "minor";
	if (hasPatch) return "patch";

	return commits.length > 0 ? "patch" : "patch";
}

function bumpVersion(currentVersion: string, type: BumpType): string {
	const [major, minor, patch] = currentVersion.split(".").map(Number);

	switch (type) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
	}
}

function readVersionFile(): VersionFile {
	if (!fs.existsSync(VERSION_FILE)) {
		return { version: "0.0.0", releaseDate: new Date().toISOString() };
	}

	return JSON.parse(fs.readFileSync(VERSION_FILE, "utf-8"));
}

function writeVersionFile(data: VersionFile): void {
	fs.writeFileSync(VERSION_FILE, JSON.stringify(data, null, 2) + "\n");
}

function updatePackageJson(version: string): void {
	const packageJson: PackageJson = JSON.parse(
		fs.readFileSync(PACKAGE_JSON, "utf-8"),
	);
	packageJson.version = version;
	fs.writeFileSync(PACKAGE_JSON, JSON.stringify(packageJson, null, "\t") + "\n");
}

function createGitTag(version: string): void {
	try {
		execSync(`git add version.json package.json`, { stdio: "inherit" });
		execSync(`git commit -m "chore: release v${version}"`, { stdio: "inherit" });
		execSync(`git tag -a v${version} -m "Release v${version}"`, {
			stdio: "inherit",
		});
		console.log(`Git tag v${version} created successfully`);
	} catch (error) {
		console.error("Failed to create git tag:", error);
		process.exit(1);
	}
}

function main() {
	const args = process.argv.slice(2);
	const forcedType = args[0] as BumpType | undefined;

	const lastTag = getLastTag();
	const versionFile = readVersionFile();
	const currentVersion = versionFile.version;

	console.log(`Current version: ${currentVersion}`);
	console.log(`Last git tag: ${lastTag || "none"}`);

	const commits = getCommitsSinceTag(lastTag);
	console.log(`Commits since last tag: ${commits.length}`);

	if (commits.length === 0 && !forcedType) {
		console.log("No commits found. Skipping release.");
		return;
	}

	const bumpType = forcedType || analyzeBumpType(commits);
	console.log(`Bump type: ${bumpType}`);

	const newVersion = bumpVersion(currentVersion, bumpType);
	console.log(`New version: ${newVersion}`);

	writeVersionFile({
		version: newVersion,
		releaseDate: new Date().toISOString(),
	});

	updatePackageJson(newVersion);

	console.log("Version files updated successfully");

	if (process.env.NO_GIT !== "true") {
		createGitTag(newVersion);
	}

	console.log(`\nRelease ${newVersion} completed!`);
	console.log(`\nPush with: git push && git push --tags`);
}

main();
