import { spawnSync } from "node:child_process";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "host.docker.internal"]);

const usesLocalSupabase = () => {
	const rawUrl = process.env.VITE_SUPABASE_URL;
	if (!rawUrl) return true;

	try {
		const url = new URL(rawUrl);
		return (
			LOCAL_HOSTS.has(url.hostname) && (url.port === "54321" || url.port === "")
		);
	} catch {
		return false;
	}
};

const globalSetup = () => {
	if (!usesLocalSupabase()) {
		console.log(
			"[e2e] Skipping Supabase reset because VITE_SUPABASE_URL is not local.",
		);
		return;
	}

	const result = spawnSync("pnpm", ["exec", "supabase", "db", "reset"], {
		cwd: process.cwd(),
		env: process.env,
		stdio: "inherit",
	});

	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(
			`Supabase reset failed with exit code ${result.status ?? "unknown"}`,
		);
	}
};

export default globalSetup;
