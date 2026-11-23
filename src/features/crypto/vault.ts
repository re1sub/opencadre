import type { Json } from "#/types/database";
import { supabase } from "#/utils/supabase";
import { aadFor } from "./aad";
import {
	decryptBytes,
	deriveSharedWrappingKey,
	encryptBytes,
	exportIdentityPrivateKey,
	exportIdentityPublicKey,
	exportWorkspaceKey,
	generateDeviceKey,
	generateIdentityKeyPair,
	generateRecoveryCode,
	generateWorkspaceKey,
	hashOneTimePublicKey,
	importIdentityPrivateKey,
	importIdentityPublicKey,
	importWorkspaceKey,
	type SealedBytes,
	type WrappedDataKey,
} from "./crypto";

export interface VaultIdentity {
	userId: string;
	publicKey: string;
	keyVersion: number;
	recoveryKey: SealedBytes;
}

export interface WorkspaceKeyRow {
	workspace_id: string;
	user_id: string;
	key_id: string;
	wrapped_key: WrappedDataKey;
}

export interface UserContentKeyRow {
	key_id: string;
	wrapped_key: SealedBytes;
}

export interface DeviceRecord {
	id: string;
	key: CryptoKey;
	label?: string;
}

export interface DeviceLink {
	requestId: string;
	publicKey: string;
	publicKeyHash: string;
	privateKey: CryptoKey;
}

export const identityAad = (userId: string) =>
	aadFor({ kind: "identity", userId });
export const recoveryAad = (userId: string) =>
	aadFor({ kind: "recovery", userId });
export const deviceAad = (userId: string, deviceId: string) =>
	aadFor({ kind: "device", userId, deviceId });
export const workspaceKeyAad = (
	workspaceId: string,
	userId: string,
	keyId: string,
) => aadFor({ kind: "workspace-key", workspaceId, userId, keyId });
export const pageAad = (pageId: string) => aadFor({ kind: "page", pageId });
export const pageTitleAad = (pageId: string) =>
	aadFor({ kind: "page-title", pageId });
export const commentAad = (commentId: string) =>
	aadFor({ kind: "comment", commentId });
export const tagAad = (tagId: string) => aadFor({ kind: "tag", tagId });
export const workspaceFieldAad = (workspaceId: string, field: string) =>
	aadFor({ kind: "workspace", workspaceId, field });
export const notificationAad = (
	workspaceId: string,
	commentId: string,
	field: string,
) => aadFor({ kind: "notification", workspaceId, commentId, field });
export const ydocAad = (entityType: string, entityId: string) =>
	aadFor({ kind: "ydoc", entityType, entityId });
export const cardAad = (cardId: string) => aadFor({ kind: "card", cardId });
export const columnAad = (columnId: string) =>
	aadFor({ kind: "column", columnId });

const asJson = (value: unknown): NonNullable<Json> =>
	value as NonNullable<Json>;

const requireUserId = async (): Promise<string> => {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");
	return user.id;
};

export async function loadIdentity(): Promise<VaultIdentity | null> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;

	const { data, error } = await supabase
		.from("user_keys")
		.select("public_key, recovery_wrapped_key, key_version")
		.eq("user_id", user.id)
		.maybeSingle();
	if (error) throw error;
	if (!data) return null;

	return {
		userId: user.id,
		publicKey: data.public_key,
		keyVersion: data.key_version,
		recoveryKey: data.recovery_wrapped_key as unknown as SealedBytes,
	};
}

