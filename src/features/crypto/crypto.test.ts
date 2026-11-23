import { describe, expect, it } from "vitest";
import { aadFor } from "./aad";
import {
	deriveSharedWrappingKey,
	exportIdentityPrivateKey,
	exportIdentityPublicKey,
	exportWorkspaceKey,
	generateDeviceKey,
	generateIdentityKeyPair,
	generateRecoveryCode,
	generateWorkspaceKey,
	importIdentityPublicKey,
	importWorkspaceKey,
	protectPrivateKeyForDevice,
	protectPrivateKeyWithCode,
	restorePrivateKeyFromDevice,
	restorePrivateKeyWithCode,
	toBase64,
} from "./crypto";
import {
	openEnvelope,
	PLAINTEXT_CAPS,
	parseEnvelope,
	sealEnvelope,
} from "./envelope";
import { VaultDecryptionError } from "./errors";
import { sealInviteLabel } from "./inviteLabel";

const KEY_ID = "11111111-1111-4111-8111-111111111111";
const AAD = aadFor({ kind: "page", pageId: KEY_ID });

const makeIdentity = async () => {
	const pair = await generateIdentityKeyPair();
	return {
		publicKey: await exportIdentityPublicKey(pair.publicKey),
		privateKey: pair.privateKey,
	};
};

describe("v3 envelopes", () => {
	it("round-trips text and binary payloads", async () => {
		const key = await generateWorkspaceKey();
		const text = "Bank: 1234 · PIN: 0000 ✅";

		const sealed = await sealEnvelope(
			KEY_ID,
			key,
			new TextEncoder().encode(text),
			AAD,
			PLAINTEXT_CAPS.page,
		);
		expect(sealed.startsWith(`v3.${KEY_ID}.`)).toBe(true);
		expect(sealed).not.toContain("Bank");

		const opened = await openEnvelope(sealed, key, AAD);
		expect(new TextDecoder().decode(opened)).toBe(text);
	});

	it("fails on a different key", async () => {
		const sealed = await sealEnvelope(
			KEY_ID,
			await generateWorkspaceKey(),
			new TextEncoder().encode("secret"),
			AAD,
			PLAINTEXT_CAPS.short,
		);
		await expect(
			openEnvelope(sealed, await generateWorkspaceKey(), AAD),
		).rejects.toThrow(VaultDecryptionError);
	});

	it("fails when the ciphertext is tampered with", async () => {
		const key = await generateWorkspaceKey();
		const sealed = await sealEnvelope(
			KEY_ID,
			key,
			new TextEncoder().encode("secret"),
			AAD,
			PLAINTEXT_CAPS.short,
		);
		const parts = sealed.split(".");
		const bytes = Uint8Array.from(atob(parts[3]), (char) => char.charCodeAt(0));
		bytes[0] ^= 0xff;
		parts[3] = toBase64(bytes);

		await expect(openEnvelope(parts.join("."), key, AAD)).rejects.toThrow(
			VaultDecryptionError,
		);
	});

	it("refuses to open ciphertext moved to another row", async () => {
		const key = await generateWorkspaceKey();
		const sealed = await sealEnvelope(
			KEY_ID,
			key,
			new TextEncoder().encode("secret"),
			AAD,
			PLAINTEXT_CAPS.short,
		);

		await expect(
			openEnvelope(
				sealed,
				key,
				aadFor({
					kind: "page",
					pageId: "22222222-2222-4222-8222-222222222222",
				}),
			),
		).rejects.toThrow(VaultDecryptionError);
	});

	it("rejects old and malformed envelopes", async () => {
		const key = await generateWorkspaceKey();
		await expect(openEnvelope("v2.aaaa.bbbb", key, AAD)).rejects.toThrow(
			VaultDecryptionError,
		);
		await expect(
			openEnvelope(
				`v3.${KEY_ID}.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA==`,
				key,
				AAD,
			),
		).rejects.toThrow(VaultDecryptionError);
	});

	it("enforces plaintext caps before sealing", async () => {
		const key = await generateWorkspaceKey();
		const bytes = new Uint8Array(PLAINTEXT_CAPS.short + 1);
		await expect(
			sealEnvelope(KEY_ID, key, bytes, AAD, PLAINTEXT_CAPS.short),
		).rejects.toThrow("Content is too large to encrypt");
	});

	it("parses the key id from the envelope", async () => {
		const key = await generateWorkspaceKey();
		const sealed = await sealEnvelope(
			KEY_ID,
			key,
			new TextEncoder().encode("secret"),
			AAD,
			PLAINTEXT_CAPS.short,
		);
		expect(parseEnvelope(sealed).keyId).toBe(KEY_ID);
	});
});

