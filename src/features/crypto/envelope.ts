import { decryptBytes, encryptBytes, randomBytes, toBase64 } from "./crypto";
import { VaultDecryptionError } from "./errors";

export const V3_ENVELOPE =
	/^v3\.([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9+/]{16})\.((?:[A-Za-z0-9+/]{4}){5,}(?:[A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==))$/;

export const PLAINTEXT_CAPS = {
	short: 512,
	comment: 65536,
	page: 1048576,
	ydoc: 2097152,
} as const;

export type PlaintextCap = keyof typeof PLAINTEXT_CAPS;

export interface ParsedEnvelope {
	keyId: string;
	iv: string;
	ct: string;
	ivBytes: Uint8Array;
	ctBytes: Uint8Array;
}

const strictFromBase64 = (value: string): Uint8Array => {
	let bytes: Uint8Array;
	try {
		bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
	} catch {
		throw new VaultDecryptionError("Invalid base64 in encrypted envelope");
	}
	if (toBase64(bytes) !== value) {
		throw new VaultDecryptionError(
			"Non-canonical base64 in encrypted envelope",
		);
	}
	return bytes;
};

export function parseEnvelope(value: string): ParsedEnvelope {
	if (typeof value !== "string") {
		throw new VaultDecryptionError("Invalid encrypted envelope");
	}
	const match = V3_ENVELOPE.exec(value);
	if (!match) {
		throw new VaultDecryptionError("Invalid encrypted envelope");
	}
	const [, keyId, iv, ct] = match;
	const ivBytes = strictFromBase64(iv);
	const ctBytes = strictFromBase64(ct);
	if (ivBytes.length !== 12) {
		throw new VaultDecryptionError("Invalid nonce length");
	}
	if (ctBytes.length < 16) {
		throw new VaultDecryptionError("Invalid ciphertext length");
	}
	return { keyId, iv, ct, ivBytes, ctBytes };
}

export const isV3Sealed = (value: unknown): value is string =>
	typeof value === "string" && V3_ENVELOPE.test(value);

export async function sealEnvelope(
	keyId: string,
	key: CryptoKey,
	bytes: Uint8Array,
	aad: string,
	maxPlaintext: number,
	iv?: Uint8Array,
): Promise<string> {
	if (bytes.byteLength > maxPlaintext) {
		throw new Error("Content is too large to encrypt");
	}
	const nonce = iv ?? randomBytes(12);
	if (nonce.length !== 12) {
		throw new Error("Invalid nonce length");
	}
	const sealed = await encryptBytes(key, bytes, aad, nonce);
	return `v3.${keyId}.${sealed.iv}.${sealed.ct}`;
}

export async function openEnvelope(
	envelope: string,
	key: CryptoKey,
	aad: string,
): Promise<Uint8Array> {
	const parsed = parseEnvelope(envelope);
	try {
		return await decryptBytes(
			key,
			{ iv: parsed.iv, ct: parsed.ct },
			aad,
			parsed.ivBytes,
			parsed.ctBytes,
		);
	} catch {
		throw new VaultDecryptionError();
	}
}