export async function createIdentity(): Promise<{
	identity: VaultIdentity;
	privateKey: CryptoKey;
	recoveryCode: string;
}> {
	const userId = await requireUserId();
	const existing = await loadIdentity();
	if (existing)
		throw new Error("Encryption is already set up for this account");

	const pair = await generateIdentityKeyPair();
	const publicKey = await exportIdentityPublicKey(pair.publicKey);
	const pkcs8 = await exportIdentityPrivateKey(pair.privateKey);

	const recoveryCode = generateRecoveryCode();
	const recoveryKey = await protectRecovery(recoveryCode, userId, pkcs8);
	const reopened = await unlockWithRecovery(recoveryCode, userId, recoveryKey);
	if ((await exportIdentityPrivateKey(reopened)) !== pkcs8) {
		throw new Error("Recovery code verification failed");
	}

	const { error } = await supabase.from("user_keys").insert({
		user_id: userId,
		public_key: publicKey,
		recovery_wrapped_key: asJson(recoveryKey),
		key_version: 1,
	});
	if (error) throw error;

	const identity: VaultIdentity = {
		userId,
		publicKey,
		keyVersion: 1,
		recoveryKey,
	};

	await ensureUserContentKey(identity, pair.privateKey);

	return { identity, privateKey: pair.privateKey, recoveryCode };
}

const protectRecovery = (
	code: string,
	userId: string,
	pkcs8: string,
): Promise<SealedBytes> =>
	import("./crypto").then(({ protectPrivateKeyWithCode }) =>
		protectPrivateKeyWithCode(
			code,
			userId,
			pkcs8,
			aadFor({ kind: "recovery", userId }),
		),
	);

const unlockWithRecovery = (
	code: string,
	userId: string,
	sealed: SealedBytes,
): Promise<CryptoKey> =>
	import("./crypto").then(({ restorePrivateKeyWithCode }) =>
		restorePrivateKeyWithCode(
			code,
			userId,
			sealed,
			aadFor({ kind: "recovery", userId }),
		),
	);

export async function unlockIdentityWithRecoveryCode(
	identity: VaultIdentity,
	code: string,
): Promise<CryptoKey> {
	return unlockWithRecovery(code, identity.userId, identity.recoveryKey);
}

export async function regenerateRecoveryCode(
	identity: VaultIdentity,
	privateKey: CryptoKey,
): Promise<string> {
	const pkcs8 = await exportIdentityPrivateKey(privateKey);
	const code = generateRecoveryCode();
	const sealed = await protectRecovery(code, identity.userId, pkcs8);
	const reopened = await unlockWithRecovery(code, identity.userId, sealed);
	if ((await exportIdentityPrivateKey(reopened)) !== pkcs8) {
		throw new Error("Recovery code verification failed");
	}

	const { error } = await supabase
		.from("user_keys")
		.update({ recovery_wrapped_key: asJson(sealed) })
		.eq("user_id", identity.userId);
	if (error) throw error;
	identity.recoveryKey = sealed;
	return code;
}

const DEVICE_DB = "opencadre-vault";
const DEVICE_STORE = "device";

