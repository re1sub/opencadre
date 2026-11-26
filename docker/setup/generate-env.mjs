import {
	createHash,
	createHmac,
	generateKeyPairSync,
	randomBytes,
	randomUUID,
	sign,
} from "node:crypto";
import {
	chownSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const ENV_PATH = resolve(ROOT, ".env");
const TEMPLATE_PATH = resolve(ROOT, ".env.example");
const PUBLIC_ENV_PATH = resolve(ROOT, "docker/app/build.env");
const PUBLIC_ENV_KEYS = ["SUPABASE_PUBLIC_URL", "SUPABASE_PUBLISHABLE_KEY"];

// A newly copied file would be owned by the container user. Use the mounted
// project directory owner so a non-root host can edit and read .env.
const owner = existsSync(ENV_PATH) ? statSync(ENV_PATH) : statSync(ROOT);

if (!existsSync(ENV_PATH)) {
	copyFileSync(TEMPLATE_PATH, ENV_PATH);
	console.log("Created .env from .env.example");
}

const lines = readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
const values = new Map();

for (const line of lines) {
	const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
	if (match) values.set(match[1], match[2]);
}

const isMissing = (key) => {
	const value = values.get(key);
	return (
		value === undefined || value.trim() === "" || value.startsWith("CHANGE_ME")
	);
};

const set = (key, value) => {
	values.set(key, value);
	const index = lines.findIndex((line) => line.startsWith(`${key}=`));
	if (index >= 0) lines[index] = `${key}=${value}`;
	else lines.push(`${key}=${value}`);
};

// Repair stale .env files created from an older template. Add only keys that
// are completely absent, so values the operator already chose are preserved.
const templateLines = readFileSync(TEMPLATE_PATH, "utf8").split(/\r?\n/);
let backfilled = 0;
for (const line of templateLines) {
	const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
	if (match && !values.has(match[1])) {
		set(match[1], match[2]);
		backfilled += 1;
	}
}
if (backfilled > 0) {
	console.log(`Added ${backfilled} missing settings from .env.example`);
}

const hex = (bytes) => randomBytes(bytes).toString("hex");
const base64 = (bytes) => randomBytes(bytes).toString("base64");
const base64url = (input) => Buffer.from(input).toString("base64url");

const signHs256 = (secret, payload) => {
	const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const body = base64url(JSON.stringify(payload));
	const content = `${header}.${body}`;
	const signature = createHmac("sha256", secret)
		.update(content)
		.digest("base64url");
	return `${content}.${signature}`;
};

const opaqueKey = (prefix) => {
	const random = randomBytes(17).toString("base64url").slice(0, 22);
	const intermediate = prefix + random;
	const checksum = createHash("sha256")
		.update(`supabase-self-hosted|${intermediate}`)
		.digest("base64url")
		.slice(0, 8);
	return `${intermediate}_${checksum}`;
};

if (isMissing("JWT_SECRET")) set("JWT_SECRET", base64(30));
const jwtSecret = values.get("JWT_SECRET");

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 5 * 365 * 24 * 60 * 60;
if (isMissing("ANON_KEY")) {
	set(
		"ANON_KEY",
		signHs256(jwtSecret, { role: "anon", iss: "supabase", iat, exp }),
	);
}
if (isMissing("SERVICE_ROLE_KEY")) {
	set(
		"SERVICE_ROLE_KEY",
		signHs256(jwtSecret, { role: "service_role", iss: "supabase", iat, exp }),
	);
}

const simpleSecrets = {
	POSTGRES_PASSWORD: () => hex(16),
	DASHBOARD_PASSWORD: () => hex(16),
	SECRET_KEY_BASE: () => base64(48),
	REALTIME_DB_ENC_KEY: () => hex(8),
	VAULT_ENC_KEY: () => hex(16),
	PG_META_CRYPTO_KEY: () => base64(24),
	SUPABASE_PUBLISHABLE_KEY: () => opaqueKey("sb_publishable_"),
	SUPABASE_SECRET_KEY: () => opaqueKey("sb_secret_"),
};

for (const [key, generate] of Object.entries(simpleSecrets)) {
	if (isMissing(key)) set(key, generate());
}

const asymmetricKeyNames = [
	"JWT_KEYS",
	"JWT_JWKS",
	"ANON_KEY_ASYMMETRIC",
	"SERVICE_ROLE_KEY_ASYMMETRIC",
];

// These four values must describe one key set. If any part is missing, rebuild
// all four together so signed tokens always match the configured JWKS.
if (asymmetricKeyNames.some(isMissing)) {
	const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
	const jwk = privateKey.export({ format: "jwk" });
	const kid = randomUUID();
	const octKey = { kty: "oct", k: base64url(jwtSecret), alg: "HS256" };
	const publicKey = {
		kty: "EC",
		kid,
		use: "sig",
		key_ops: ["verify"],
		alg: "ES256",
		ext: true,
		crv: jwk.crv,
		x: jwk.x,
		y: jwk.y,
	};

	const signToken = (payload) => {
		const header = base64url(JSON.stringify({ alg: "ES256", typ: "JWT", kid }));
		const body = base64url(JSON.stringify(payload));
		const content = `${header}.${body}`;
		const signature = sign("SHA256", Buffer.from(content), {
			key: privateKey,
			dsaEncoding: "ieee-p1363",
		}).toString("base64url");
		return `${content}.${signature}`;
	};

	set(
		"JWT_KEYS",
		JSON.stringify([
			{
				kty: "EC",
				kid,
				use: "sig",
				key_ops: ["sign", "verify"],
				alg: "ES256",
				ext: true,
				crv: jwk.crv,
				x: jwk.x,
				y: jwk.y,
				d: jwk.d,
			},
			octKey,
		]),
	);
	set("JWT_JWKS", JSON.stringify({ keys: [publicKey, octKey] }));
	set(
		"ANON_KEY_ASYMMETRIC",
		signToken({ role: "anon", iss: "supabase", iat, exp }),
	);
	set(
		"SERVICE_ROLE_KEY_ASYMMETRIC",
		signToken({ role: "service_role", iss: "supabase", iat, exp }),
	);
}

const output = `${lines.join("\n").replace(/\n+$/, "")}\n`;
const tempPath = `${ENV_PATH}.tmp`;
writeFileSync(tempPath, output, { mode: 0o600 });
chownSync(tempPath, owner.uid, owner.gid);
renameSync(tempPath, ENV_PATH);

const publicLines = [
	"# Generated by docker/setup/generate-env.mjs. Public values only. Do not edit.",
	...[...values.entries()]
		.filter(([key]) => key.startsWith("VITE_") || PUBLIC_ENV_KEYS.includes(key))
		.map(([key, value]) => `${key}=${value}`),
	"",
];
mkdirSync(resolve(ROOT, "docker/app"), { recursive: true });
writeFileSync(PUBLIC_ENV_PATH, publicLines.join("\n"), { mode: 0o644 });
chownSync(PUBLIC_ENV_PATH, owner.uid, owner.gid);

console.log("Generated missing secrets in .env");
console.log("Wrote docker/app/build.env for the app build");
console.log("Next: docker compose up --build --attach status");
