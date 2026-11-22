import { render, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateWorkspaceKey } from "./crypto";
import { clearDecryptionErrorsFor, decryptionErrors } from "./decryptionErrors";
import { PLAINTEXT_CAPS, sealEnvelope } from "./envelope";
import type { VaultApi } from "./VaultProvider";
import VaultProvider, { useVault } from "./VaultProvider";

const h = vi.hoisted(() => ({
	loadIdentity: vi.fn(),
	readDeviceRecord: vi.fn(),
	unlockWithDevice: vi.fn(),
	createIdentity: vi.fn(),
	rememberDevice: vi.fn(),
	forgetDevice: vi.fn(),
	regenerateRecoveryCode: vi.fn(),
	unlockIdentityWithRecoveryCode: vi.fn(),
	listWorkspaceKeyHolders: vi.fn(),
	listWorkspaceMemberIds: vi.fn(),
	readMemberPublicKeys: vi.fn(),
	readWorkspaceKeyById: vi.fn(),
	readActiveKeyId: vi.fn(),
	ensureUserContentKey: vi.fn(),
	createWorkspaceKey: vi.fn(),
	wrapForKey: vi.fn(),
	unwrapWrappedKey: vi.fn(),
	listDeviceLinkRequests: vi.fn(),
	listTrustedDevices: vi.fn(),
	createLinkRequest: vi.fn(),
	approveLinkRequest: vi.fn(),
	rejectLinkRequest: vi.fn(),
	consumeLinkRequest: vi.fn(),
	touchDevice: vi.fn(),
	assertRecoveryUnlocked: vi.fn(),
	recordRecoveryAttempt: vi.fn(),
	getActiveRotation: vi.fn(),
	getFailedRotation: vi.fn(),
	runRotation: vi.fn(),
	logSecurityEvent: vi.fn(),
	nonceFor: vi.fn(),
	clearNoncePool: vi.fn(),
	channel: vi.fn(),
	removeChannel: vi.fn(),
	supabaseFrom: vi.fn(),
	supabaseRpc: vi.fn(),
	handlers: [] as ((payload: unknown) => void)[],
}));

let currentUser: () => { id: string } | null;
let setCurrentUser: (user: { id: string }) => void;

vi.mock("#/features/auth/AuthContext", () => ({
	useAuth: () => ({ user: () => currentUser() }),
}));

vi.mock("#/utils/supabase", () => ({
	supabase: {
		channel: h.channel,
		removeChannel: h.removeChannel,
		from: h.supabaseFrom,
		rpc: h.supabaseRpc,
	},
}));

vi.mock("./vault", () => ({
	loadIdentity: h.loadIdentity,
	readDeviceRecord: h.readDeviceRecord,
	unlockWithDevice: h.unlockWithDevice,
	createIdentity: h.createIdentity,
	rememberDevice: h.rememberDevice,
	forgetDevice: h.forgetDevice,
	regenerateRecoveryCode: h.regenerateRecoveryCode,
	unlockIdentityWithRecoveryCode: h.unlockIdentityWithRecoveryCode,
	listWorkspaceKeyHolders: h.listWorkspaceKeyHolders,
	listWorkspaceMemberIds: h.listWorkspaceMemberIds,
	readMemberPublicKeys: h.readMemberPublicKeys,
	readWorkspaceKeyById: h.readWorkspaceKeyById,
	readActiveKeyId: h.readActiveKeyId,
	ensureUserContentKey: h.ensureUserContentKey,
	createWorkspaceKey: h.createWorkspaceKey,
	wrapForKey: h.wrapForKey,
	unwrapWrappedKey: h.unwrapWrappedKey,
	listDeviceLinkRequests: h.listDeviceLinkRequests,
	listTrustedDevices: h.listTrustedDevices,
	createLinkRequest: h.createLinkRequest,
	approveLinkRequest: h.approveLinkRequest,
	rejectLinkRequest: h.rejectLinkRequest,
	consumeLinkRequest: h.consumeLinkRequest,
	touchDevice: h.touchDevice,
}));