const openDeviceDb = (): Promise<IDBDatabase | null> =>
	new Promise((resolve) => {
		if (typeof indexedDB === "undefined") {
			resolve(null);
			return;
		}
		const request = indexedDB.open(DEVICE_DB, 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(DEVICE_STORE)) {
				db.createObjectStore(DEVICE_STORE);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => resolve(null);
	});

export async function readDeviceRecord(): Promise<DeviceRecord | null> {
	try {
		const db = await openDeviceDb();
		if (!db) return null;
		const record = await new Promise<DeviceRecord | null>((resolve) => {
			const tx = db.transaction(DEVICE_STORE, "readonly");
			const request = tx.objectStore(DEVICE_STORE).get("device");
			request.onsuccess = () =>
				resolve((request.result as DeviceRecord) ?? null);
			request.onerror = () => resolve(null);
		});
		db.close();
		return record?.id && record.key ? record : null;
	} catch {
		return null;
	}
}

const writeDeviceRecord = async (record: DeviceRecord): Promise<void> => {
	const db = await openDeviceDb();
	if (!db) return;
	await new Promise<void>((resolve) => {
		const tx = db.transaction(DEVICE_STORE, "readwrite");
		tx.objectStore(DEVICE_STORE).put(record, "device");
		tx.oncomplete = () => resolve();
		tx.onerror = () => resolve();
	});
	db.close();
};

export async function rememberDevice(
	identity: VaultIdentity,
	privateKey: CryptoKey,
	label = "This device",
): Promise<DeviceRecord> {
	const deviceId = crypto.randomUUID();
	const deviceKey = await generateDeviceKey();
	const pkcs8 = await exportIdentityPrivateKey(privateKey);
	const sealed = await encryptBytes(
		deviceKey,
		new TextEncoder().encode(pkcs8),
		aadFor({ kind: "device", userId: identity.userId, deviceId }),
	);

	const { error } = await supabase.from("user_devices").insert({
		id: deviceId,
		user_id: identity.userId,
		wrapped_private_key: asJson(sealed),
		identity_key_version: identity.keyVersion,
		device_label: label,
		status: "active",
		last_used_at: new Date().toISOString(),
	});
	if (error) throw error;

	const record: DeviceRecord = { id: deviceId, key: deviceKey, label };
	await writeDeviceRecord(record);
	return record;
}

export async function unlockWithDevice(
	identity: VaultIdentity,
	record: DeviceRecord,
): Promise<CryptoKey> {
	const { data, error } = await supabase
		.from("user_devices")
		.select("wrapped_private_key, status")
		.eq("id", record.id)
		.maybeSingle();
	if (error) throw error;
	if (data?.status !== "active") {
		throw new Error("This device is no longer registered");
	}

	const key = await decryptBytes(
		record.key,
		data.wrapped_private_key as unknown as SealedBytes,
		aadFor({ kind: "device", userId: identity.userId, deviceId: record.id }),
	).then((bytes) => importIdentityPrivateKey(new TextDecoder().decode(bytes)));

	void touchDevice(record.id).catch(() => {});

	return key;
}

export async function touchDevice(deviceId: string): Promise<void> {
	const { error } = await supabase
		.from("user_devices")
		.update({ last_used_at: new Date().toISOString() })
		.eq("id", deviceId);
	if (error) throw error;
}

export async function forgetDevice(
	deviceId: string,
	currentDeviceId: string,
): Promise<void> {
	if (!deviceId) throw new Error("No device was selected");
	if (deviceId === currentDeviceId) {
		throw new Error("You cannot untrust this device");
	}

	const { data, error } = await supabase
		.from("user_devices")
		.delete()
		.eq("id", deviceId)
		.neq("id", currentDeviceId)
		.select("id");
	if (error) throw error;
	if (!data || data.length === 0) {
		throw new Error("That device is no longer trusted");
	}
}

export async function readMyWorkspaceKeys(
	workspaceId: string,
): Promise<WorkspaceKeyRow[]> {
	const userId = await requireUserId();
	const { data, error } = await supabase
		.from("workspace_keys")
		.select("workspace_id, user_id, key_id, wrapped_key")
		.eq("workspace_id", workspaceId)
		.eq("user_id", userId);
	if (error) throw error;
	return (data ?? []) as unknown as WorkspaceKeyRow[];
}

export async function readWorkspaceKeyById(
	keyId: string,
): Promise<WorkspaceKeyRow | null> {
	const userId = await requireUserId();
	const { data, error } = await supabase
		.from("workspace_keys")
		.select("workspace_id, user_id, key_id, wrapped_key")
		.eq("user_id", userId)
		.eq("key_id", keyId)
		.maybeSingle();
	if (error) throw error;
	return data ? (data as unknown as WorkspaceKeyRow) : null;
}

export async function readActiveKeyId(
	workspaceId: string,
): Promise<string | null> {
	const { data, error } = await supabase
		.from("content_keys")
		.select("id")
		.eq("workspace_id", workspaceId)
		.eq("status", "active")
		.maybeSingle();
	if (error) throw error;
	return data?.id ?? null;
}

export async function listWorkspaceKeyHolders(
	workspaceId: string,
): Promise<string[]> {
	const { data, error } = await supabase
		.from("workspace_keys")
		.select("user_id")
		.eq("workspace_id", workspaceId);
	if (error) throw error;
	return (data ?? []).map((row) => row.user_id);
}

export async function listWorkspaceMemberIds(
	workspaceId: string,
): Promise<string[]> {
	const { data, error } = await supabase
		.from("workspace_members")
		.select("user_id")
		.eq("workspace_id", workspaceId);
	if (error) throw error;
	return (data ?? [])
		.map((row) => row.user_id)
		.filter((id): id is string => Boolean(id));
}

export async function readMemberPublicKeys(
	workspaceId: string,
): Promise<Map<string, string>> {
	const keys = new Map<string, string>();
	const { data, error } = await supabase.rpc("workspace_member_public_keys", {
		p_workspace_id: workspaceId,
	});
	if (error) throw error;
	for (const row of data ?? []) keys.set(row.user_id, row.public_key);
	return keys;
}

export async function upsertWorkspaceKeys(
	rows: WorkspaceKeyRow[],
): Promise<void> {
	if (rows.length === 0) return;
	const { error } = await supabase.from("workspace_keys").upsert(
		rows.map((row) => ({ ...row, wrapped_key: asJson(row.wrapped_key) })),
		{ onConflict: "workspace_id,user_id,key_id", ignoreDuplicates: true },
	);
	if (error) throw error;
}

export async function wrapForKey(
	rawKey: Uint8Array,
	recipientPublicKey: string,
	myPrivateKey: CryptoKey,
	myPublicKey: string,
	workspaceId: string,
	userId: string,
	keyId: string,
): Promise<WrappedDataKey> {
	const shared = await deriveSharedWrappingKey(
		myPrivateKey,
		await importIdentityPublicKey(recipientPublicKey),
	);
	const sealed = await encryptBytes(
		shared,
		rawKey,
		aadFor({ kind: "workspace-key", workspaceId, userId, keyId }),
	);
	return { ...sealed, senderPublicKey: myPublicKey, keyId };
}

export async function unwrapWrappedKey(
	wrapped: WrappedDataKey,
	myPrivateKey: CryptoKey,
	workspaceId: string,
	userId: string,
): Promise<{ rawKey: Uint8Array; key: CryptoKey }> {
	const shared = await deriveSharedWrappingKey(
		myPrivateKey,
		await importIdentityPublicKey(wrapped.senderPublicKey),
	);
	const rawKey = await decryptBytes(
		shared,
		wrapped,
		aadFor({
			kind: "workspace-key",
			workspaceId,
			userId,
			keyId: wrapped.keyId,
		}),
	);
	return { rawKey, key: await importWorkspaceKey(rawKey) };
}

export async function createWorkspaceKey(
	workspaceId: string,
	myPrivateKey: CryptoKey,
	myPublicKey: string,
	myUserId: string,
): Promise<{ keyId: string; rawKey: Uint8Array; key: CryptoKey }> {
	const keyId = crypto.randomUUID();
	const key = await generateWorkspaceKey();
	const rawKey = await exportWorkspaceKey(key);
	const wrapped = await wrapForKey(
		rawKey,
		myPublicKey,
		myPrivateKey,
		myPublicKey,
		workspaceId,
		myUserId,
		keyId,
	);

	const { error } = await supabase.from("content_keys").insert({
		id: keyId,
		workspace_id: workspaceId,
		status: "active",
	});
	if (error) throw error;

	await upsertWorkspaceKeys([
		{
			workspace_id: workspaceId,
			user_id: myUserId,
			key_id: keyId,
			wrapped_key: wrapped,
		},
	]);
	return { keyId, rawKey, key };
}

export async function readMyUserContentKeys(): Promise<UserContentKeyRow[]> {
	const userId = await requireUserId();
	const { data, error } = await supabase
		.from("user_content_key_wraps")
		.select("key_id, wrapped_key")
		.eq("user_id", userId);
	if (error) throw error;
	return (data ?? []) as unknown as UserContentKeyRow[];
}

const identityToContentKey = async (
	identity: VaultIdentity,
	privateKey: CryptoKey,
): Promise<CryptoKey> =>
	deriveSharedWrappingKey(
		privateKey,
		await importIdentityPublicKey(identity.publicKey),
	);

export async function ensureUserContentKey(
	identity: VaultIdentity,
	privateKey: CryptoKey,
): Promise<{ keyId: string; key: CryptoKey }> {
	const wrappingKey = await identityToContentKey(identity, privateKey);
	const existing = await readMyUserContentKeys();
	if (existing.length > 0) {
		const row = existing[0];
		const raw = await decryptBytes(
			wrappingKey,
			row.wrapped_key,
			aadFor({
				kind: "user-content-key",
				userId: identity.userId,
				keyId: row.key_id,
			}),
		);
		return { keyId: row.key_id, key: await importWorkspaceKey(raw) };
	}

	const keyId = crypto.randomUUID();
	const key = await generateWorkspaceKey();
	const raw = await exportWorkspaceKey(key);
	const sealed = await encryptBytes(
		wrappingKey,
		raw,
		aadFor({
			kind: "user-content-key",
			userId: identity.userId,
			keyId,
		}),
	);
	const { error } = await supabase.from("user_content_keys").insert({
		id: keyId,
		user_id: identity.userId,
		status: "active",
	});
	if (error) throw error;
	const { error: wrapError } = await supabase
		.from("user_content_key_wraps")
		.insert({
			user_id: identity.userId,
			key_id: keyId,
			wrapped_key: asJson(sealed),
		});
	if (wrapError) throw wrapError;
	return { keyId, key };
}

const pendingOneTimeKeys = new Map<string, CryptoKey>();
const ONE_TIME_KEY_PREFIX = "opencadre:device-link:";

const oneTimeKeyStorageKey = (requestId: string) =>
	`${ONE_TIME_KEY_PREFIX}${requestId}`;

// Requests started in this browser session keep their one-time key in
// sessionStorage. On reload the gate uses these ids to adopt the pending
// request instead of creating a duplicate one.
export function localLinkRequestIds(): string[] {
	const ids: string[] = [];
	for (let index = 0; index < sessionStorage.length; index += 1) {
		const key = sessionStorage.key(index);
		if (key?.startsWith(ONE_TIME_KEY_PREFIX)) {
			ids.push(key.slice(ONE_TIME_KEY_PREFIX.length));
		}
	}
	return ids;
}

export async function createLinkRequest(
	deviceLabel: string,
	targetDeviceId?: string | null,
): Promise<DeviceLink> {
	const pair = await generateIdentityKeyPair();
	const publicKey = await exportIdentityPublicKey(pair.publicKey);
	const publicKeyHash = await hashOneTimePublicKey(publicKey);
	const { data, error } = await supabase.rpc("create_device_link_request", {
		p_device_label: deviceLabel,
		p_one_time_public_key: publicKey,
		p_target_device_id: targetDeviceId ?? undefined,
	});
	if (error) throw error;
	const requestId = data as string;
	pendingOneTimeKeys.set(requestId, pair.privateKey);
	sessionStorage.setItem(
		oneTimeKeyStorageKey(requestId),
		await exportIdentityPrivateKey(pair.privateKey),
	);
	return { requestId, publicKey, publicKeyHash, privateKey: pair.privateKey };
}

export async function approveLinkRequest(
	requestId: string,
	privateKey: CryptoKey,
	approvingDeviceId: string,
): Promise<void> {
	const { data, error } = await supabase
		.from("device_link_requests")
		.select("one_time_public_key, status, expires_at")
		.eq("id", requestId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new Error("Device link request not found");
	if (data.status !== "pending" || new Date(data.expires_at) <= new Date()) {
		throw new Error("Device link request is no longer pending");
	}
	if (!data.one_time_public_key) throw new Error("Invalid device link request");

	const publicKeyHash = await hashOneTimePublicKey(data.one_time_public_key);
	const shared = await deriveSharedWrappingKey(
		privateKey,
		await importIdentityPublicKey(data.one_time_public_key),
	);
	const sealed = await encryptBytes(
		shared,
		new TextEncoder().encode(await exportIdentityPrivateKey(privateKey)),
		aadFor({ kind: "device-link", requestId, publicKeyHash }),
	);
	const { error: approveError } = await supabase.rpc("approve_device_link", {
		p_request_id: requestId,
		p_wrapped_private_key: asJson(sealed),
		p_approving_device_id: approvingDeviceId,
	});
	if (approveError) throw approveError;
}

export async function rejectLinkRequest(requestId: string): Promise<void> {
	const { error } = await supabase.rpc("reject_device_link", {
		p_request_id: requestId,
	});
	if (error) throw error;
}

export async function consumeLinkRequest(
	requestId: string,
	identity: VaultIdentity,
): Promise<DeviceRecord> {
	let oneTime = pendingOneTimeKeys.get(requestId);
	if (!oneTime) {
		const stored = sessionStorage.getItem(oneTimeKeyStorageKey(requestId));
		if (!stored) throw new Error("Start the device link on this device first");
		oneTime = await importIdentityPrivateKey(stored);
		pendingOneTimeKeys.set(requestId, oneTime);
	}

	const { data, error } = await supabase
		.from("device_link_requests")
		.select(
			"one_time_public_key, wrapped_private_key, status, expires_at, device_label",
		)
		.eq("id", requestId)
		.maybeSingle();
	if (error) throw error;
	if (data?.status !== "approved" || new Date(data.expires_at) <= new Date()) {
		throw new Error("Device link request is not approved or has expired");
	}
	if (!data.one_time_public_key || !data.wrapped_private_key) {
		throw new Error("Invalid device link request");
	}

	const publicKeyHash = await hashOneTimePublicKey(data.one_time_public_key);
	const shared = await deriveSharedWrappingKey(
		oneTime,
		await importIdentityPublicKey(identity.publicKey),
	);
	const pkcs8 = new TextDecoder().decode(
		await decryptBytes(
			shared,
			data.wrapped_private_key as unknown as SealedBytes,
			aadFor({ kind: "device-link", requestId, publicKeyHash }),
		),
	);
	const deviceId = crypto.randomUUID();
	const deviceKey = await generateDeviceKey();
	const sealedForDevice = await encryptBytes(
		deviceKey,
		new TextEncoder().encode(pkcs8),
		aadFor({ kind: "device", userId: identity.userId, deviceId }),
	);
	const { error: consumeError } = await supabase.rpc("consume_device_link", {
		p_request_id: requestId,
		p_device_id: deviceId,
		p_wrapped_private_key: asJson(sealedForDevice),
		p_device_label: data.device_label,
	});
	if (consumeError) throw consumeError;

	pendingOneTimeKeys.delete(requestId);
	sessionStorage.removeItem(oneTimeKeyStorageKey(requestId));
	const record: DeviceRecord = {
		id: deviceId,
		key: deviceKey,
		label: data.device_label,
	};
	await writeDeviceRecord(record);
	return record;
}

export interface DeviceLinkRequestRow {
	id: string;
	device_label: string;
	status: string;
	expires_at: string;
	created_at: string;
	target_device_id: string | null;
}

export interface TrustedDevice {
	id: string;
	device_label: string;
	status: string;
	last_used_at: string | null;
	created_at: string;
}

export async function listDeviceLinkRequests(): Promise<
	DeviceLinkRequestRow[]
> {
	const { data, error } = await supabase
		.from("device_link_requests")
		.select(
			"id, device_label, status, expires_at, created_at, target_device_id",
		)
		.order("created_at", { ascending: false })
		.limit(20);
	if (error) throw error;
	return (data ?? []) as DeviceLinkRequestRow[];
}

export async function listTrustedDevices(): Promise<TrustedDevice[]> {
	const { data, error } = await supabase
		.from("user_devices")
		.select("id, device_label, status, last_used_at, created_at")
		.eq("status", "active")
		.order("last_used_at", { ascending: false, nullsFirst: false })
		.order("created_at", { ascending: false });
	if (error) throw error;
	return (data ?? []) as TrustedDevice[];
}
