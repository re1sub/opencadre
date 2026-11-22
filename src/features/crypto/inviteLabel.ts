const VERSION = "n1";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const MAX_PLAINTEXT_BYTES = 512;

const toBase64Url = (bytes: Uint8Array): string => {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
};

const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
	const normalised = value.replace(/-/g, "+").replace(/_/g, "/");
	const padded = normalised + "=".repeat((4 - (normalised.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(new ArrayBuffer(binary.length));
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return bytes;
};

export const sealInviteLabel = async (text: string): Promise<string> => {
	const plaintext = new TextEncoder().encode(text);
	if (plaintext.byteLength > MAX_PLAINTEXT_BYTES) {
		throw new Error("Workspace name is too long for an invite label.");
	}
	const key = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		key,
		"AES-GCM",
		false,
		["encrypt"],
	);
	const ciphertext = new Uint8Array(
		await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext),
	);
	return [
		VERSION,
		toBase64Url(key),
		toBase64Url(iv),
		toBase64Url(ciphertext),
	].join(".");
};

export const openInviteLabel = async (
	label: string,
): Promise<string | null> => {
	try {
		const [version, keyPart, ivPart, cipherPart] = label.split(".");
		if (version !== VERSION || !keyPart || !ivPart || !cipherPart) return null;

		const cryptoKey = await crypto.subtle.importKey(
			"raw",
			fromBase64Url(keyPart),
			"AES-GCM",
			false,
			["decrypt"],
		);
		const plaintext = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: fromBase64Url(ivPart) },
			cryptoKey,
			fromBase64Url(cipherPart),
		);
		const text = new TextDecoder().decode(plaintext).trim();
		return text.length > 0 ? text : null;
	} catch {
		return null;
	}
};

export const readInviteLabelFromHash = (hash: string): string | null => {
	const raw = hash.startsWith("#") ? hash.slice(1) : hash;
	if (!raw) return null;
	if (raw.startsWith(`${VERSION}.`)) return raw;
	const params = new URLSearchParams(raw);
	return params.get("n");
};
