const IV_BYTES = 12;
const HKDF_SALT = "opencadre:vault:v1";
const HKDF_INFO = "workspace-data-key";
const RECOVERY_INFO = "opencadre:recovery:v1";
const RECOVERY_CODE_BYTES = 20;
const RECOVERY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const subtle = () => globalThis.crypto.subtle;

export interface SealedBytes {
	iv: string;
	ct: string;
}

export interface WrappedDataKey extends SealedBytes {
	senderPublicKey: string;
	keyId: string;
}

const asBuffer = (bytes: Uint8Array): BufferSource =>
	bytes as unknown as BufferSource;

export const toBase64 = (bytes: Uint8Array): string => {
	let binary = "";
	const chunk = 8192;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(
			...bytes.subarray(i, Math.min(i + chunk, bytes.length)),
		);
	}
	return btoa(binary);
};

export const fromBase64 = (value: string): Uint8Array =>
	Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

export const randomBytes = (length: number): Uint8Array =>
	globalThis.crypto.getRandomValues(new Uint8Array(length));

const importAesKey = (
	raw: Uint8Array,
	extractable = false,
): Promise<CryptoKey> =>
	subtle().importKey("raw", asBuffer(raw), "AES-GCM", extractable, [
		"encrypt",
		"decrypt",
	]);

export async function encryptBytes(
	key: CryptoKey,
	bytes: Uint8Array,
	aad: string,
	iv: Uint8Array = randomBytes(IV_BYTES),
): Promise<SealedBytes> {
	const ct = await subtle().encrypt(
		{
			name: "AES-GCM",
			iv: asBuffer(iv),
			additionalData: asBuffer(encoder.encode(aad)),
		},
		key,
		asBuffer(bytes),
	);
	return { iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
}

export async function decryptBytes(
	key: CryptoKey,
	sealed: SealedBytes,
	aad: string,
	ivBytes?: Uint8Array,
	ctBytes?: Uint8Array,
): Promise<Uint8Array> {
	try {
		const plain = await subtle().decrypt(
			{
				name: "AES-GCM",
				iv: asBuffer(ivBytes ?? fromBase64(sealed.iv)),
				additionalData: asBuffer(encoder.encode(aad)),
			},
			key,
			asBuffer(ctBytes ?? fromBase64(sealed.ct)),
		);
		return new Uint8Array(plain);
	} catch {
		throw new Error("Unable to decrypt: wrong key or tampered data");
	}
}

export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
	return subtle().generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
		"deriveBits",
	]);
}

export async function exportIdentityPublicKey(key: CryptoKey): Promise<string> {
	const spki = await subtle().exportKey("spki", key);
	return toBase64(new Uint8Array(spki));
}

export async function exportIdentityPrivateKey(
	key: CryptoKey,
): Promise<string> {
	const pkcs8 = await subtle().exportKey("pkcs8", key);
	return toBase64(new Uint8Array(pkcs8));
}

export async function importIdentityPublicKey(
	base64: string,
): Promise<CryptoKey> {
	return subtle().importKey(
		"spki",
		asBuffer(fromBase64(base64)),
		{ name: "ECDH", namedCurve: "P-256" },
		true,
		[],
	);
}

export async function importIdentityPrivateKey(
	base64: string,
): Promise<CryptoKey> {
	return subtle().importKey(
		"pkcs8",
		asBuffer(fromBase64(base64)),
		{ name: "ECDH", namedCurve: "P-256" },
		true,
		["deriveBits"],
	);
}

export async function deriveSharedWrappingKey(
	privateKey: CryptoKey,
	publicKey: CryptoKey,
): Promise<CryptoKey> {
	const bits = await subtle().deriveBits(
		{ name: "ECDH", public: publicKey },
		privateKey,
		256,
	);
	const base = await subtle().importKey("raw", bits, "HKDF", false, [
		"deriveKey",
	]);

	return subtle().deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: asBuffer(encoder.encode(HKDF_SALT)),
			info: asBuffer(encoder.encode(HKDF_INFO)),
		},
		base,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

export async function generateWorkspaceKey(): Promise<CryptoKey> {
	return subtle().generateKey({ name: "AES-GCM", length: 256 }, true, [
		"encrypt",
		"decrypt",
	]);
}

export async function exportWorkspaceKey(key: CryptoKey): Promise<Uint8Array> {
	const raw = await subtle().exportKey("raw", key);
	return new Uint8Array(raw);
}