vi.mock("./deviceLabel", () => ({
	detectDeviceLabel: () => "Detected Test Device",
}));

vi.mock("./recovery", () => ({
	assertRecoveryUnlocked: h.assertRecoveryUnlocked,
	recordRecoveryAttempt: h.recordRecoveryAttempt,
}));

vi.mock("./rotation", () => ({
	getActiveRotation: h.getActiveRotation,
	getFailedRotation: h.getFailedRotation,
	runRotation: h.runRotation,
}));

vi.mock("./securityEvents", () => ({
	logSecurityEvent: h.logSecurityEvent,
}));

vi.mock("./nonces", () => ({
	nonceFor: h.nonceFor,
	clearNoncePool: h.clearNoncePool,
}));

const identity = {
	userId: "user-1",
	publicKey: "public-key",
	keyVersion: 1,
	recoveryKey: { iv: "iv", ct: "ct" },
};

const KEY_ID_UUID = "11111111-1111-4111-8111-111111111111";
const OLD_SEALED = `v3.${KEY_ID_UUID}.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA==`;

let api: VaultApi | null = null;

const Probe = () => {
	api = useVault();
	return <div>{api.status()}</div>;
};

const renderVault = () =>
	render(() => (
		<VaultProvider>
			<Probe />
		</VaultProvider>
	));

const makeQueryBuilder = () => {
	const builder: Record<string, unknown> = {};
	for (const method of [
		"select",
		"eq",
		"in",
		"update",
		"upsert",
		"order",
		"limit",
		"maybeSingle",
	]) {
		builder[method] = () => builder;
	}
	// biome-ignore lint/suspicious/noThenProperty: Supabase query builders are awaited as thenables.
	Object.defineProperty(builder, "then", {
		value: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
			Promise.resolve({ data: [], error: null }).then(resolve),
	});
	return builder;
};

beforeEach(() => {
	vi.clearAllMocks();
	api = null;
	h.handlers = [];
	clearDecryptionErrorsFor("ws-1");
	clearDecryptionErrorsFor("ws-2");
	const [user, setUser] = createSignal<{ id: string } | null>({ id: "user-1" });
	currentUser = user;
	setCurrentUser = setUser;

	h.loadIdentity.mockResolvedValue(null);
	h.readDeviceRecord.mockResolvedValue(null);
	h.unlockWithDevice.mockResolvedValue({} as CryptoKey);
	h.createIdentity.mockResolvedValue({
		identity,
		privateKey: {} as CryptoKey,
		recoveryCode: "RECOVERY-CODE",
	});
	h.rememberDevice.mockResolvedValue({ id: "device-1", key: {} as CryptoKey });
	h.forgetDevice.mockResolvedValue(undefined);
	h.regenerateRecoveryCode.mockResolvedValue("NEW-RECOVERY-CODE");
	h.unlockIdentityWithRecoveryCode.mockResolvedValue({} as CryptoKey);
	h.listWorkspaceKeyHolders.mockResolvedValue([]);
	h.listWorkspaceMemberIds.mockResolvedValue([]);
	h.readMemberPublicKeys.mockResolvedValue(new Map());
	h.readActiveKeyId.mockResolvedValue("key-1");
	h.readWorkspaceKeyById.mockResolvedValue({
		workspace_id: "ws-1",
		user_id: "user-1",
		key_id: "key-1",
		wrapped_key: {
			iv: "iv",
			ct: "ct",
			senderPublicKey: "public-key",
			keyId: "key-1",
		},
	});
	h.ensureUserContentKey.mockResolvedValue({
		keyId: "user-key-1",
		key: {} as CryptoKey,
	});
	h.createWorkspaceKey.mockResolvedValue({
		keyId: "key-1",
		rawKey: new Uint8Array(32),
		key: {} as CryptoKey,
	});
	h.unwrapWrappedKey.mockResolvedValue({
		rawKey: new Uint8Array(32),
		key: {} as CryptoKey,
	});
	h.listDeviceLinkRequests.mockResolvedValue([]);
	h.listTrustedDevices.mockResolvedValue([]);
	h.assertRecoveryUnlocked.mockResolvedValue(undefined);
	h.recordRecoveryAttempt.mockResolvedValue({
		failed_count: 0,
		locked_until: null,
	});
	h.getActiveRotation.mockResolvedValue(null);
	h.getFailedRotation.mockResolvedValue(null);
	h.runRotation.mockResolvedValue(undefined);
	h.logSecurityEvent.mockResolvedValue(undefined);
	h.touchDevice.mockResolvedValue(undefined);
	h.nonceFor.mockResolvedValue("AAAAAAAAAAAAAAAAAAAAAA==");
	h.clearNoncePool.mockImplementation(() => {});
	h.supabaseFrom.mockImplementation(makeQueryBuilder);
	h.supabaseRpc.mockResolvedValue({ data: null, error: null });
	h.removeChannel.mockResolvedValue(undefined);

	const channel = {
		on: (
			_event: string,
			_filter: unknown,
			handler: (payload: unknown) => void,
		) => {
			h.handlers.push(handler);
			return channel;
		},
		subscribe: () => channel,
	};
	h.channel.mockReturnValue(channel);
});