describe("recovery code", () => {
	it("round-trips through a human-transcribable code", async () => {
		const identity = await makeIdentity();
		const pkcs8 = await exportIdentityPrivateKey(identity.privateKey);
		const code = generateRecoveryCode();

		expect(code.replace(/-/g, "")).toHaveLength(32);

		const sealed = await protectPrivateKeyWithCode(
			code,
			"user-1",
			pkcs8,
			"user_keys:user-1:recovery",
		);
		const restored = await restorePrivateKeyWithCode(
			code.toLowerCase(),
			"user-1",
			sealed,
			"user_keys:user-1:recovery",
		);

		expect(await exportIdentityPrivateKey(restored)).toBe(pkcs8);
	});

	it("rejects a different code", async () => {
		const identity = await makeIdentity();
		const sealed = await protectPrivateKeyWithCode(
			generateRecoveryCode(),
			"user-1",
			await exportIdentityPrivateKey(identity.privateKey),
			"aad",
		);

		await expect(
			restorePrivateKeyWithCode(
				generateRecoveryCode(),
				"user-1",
				sealed,
				"aad",
			),
		).rejects.toThrow("Incorrect recovery code");
	});
});

describe("device key", () => {
	it("unlocks with a non-extractable device key", async () => {
		const identity = await makeIdentity();
		const pkcs8 = await exportIdentityPrivateKey(identity.privateKey);
		const deviceKey = await generateDeviceKey();
		const sealed = await protectPrivateKeyForDevice(deviceKey, pkcs8, "device");

		const restored = await restorePrivateKeyFromDevice(
			deviceKey,
			sealed,
			"device",
		);
		expect(await exportIdentityPrivateKey(restored)).toBe(pkcs8);

		const attacker = await generateDeviceKey();
		await expect(
			restorePrivateKeyFromDevice(attacker, sealed, "device"),
		).rejects.toThrow("This device cannot unlock the vault any more");
	});
});

describe("invite label", () => {
	it("caps the plaintext before sealing", async () => {
		await expect(sealInviteLabel("x".repeat(513))).rejects.toThrow("too long");
	});
});

describe("workspace key wrapping", () => {
	it("round-trips a raw key between members", async () => {
		const alice = await makeIdentity();
		const bob = await makeIdentity();
		const raw = await exportWorkspaceKey(await generateWorkspaceKey());
		const aad = aadFor({
			kind: "workspace-key",
			workspaceId: "ws",
			userId: "bob",
			keyId: KEY_ID,
		});

		const shared = await deriveSharedWrappingKey(
			alice.privateKey,
			await importIdentityPublicKey(bob.publicKey),
		);
		const wrapped = await sealEnvelope(
			KEY_ID,
			shared,
			raw,
			aad,
			PLAINTEXT_CAPS.short,
		);

		const bobShared = await deriveSharedWrappingKey(
			bob.privateKey,
			await importIdentityPublicKey(alice.publicKey),
		);
		const unwrapped = await openEnvelope(wrapped, bobShared, aad);

		expect(
			await exportWorkspaceKey(await importWorkspaceKey(unwrapped)),
		).toEqual(raw);
	});
});