export async function importWorkspaceKey(raw: Uint8Array): Promise<CryptoKey> {
	return importAesKey(raw, true);
}

const encodeRecovery = (bytes: Uint8Array): string => {
	let bits = 0;
	let value = 0;
	let out = "";
	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += RECOVERY_ALPHABET[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) out += RECOVERY_ALPHABET[(value << (5 - bits)) & 31];
	return out;
};

const normalizeRecovery = (code: string): string => {
	const cleaned = code.toUpperCase().replace(/[^0-9A-Z]/g, "");
	let out = "";
	for (const char of cleaned) {
		if (char === "I" || char === "L") out += "1";
		else if (char === "O") out += "0";
		else out += char;
	}
	return out;
};

const decodeRecovery = (code: string): Uint8Array => {
	const cleaned = normalizeRecovery(code);
	const bytes: number[] = [];
	let bits = 0;
	let value = 0;
	for (const char of cleaned) {
		const index = RECOVERY_ALPHABET.indexOf(char);
		if (index === -1)
			throw new Error("Recovery code contains invalid characters");
		value = (value << 5) | index;
		bits += 5;
		if (bits >= 8) {
			bytes.push((value >>> (bits - 8)) & 0xff);
			bits -= 8;
		}
	}
	return new Uint8Array(bytes);
};

export const generateRecoveryCode = (): string => {
	const raw = encodeRecovery(randomBytes(RECOVERY_CODE_BYTES));
	return raw.match(/.{1,4}/g)?.join("-") ?? raw;
};

export async function deriveRecoveryKey(
	code: string,
	userId: string,
): Promise<CryptoKey> {
	const base = await subtle().importKey(
		"raw",
		asBuffer(decodeRecovery(code)),
		"HKDF",
		false,
		["deriveKey"],
	);
	return subtle().deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: asBuffer(encoder.encode(`${RECOVERY_INFO}:${userId}`)),
			info: asBuffer(encoder.encode("private-key")),
		},
		base,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

export async function protectPrivateKeyWithCode(
	code: string,
	userId: string,
	privateKeyPkcs8: string,
	aad: string,
): Promise<SealedBytes> {
	const key = await deriveRecoveryKey(code, userId);
	return encryptBytes(key, encoder.encode(privateKeyPkcs8), aad);
}

export async function restorePrivateKeyWithCode(
	code: string,
	userId: string,
	protectedKey: SealedBytes,
	aad: string,
): Promise<CryptoKey> {
	const key = await deriveRecoveryKey(code, userId);
	let pkcs8: string;
	try {
		pkcs8 = decoder.decode(await decryptBytes(key, protectedKey, aad));
	} catch {
		throw new Error("Incorrect recovery code");
	}
	return importIdentityPrivateKey(pkcs8);
}

export async function generateDeviceKey(): Promise<CryptoKey> {
	return subtle().generateKey({ name: "AES-GCM", length: 256 }, false, [
		"encrypt",
		"decrypt",
	]);
}

export async function protectPrivateKeyForDevice(
	deviceKey: CryptoKey,
	privateKeyPkcs8: string,
	aad: string,
): Promise<SealedBytes> {
	return encryptBytes(deviceKey, encoder.encode(privateKeyPkcs8), aad);
}

export async function restorePrivateKeyFromDevice(
	deviceKey: CryptoKey,
	sealed: SealedBytes,
	aad: string,
): Promise<CryptoKey> {
	let pkcs8: string;
	try {
		pkcs8 = decoder.decode(await decryptBytes(deviceKey, sealed, aad));
	} catch {
		throw new Error("This device cannot unlock the vault any more");
	}
	return importIdentityPrivateKey(pkcs8);
}

export async function wrapWorkspaceKey(
	sharedKey: CryptoKey,
	workspaceKey: Uint8Array,
	aad: string,
): Promise<SealedBytes> {
	return encryptBytes(sharedKey, workspaceKey, aad);
}

export async function unwrapWorkspaceKey(
	sharedKey: CryptoKey,
	sealed: SealedBytes,
	aad: string,
): Promise<Uint8Array> {
	return decryptBytes(sharedKey, sealed, aad);
}

export async function hashOneTimePublicKey(base64: string): Promise<string> {
	const bytes = fromBase64(base64);
	const digest = await subtle().digest("SHA-256", asBuffer(bytes));
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}