describe("VaultProvider", () => {
	it("sets up automatically on the first visit and exposes the recovery code", async () => {
		renderVault();
		await waitFor(() => expect(api?.hasDevice()).toBe(true));

		expect(h.createIdentity).toHaveBeenCalledTimes(1);
		expect(h.rememberDevice).toHaveBeenCalledTimes(1);
		expect(h.rememberDevice).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			"Detected Test Device",
		);
		expect(api?.pendingRecoveryCode()).toBe("RECOVERY-CODE");
		expect(api?.hasDevice()).toBe(true);
	});

	it("clears the recovery code after acknowledgement without recreating the identity", async () => {
		renderVault();
		await waitFor(() => expect(api?.status()).toBe("unlocked"));
		expect(api?.pendingRecoveryCode()).toBe("RECOVERY-CODE");

		api?.clearPendingRecoveryCode();

		expect(api?.pendingRecoveryCode()).toBeNull();
		expect(h.createIdentity).toHaveBeenCalledTimes(1);
	});

	it("leaves setup retryable when automatic setup fails", async () => {
		h.createIdentity.mockRejectedValueOnce(new Error("network down"));

		renderVault();

		await waitFor(() => expect(api?.status()).toBe("unconfigured"));
		expect(api?.error()).toBe("network down");
		expect(api?.pendingRecoveryCode()).toBeNull();
	});

	it("auto-unlocks when a registered device is available", async () => {
		h.loadIdentity.mockResolvedValue(identity);
		h.readDeviceRecord.mockResolvedValue({
			id: "device-1",
			key: {} as CryptoKey,
		});

		renderVault();

		await waitFor(() => expect(api?.status()).toBe("unlocked"));
		expect(h.unlockWithDevice).toHaveBeenCalledWith(
			identity,
			expect.anything(),
		);
	});

	it("touches the approving device before approving a link", async () => {
		h.loadIdentity.mockResolvedValue(identity);
		h.readDeviceRecord.mockResolvedValue({
			id: "device-1",
			key: {} as CryptoKey,
		});

		renderVault();
		await waitFor(() => expect(api?.status()).toBe("unlocked"));

		await api?.approveLink("request-1");

		expect(h.touchDevice).toHaveBeenCalledWith("device-1");
		expect(h.approveLinkRequest).toHaveBeenCalledWith(
			"request-1",
			expect.anything(),
			"device-1",
		);
		expect(h.touchDevice.mock.invocationCallOrder[0]).toBeLessThan(
			h.approveLinkRequest.mock.invocationCallOrder[0],
		);
	});

	it("refuses to untrust the current device", async () => {
		h.loadIdentity.mockResolvedValue(identity);
		h.readDeviceRecord.mockResolvedValue({
			id: "device-1",
			key: {} as CryptoKey,
		});

		renderVault();
		await waitFor(() => expect(api?.status()).toBe("unlocked"));

		await expect(api?.forgetDevice("device-1")).rejects.toThrow(
			"You cannot untrust this device",
		);
		expect(h.forgetDevice).not.toHaveBeenCalled();
	});

	it("forgets only the selected device and refreshes the trusted list", async () => {
		h.loadIdentity.mockResolvedValue(identity);
		h.readDeviceRecord.mockResolvedValue({
			id: "device-1",
			key: {} as CryptoKey,
		});

		renderVault();
		await waitFor(() => expect(api?.status()).toBe("unlocked"));
		h.listTrustedDevices.mockClear();

		await api?.forgetDevice("device-2");

		expect(h.forgetDevice).toHaveBeenCalledWith("device-2", "device-1");
		expect(h.listTrustedDevices).toHaveBeenCalled();
	});

	it("asks for a recovery code when an identity exists but the device is gone", async () => {
		h.loadIdentity.mockResolvedValue(identity);

		renderVault();

		await waitFor(() => expect(api?.status()).toBe("locked"));
		expect(h.unlockWithDevice).not.toHaveBeenCalled();
	});

	it("enrolls the current device after a recovery code unlock and records the attempt", async () => {
		h.loadIdentity.mockResolvedValue(identity);

		renderVault();
		await waitFor(() => expect(api?.status()).toBe("locked"));

		await api?.unlockWithRecoveryCode("RECOVERY-CODE");

		expect(h.assertRecoveryUnlocked).toHaveBeenCalled();
		expect(h.recordRecoveryAttempt).toHaveBeenCalledWith(true);
		expect(h.unlockIdentityWithRecoveryCode).toHaveBeenCalledWith(
			identity,
			"RECOVERY-CODE",
		);
		expect(h.rememberDevice).toHaveBeenCalledWith(
			identity,
			expect.anything(),
			"Detected Test Device",
		);
		expect(api?.hasDevice()).toBe(true);
		expect(api?.status()).toBe("unlocked");
	});

	it("records a failed recovery attempt and logs only an error code", async () => {
		h.loadIdentity.mockResolvedValue(identity);
		h.unlockIdentityWithRecoveryCode.mockRejectedValueOnce(
			new Error("Incorrect recovery code"),
		);

		renderVault();
		await waitFor(() => expect(api?.status()).toBe("locked"));

		await expect(api?.unlockWithRecoveryCode("WRONG")).rejects.toThrow(
			"Incorrect recovery code",
		);

		expect(h.recordRecoveryAttempt).toHaveBeenCalledWith(false);
		expect(h.logSecurityEvent).toHaveBeenCalledWith("recovery.unlock_failed", {
			error_code: "invalid_code",
		});
	});

	it("keeps the vault unlocked when device enrollment after recovery fails", async () => {
		h.loadIdentity.mockResolvedValue(identity);
		h.rememberDevice.mockRejectedValueOnce(new Error("storage unavailable"));

		renderVault();
		await waitFor(() => expect(api?.status()).toBe("locked"));

		await api?.unlockWithRecoveryCode("RECOVERY-CODE");

		expect(api?.status()).toBe("unlocked");
		expect(api?.hasDevice()).toBe(false);
	});

	it("locks the vault so the workspace is gated again", async () => {
		h.loadIdentity.mockResolvedValue(identity);
		h.readDeviceRecord.mockResolvedValue({
			id: "device-1",
			key: {} as CryptoKey,
		});

		renderVault();
		await waitFor(() => expect(api?.status()).toBe("unlocked"));

		api?.lock();

		expect(api?.status()).toBe("locked");
	});

	it("retries a missing workspace key when realtime delivers it", async () => {
		renderVault();
		await waitFor(() => expect(api?.status()).toBe("unlocked"));

		h.readWorkspaceKeyById.mockResolvedValueOnce(null);
		h.listWorkspaceKeyHolders.mockResolvedValueOnce(["another-user"]);
		expect(await api?.ensureWorkspaceKey("ws-1")).toBe(false);
		expect(api?.missingKeys()).toContain("ws-1");

		h.readWorkspaceKeyById.mockResolvedValue({
			workspace_id: "ws-1",
			user_id: "user-1",
			key_id: "key-1",
			wrapped_key: {
				iv: "iv",
				ct: "ct",
				senderPublicKey: "public-key",
				keyId: "key-1",
			},
		});
		h.handlers[0]?.({ new: { workspace_id: "ws-1", key_id: "key-1" } });

		await waitFor(() => expect(api?.missingKeys()).not.toContain("ws-1"));
	});

	it("rejects a ciphertext whose key belongs to another workspace", async () => {
		renderVault();
		await waitFor(() => expect(api?.status()).toBe("unlocked"));

		h.readActiveKeyId.mockResolvedValue(KEY_ID_UUID);
		h.readWorkspaceKeyById.mockResolvedValue({
			workspace_id: "ws-2",
			user_id: "user-1",
			key_id: KEY_ID_UUID,
			wrapped_key: {
				iv: "iv",
				ct: "ct",
				senderPublicKey: "public-key",
				keyId: KEY_ID_UUID,
			},
		});

		await expect(api?.openBinary("ws-1", OLD_SEALED, "aad")).rejects.toThrow(
			"different workspace",
		);
		expect(decryptionErrors().get("ws-1:key")).toContain("different workspace");
	});

	it("allows reads with the old key while a rotation is active", async () => {
		const oldKey = await generateWorkspaceKey();
		const sealed = await sealEnvelope(
			KEY_ID_UUID,
			oldKey,
			new TextEncoder().encode("old content"),
			"aad",
			PLAINTEXT_CAPS.short,
		);

		renderVault();
		await waitFor(() => expect(api?.status()).toBe("unlocked"));

		h.readActiveKeyId.mockResolvedValue("new-key");
		h.readWorkspaceKeyById.mockResolvedValue({
			workspace_id: "ws-1",
			user_id: "user-1",
			key_id: KEY_ID_UUID,
			wrapped_key: {
				iv: "iv",
				ct: "ct",
				senderPublicKey: "public-key",
				keyId: KEY_ID_UUID,
			},
		});
		h.unwrapWrappedKey.mockResolvedValue({
			rawKey: new Uint8Array(32),
			key: oldKey,
		});
		h.getActiveRotation.mockResolvedValue({
			id: "rotation-1",
			workspace_id: "ws-1",
			from_key_id: KEY_ID_UUID,
			to_key_id: "new-key",
			status: "running",
			processed_count: 0,
			last_record_key: null,
			total_count: 1,
			error_code: null,
		});

		const opened = await api?.openBinary("ws-1", sealed, "aad");
		expect(new TextDecoder().decode(opened ?? new Uint8Array())).toBe(
			"old content",
		);
	});

	it("does not reset on a token refresh that returns the same user id", async () => {
		h.loadIdentity.mockResolvedValue(identity);
		h.readDeviceRecord.mockResolvedValue({
			id: "device-1",
			key: {} as CryptoKey,
		});

		renderVault();
		await waitFor(() => expect(api?.status()).toBe("unlocked"));
		const epochBefore = api?.epoch();
		expect(h.loadIdentity).toHaveBeenCalledTimes(1);

		setCurrentUser({ id: "user-1" });

		expect(api?.status()).toBe("unlocked");
		expect(api?.epoch()).toBe(epochBefore);
		expect(h.loadIdentity).toHaveBeenCalledTimes(1);
	});
});
