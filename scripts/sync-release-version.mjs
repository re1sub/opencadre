#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const raw = process.argv[2];

if (!raw) {
	console.error(
		"No version provided. Usage: node scripts/sync-release-version.mjs <version>",
	);
	process.exit(1);
}

const plainVersion = raw.replace(/^v/, "").split("+")[0];

if (!/^\d+\.\d+\.\d+$/.test(plainVersion)) {
	console.error(`Invalid version: "${raw}"`);
	process.exit(1);
}

const patch = (file, alreadySynced, apply) => {
	const path = join(root, file);
	const content = readFileSync(path, "utf8");
	if (alreadySynced(content)) {
		return;
	}
	const replaced = apply(content);
	if (replaced === content) {
		console.error(`Failed to sync version in ${file}`);
		process.exit(1);
	}
	writeFileSync(path, replaced, "utf8");
};

const jsonVersion = `"version": "${plainVersion}"`;
const tomlVersion = `version = "${plainVersion}"`;

patch(
	"package.json",
	(c) => c.includes(jsonVersion),
	(c) =>
		c.replace(
			/("version"\s*:\s*")[^"]+(")/,
			(_m, p1, p2) => `${p1}${plainVersion}${p2}`,
		),
);
patch(
	"src-tauri/tauri.conf.json",
	(c) => c.includes(jsonVersion),
	(c) =>
		c.replace(
			/("version"\s*:\s*")[^"]+(")/,
			(_m, p1, p2) => `${p1}${plainVersion}${p2}`,
		),
);
patch(
	"src-tauri/Cargo.toml",
	(c) => c.includes(tomlVersion),
	(c) =>
		c.replace(
			/^(version = ")[^"]+(")/m,
			(_m, p1, p2) => `${p1}${plainVersion}${p2}`,
		),
);
patch(
	"src-tauri/Cargo.lock",
	(c) =>
		c.includes(`name = "opencadre"\r\nversion = "${plainVersion}"`) ||
		c.includes(`name = "opencadre"\nversion = "${plainVersion}"`),
	(c) =>
		c.replace(
			/(name = "opencadre"\r?\n)(version = ")[^"]+(")/,
			(_m, p1, p2, p3) => `${p1}${p2}${plainVersion}${p3}`,
		),
);

// pnpm-lock.yaml (v9) does not record the root importer version, so no change is needed there.

console.log(
	`Synced version ${plainVersion} across package.json, src-tauri/Cargo.toml, src-tauri/Cargo.lock, src-tauri/tauri.conf.json`,
);
