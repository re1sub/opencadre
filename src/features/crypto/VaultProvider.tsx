import {
	createContext,
	createEffect,
	createMemo,
	createSignal,
	type JSXElement,
	onCleanup,
	useContext,
} from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import type { Json } from "#/types/database";
import { getErrorMessage } from "#/utils/misc";
import { supabase } from "#/utils/supabase";
import { aadFor } from "./aad";
import { reportDecryptionError } from "./decryptionErrors";
import { detectDeviceLabel } from "./deviceLabel";
import { openEnvelope, parseEnvelope, sealEnvelope } from "./envelope";
import {
	VaultDecryptionError,
	VaultKeyMissingError,
	VaultLockedError,
} from "./errors";
import { clearNoncePool, nonceFor } from "./nonces";
import { assertRecoveryUnlocked, recordRecoveryAttempt } from "./recovery";
import {
	getActiveRotation,
	getFailedRotation,
	type RotationRow,
	runRotation,
} from "./rotation";
import { logSecurityEvent } from "./securityEvents";
import {
	approveLinkRequest,
	consumeLinkRequest,
	createIdentity,
	createLinkRequest,
	createWorkspaceKey,
	type DeviceLink,
	type DeviceLinkRequestRow,
	type DeviceRecord,
	ensureUserContentKey,
	forgetDevice as forgetTrustedDevice,
	listDeviceLinkRequests,
	listTrustedDevices,
	listWorkspaceKeyHolders,
	listWorkspaceMemberIds,
	loadIdentity,
	readActiveKeyId,
	readDeviceRecord,
	readMemberPublicKeys,
	readWorkspaceKeyById,
	regenerateRecoveryCode,
	rejectLinkRequest,
	rememberDevice,
	type TrustedDevice,
	touchDevice,
	unlockIdentityWithRecoveryCode,
	unlockWithDevice,
	unwrapWrappedKey,
	type VaultIdentity,
	wrapForKey,
} from "./vault";

export type VaultStatus = "loading" | "unconfigured" | "locked" | "unlocked";

interface CachedKey {
	keyId: string;
	key: CryptoKey;
	rawKey: Uint8Array;
	workspaceId: string;
}

export interface VaultApi {
	status: () => VaultStatus;
	epoch: () => number;
	error: () => string | null;
	hasDevice: () => boolean;
	setup: () => Promise<string>;
	pendingRecoveryCode: () => string | null;
	clearPendingRecoveryCode: () => void;
	unlockWithRecoveryCode: (code: string) => Promise<void>;
	unlockFromDevice: () => Promise<void>;
	lock: () => void;
	rememberThisDevice: (label?: string) => Promise<void>;
	forgetDevice: (deviceId: string) => Promise<void>;
	newRecoveryCode: () => Promise<string>;
	sealText: (
		workspaceId: string,
		plaintext: string,
		aad: string,
	) => Promise<string>;
	openText: (
		workspaceId: string,
		sealed: string,
		aad: string,
	) => Promise<string>;
	openTextSafe: (
		workspaceId: string,
		sealed: string,
		aad: string,
		errorKey: string,
	) => Promise<string>;
	sealBinary: (
		workspaceId: string,
		bytes: Uint8Array,
		aad: string,
	) => Promise<string>;
	openBinary: (
		workspaceId: string,
		sealed: string,
		aad: string,
	) => Promise<Uint8Array>;
	ensureWorkspaceKey: (workspaceId: string) => Promise<boolean>;
	shareWorkspaceKey: (workspaceId: string) => Promise<void>;
	missingKeys: () => string[];
	markMissingKey: (workspaceId: string) => void;
	sealDisplayName: (name: string) => Promise<string>;
	openDisplayName: (sealed: string) => Promise<string>;
	deviceLinks: () => DeviceLinkRequestRow[];
	refreshDeviceLinks: () => Promise<void>;
	trustedDevices: () => TrustedDevice[];
	refreshTrustedDevices: () => Promise<void>;
	deviceId: () => string | null;
	startLink: (
		label: string,
		targetDeviceId?: string | null,
	) => Promise<DeviceLink>;
	approveLink: (requestId: string) => Promise<void>;
	rejectLink: (requestId: string) => Promise<void>;
	consumeLink: (requestId: string) => Promise<DeviceRecord>;
	pendingRotations: () => RotationRow[];
	failedRotation: () => RotationRow | null;
	rotationRequired: (workspaceId: string) => boolean;
	startRotation: (workspaceId: string) => Promise<string>;
	retryRotation: (workspaceId: string) => Promise<void>;
	resumeRotations: () => Promise<void>;
	retryDecryption: (workspaceId: string) => void;
}

const VaultContext = createContext<VaultApi>();

const messageOf = (err: unknown): string =>
	getErrorMessage(err, "Something went wrong");

const capFromAad = (aad: string): number => {
	if (aad.startsWith("page_content:")) return 1048576;
	if (aad.startsWith("ydocs:")) return 2097152;
	if (aad.startsWith("comments:")) return 65536;
	return 512;
};

const VaultProvider = (props: { children: JSXElement }) => {
	const localDeviceLabel = detectDeviceLabel();
	const [status, setStatus] = createSignal<VaultStatus>("loading");
	const [identity, setIdentity] = createSignal<VaultIdentity | null>(null);
	const [error, setError] = createSignal<string | null>(null);
	const [missingKeys, setMissingKeys] = createSignal<string[]>([]);
	const [epoch, setEpoch] = createSignal(0);
	const [hasDevice, setHasDevice] = createSignal(false);
	const [pendingRecoveryCode, setPendingRecoveryCode] = createSignal<
		string | null
	>(null);
	const [deviceLinks, setDeviceLinks] = createSignal<DeviceLinkRequestRow[]>(
		[],
	);
	const [trustedDevices, setTrustedDevices] = createSignal<TrustedDevice[]>([]);
	const [rotations, setRotations] = createSignal<RotationRow[]>([]);
	const [failedRotation, setFailedRotation] = createSignal<RotationRow | null>(
		null,
	);
	const [requiredRotations, setRequiredRotations] = createSignal<string[]>([]);

	let privateKey: CryptoKey | null = null;
	let deviceRecord: DeviceRecord | null = null;
	let userContentKey: { keyId: string; key: CryptoKey } | null = null;
	const keyCache = new Map<string, CachedKey>();
	const activeKeyId = new Map<string, string>();
	const pendingKeys = new Map<string, Promise<boolean>>();

	const clearKeys = () => {
		privateKey = null;
		userContentKey = null;
		keyCache.clear();
		activeKeyId.clear();
		pendingKeys.clear();
		clearNoncePool();
	};

	const bumpEpoch = () => setEpoch((value) => value + 1);

	const markMissingKey = (workspaceId: string) => {
		setMissingKeys((prev) =>
			prev.includes(workspaceId) ? prev : [...prev, workspaceId],
		);
	};

	const forgetMissingKey = (workspaceId: string) => {
		setMissingKeys((prev) => prev.filter((id) => id !== workspaceId));
	};

	const { user } = useAuth();
	const userId = createMemo(() => user()?.id ?? null);
	let initToken = 0;

	const resetVault = () => {
		clearKeys();
		setIdentity(null);
		setHasDevice(false);
		setMissingKeys([]);
		setError(null);
		setPendingRecoveryCode(null);
		setDeviceLinks([]);
		setRotations([]);
		setFailedRotation(null);
		setRequiredRotations([]);
		deviceRecord = null;
	};

	const refreshDeviceLinks = async () => {
		try {
			setDeviceLinks(await listDeviceLinkRequests());
		} catch (err) {
			setError(messageOf(err));
		}
	};

	const refreshTrustedDevices = async () => {
		try {
			setTrustedDevices(await listTrustedDevices());
		} catch (err) {
			setError(messageOf(err));
		}
	};

	const loadUserContentKey = async () => {
		const mine = identity();
		if (!mine || !privateKey) return;
		userContentKey = await ensureUserContentKey(mine, privateKey);
	};

	const afterUnlock = async () => {
		setStatus("unlocked");
		bumpEpoch();
		await refreshDeviceLinks();
		await loadUserContentKey();
		void resumeRotations();
	};

	const initializeVault = async (expectedToken: number) => {
		try {
			const loaded = await loadIdentity();
			if (expectedToken !== initToken) return;
			setIdentity(loaded);

			if (!loaded) {
				await setup().catch(() => {});
				return;
			}

			deviceRecord = await readDeviceRecord();
			if (expectedToken !== initToken) return;
			setHasDevice(Boolean(deviceRecord));

			if (deviceRecord) {
				try {
					privateKey = await unlockWithDevice(loaded, deviceRecord);
					await afterUnlock();
					return;
				} catch {
					deviceRecord = null;
					setHasDevice(false);
				}
			}

			setStatus("locked");
			await refreshDeviceLinks();
			await refreshTrustedDevices();
		} catch (err) {
			if (expectedToken !== initToken) return;
			setError(messageOf(err));
			setStatus("unconfigured");
		}
	};

	const setup = async () => {
		setError(null);
		try {
			const created = await createIdentity();
			setIdentity(created.identity);
			privateKey = created.privateKey;
			setPendingRecoveryCode(created.recoveryCode);
			setStatus("unlocked");
			bumpEpoch();
			await loadUserContentKey();
			try {
				deviceRecord = await rememberDevice(
					created.identity,
					created.privateKey,
					localDeviceLabel,
				);
				setHasDevice(true);
			} catch {}
			return created.recoveryCode;
		} catch (err) {
			setError(messageOf(err));
			setStatus("unconfigured");
			throw err;
		}
	};

	const unlockWithRecoveryCode = async (code: string) => {
		setError(null);
		const current = identity();
		if (!current) throw new Error("Encryption is not set up");
		await assertRecoveryUnlocked();
		try {
			privateKey = await unlockIdentityWithRecoveryCode(current, code);
			await recordRecoveryAttempt(true);
			await afterUnlock();
		} catch (err) {
			const message = messageOf(err);
			await recordRecoveryAttempt(false).catch(() => {});
			await logSecurityEvent("recovery.unlock_failed", {
				error_code:
					message === "Incorrect recovery code"
						? "invalid_code"
						: "unlock_failed",
			}).catch(() => {});
			throw err;
		}
		try {
			deviceRecord = await rememberDevice(
				current,
				privateKey,
				localDeviceLabel,
			);
			setHasDevice(true);
		} catch {}
	};

	const unlockFromDevice = async () => {
		setError(null);
		const current = identity();
		if (!current) throw new Error("Encryption is not set up");
		const record = deviceRecord ?? (await readDeviceRecord());
		if (!record) throw new Error("This device is not registered");
		deviceRecord = record;
		privateKey = await unlockWithDevice(current, record);
		setHasDevice(true);
		await afterUnlock();
	};

	const lock = () => {
		clearKeys();
		bumpEpoch();
		if (identity()) setStatus("locked");
	};

	const requireUnlocked = () => {
		if (status() !== "unlocked" || !privateKey) throw new VaultLockedError();
	};

	const loadActiveKey = async (
		workspaceId: string,
	): Promise<CachedKey | null> => {
		requireUnlocked();
		const active = activeKeyId.get(workspaceId);
		if (active) {
			const cached = keyCache.get(active);
			if (cached) return cached;
		}
		const keyId = await readActiveKeyId(workspaceId);
		if (!keyId) return null;
		const row = await readWorkspaceKeyById(keyId);
		if (!row) {
			markMissingKey(workspaceId);
			return null;
		}
		const mine = identity();
		if (!mine || !privateKey) throw new VaultLockedError();
		const opened = await unwrapWrappedKey(
			row.wrapped_key,
			privateKey,
			row.workspace_id,
			mine.userId,
		);
		const cached: CachedKey = {
			keyId,
			key: opened.key,
			rawKey: opened.rawKey,
			workspaceId,
		};
		keyCache.set(keyId, cached);
		activeKeyId.set(workspaceId, keyId);
		forgetMissingKey(workspaceId);
		return cached;
	};

	const keyById = async (keyId: string): Promise<CachedKey | null> => {
		requireUnlocked();
		const cached = keyCache.get(keyId);
		if (cached) return cached;
		const row = await readWorkspaceKeyById(keyId);
		if (!row) return null;
		const mine = identity();
		if (!mine || !privateKey) throw new VaultLockedError();
		const opened = await unwrapWrappedKey(
			row.wrapped_key,
			privateKey,
			row.workspace_id,
			mine.userId,
		);
		const entry: CachedKey = {
			keyId,
			key: opened.key,
			rawKey: opened.rawKey,
			workspaceId: row.workspace_id,
		};
		keyCache.set(keyId, entry);
		return entry;
	};

	const requireKey = async (workspaceId: string): Promise<CachedKey> => {
		requireUnlocked();
		const available = await ensureWorkspaceKey(workspaceId);
		const cached = await loadActiveKey(workspaceId);
		if (!available || !cached) throw new VaultKeyMissingError(workspaceId);
		return cached;
	};

	const ensureWorkspaceKey = (workspaceId: string): Promise<boolean> => {
		if (!workspaceId) return Promise.resolve(false);
		const active = activeKeyId.get(workspaceId);
		if (active && keyCache.has(active)) return Promise.resolve(true);

		const inFlight = pendingKeys.get(workspaceId);
		if (inFlight) return inFlight;

		const task = (async () => {
			const existing = await loadActiveKey(workspaceId);
			if (existing) return true;

			const mine = identity();
			if (!mine || !privateKey) return false;
			const holders = await listWorkspaceKeyHolders(workspaceId);
			if (holders.length > 0) {
				markMissingKey(workspaceId);
				return false;
			}

			const created = await createWorkspaceKey(
				workspaceId,
				privateKey,
				mine.publicKey,
				mine.userId,
			);
			keyCache.set(created.keyId, {
				keyId: created.keyId,
				key: created.key,
				rawKey: created.rawKey,
				workspaceId,
			});
			activeKeyId.set(workspaceId, created.keyId);
			forgetMissingKey(workspaceId);
			void shareWorkspaceKey(workspaceId);
			return true;
		})()
			.catch((err) => {
				setError(messageOf(err));
				return false;
			})
			.finally(() => {
				pendingKeys.delete(workspaceId);
			});

		pendingKeys.set(workspaceId, task);
		return task;
	};

	const shareWorkspaceKey = async (workspaceId: string) => {
		const mine = identity();
		const key = privateKey;
		const active = await loadActiveKey(workspaceId);
		if (!active || !mine || !key) return;

		try {
			const holders = new Set(await listWorkspaceKeyHolders(workspaceId));
			const members = await listWorkspaceMemberIds(workspaceId);
			const targets = members.filter((id) => !holders.has(id));
			if (targets.length === 0) return;

			const publicKeys = await readMemberPublicKeys(workspaceId);
			const rows: {
				workspace_id: string;
				user_id: string;
				key_id: string;
				wrapped_key: NonNullable<Json>;
			}[] = [];
			for (const targetId of targets) {
				const publicKey = publicKeys.get(targetId);
				if (!publicKey) continue;
				const wrapped = await wrapForKey(
					active.rawKey,
					publicKey,
					key,
					mine.publicKey,
					workspaceId,
					targetId,
					active.keyId,
				);
				rows.push({
					workspace_id: workspaceId,
					user_id: targetId,
					key_id: active.keyId,
					wrapped_key: wrapped as unknown as NonNullable<Json>,
				});
			}
			if (rows.length === 0) return;
			const { error: insertError } = await supabase
				.from("workspace_keys")
				.upsert(rows, {
					onConflict: "workspace_id,user_id,key_id",
					ignoreDuplicates: true,
				});
			if (insertError) throw insertError;
		} catch (err) {
			setError(messageOf(err));
		}
	};

	const sealText = async (
		workspaceId: string,
		plaintext: string,
		aad: string,
	) => {
		const cached = await requireKey(workspaceId);
		const iv = await nonceFor("workspace", cached.keyId);
		return sealEnvelope(
			cached.keyId,
			cached.key,
			new TextEncoder().encode(plaintext),
			aad,
			capFromAad(aad),
			Uint8Array.from(atob(iv), (char) => char.charCodeAt(0)),
		);
	};

	const sealBinary = async (
		workspaceId: string,
		bytes: Uint8Array,
		aad: string,
	) => {
		const cached = await requireKey(workspaceId);
		const iv = await nonceFor("workspace", cached.keyId);
		return sealEnvelope(
			cached.keyId,
			cached.key,
			bytes,
			aad,
			capFromAad(aad),
			Uint8Array.from(atob(iv), (char) => char.charCodeAt(0)),
		);
	};

	const openBinary = async (
		workspaceId: string,
		sealed: string,
		aad: string,
	) => {
		requireUnlocked();
		const parsed = parseEnvelope(sealed);
		const cached = await keyById(parsed.keyId);
		if (!cached) throw new VaultKeyMissingError(workspaceId);

		const rejectScope = (message: string): never => {
			const err = new VaultDecryptionError(message);
			reportDecryptionError(`${workspaceId}:key`, err);
			throw err;
		};

		if (cached.workspaceId !== workspaceId) {
			rejectScope("This ciphertext belongs to a different workspace.");
		}

		const activeKeyId = await readActiveKeyId(workspaceId);
		if (parsed.keyId !== activeKeyId) {
			// Old-key records stay readable until their rotation completes.
			const rotation = await getActiveRotation(workspaceId);
			if (rotation?.from_key_id !== parsed.keyId) {
				rejectScope(
					"This ciphertext uses a key that is no longer active for this workspace.",
				);
			}
		}

		return openEnvelope(sealed, cached.key, aad);
	};

	const openText = async (workspaceId: string, sealed: string, aad: string) => {
		try {
			return new TextDecoder().decode(
				await openBinary(workspaceId, sealed, aad),
			);
		} catch (err) {
			if (err instanceof VaultDecryptionError) {
				reportDecryptionError(`${workspaceId}:content`, err);
			}
			throw err;
		}
	};

	// Tracked opener for callers that need a per-field error key. Failures are
	// reported and rethrown so no caller can mistake them for empty content.
	const openTextSafe = async (
		workspaceId: string,
		sealed: string,
		aad: string,
		errorKey: string,
	) => {
		try {
			return await openText(workspaceId, sealed, aad);
		} catch (err) {
			if (err instanceof VaultDecryptionError) {
				reportDecryptionError(`${workspaceId}:${errorKey}`, err);
			}
			throw err;
		}
	};

	const requireUserKey = async () => {
		requireUnlocked();
		if (!userContentKey) await loadUserContentKey();
		if (!userContentKey)
			throw new Error("Your private encryption key is not available");
		return userContentKey;
	};

	const sealDisplayName = async (name: string) => {
		const cached = await requireUserKey();
		const mine = identity();
		if (!mine) throw new VaultLockedError();
		const iv = await nonceFor("user", cached.keyId);
		return sealEnvelope(
			cached.keyId,
			cached.key,
			new TextEncoder().encode(name),
			aadFor({
				kind: "user-content-key",
				userId: mine.userId,
				keyId: cached.keyId,
			}),
			512,
			Uint8Array.from(atob(iv), (char) => char.charCodeAt(0)),
		);
	};

	const openDisplayName = async (sealed: string) => {
		const cached = await requireUserKey();
		const mine = identity();
		if (!mine) throw new VaultLockedError();
		return new TextDecoder().decode(
			await openEnvelope(
				sealed,
				cached.key,
				aadFor({
					kind: "user-content-key",
					userId: mine.userId,
					keyId: cached.keyId,
				}),
			),
		);
	};

	const startLink = async (label: string, targetDeviceId?: string | null) => {
		const link = await createLinkRequest(label, targetDeviceId);
		await refreshDeviceLinks();
		await logSecurityEvent("device_link.created", {
			request_id: link.requestId,
		});
		return link;
	};

	const approveLink = async (requestId: string) => {
		requireUnlocked();
		const mine = identity();
		if (!privateKey || !mine || !deviceRecord) {
			throw new Error(
				"Unlock your vault on an approved device before approving a link",
			);
		}
		await touchDevice(deviceRecord.id);
		await approveLinkRequest(requestId, privateKey, deviceRecord.id);
		await refreshDeviceLinks();
		await logSecurityEvent("device_link.approved", { request_id: requestId });
	};

	const rejectLink = async (requestId: string) => {
		await rejectLinkRequest(requestId);
		await refreshDeviceLinks();
		await logSecurityEvent("device_link.rejected", { request_id: requestId });
	};

	const consumeLink = async (requestId: string) => {
		const mine = identity();
		if (!mine) throw new VaultLockedError();
		const record = await consumeLinkRequest(requestId, mine);
		deviceRecord = record;
		privateKey = await unlockWithDevice(mine, record);
		setHasDevice(true);
		await refreshDeviceLinks();
		await logSecurityEvent("device_link.consumed", { request_id: requestId });
		await afterUnlock();
		return record;
	};

	const isWorkspaceAdmin = async (workspaceId: string): Promise<boolean> => {
		const mine = identity();
		if (!mine) return false;
		const { data, error } = await supabase.rpc("is_workspace_owner_or_admin", {
			uid: mine.userId,
			ws_id: workspaceId,
		});
		if (error) throw error;
		return Boolean(data);
	};

	const syncRotationState = async () => {
		const mine = identity();
		if (!mine) return;
		const { data: rows, error } = await supabase
			.from("workspaces")
			.select("id, rotation_required")
			.eq("rotation_required", true);
		if (error) throw error;
		const required = (rows ?? []).map((row) => row.id);
		setRequiredRotations(required);

		const { data: active, error: activeError } = await supabase
			.from("key_rotations")
			.select(
				"id, workspace_id, from_key_id, to_key_id, status, processed_count, last_record_key, total_count, error_code",
			)
			.in("status", ["pending", "running"]);
		if (activeError) throw activeError;
		setRotations((active ?? []) as RotationRow[]);
	};

	const rotationRequired = (workspaceId: string) =>
		requiredRotations().includes(workspaceId);

	const rotationKeyAccess = {
		keyFor: (keyId: string) =>
			keyById(keyId).then((entry) => entry?.key ?? null),
		nonceFor: async (keyId: string) => nonceFor("workspace", keyId),
	};

	const executeRotation = async (rotation: RotationRow) => {
		try {
			await runRotation(rotation, rotationKeyAccess);
			clearNoncePool(rotation.from_key_id);
			await logSecurityEvent("rotation.completed", {
				workspace_id: rotation.workspace_id,
				rotation_id: rotation.id,
			});
		} catch (err) {
			const code = messageOf(err).slice(0, 80);
			const { error } = await supabase.rpc("fail_rotation", {
				p_rotation_id: rotation.id,
				p_error_code: code,
			});
			if (error) setError(messageOf(error));
			setFailedRotation({ ...rotation, status: "failed", error_code: code });
			await logSecurityEvent("rotation.failed", {
				workspace_id: rotation.workspace_id,
				rotation_id: rotation.id,
			});
		} finally {
			await syncRotationState();
		}
	};

	const beginRotation = async (workspaceId: string): Promise<string> => {
		requireUnlocked();
		if (!(await isWorkspaceAdmin(workspaceId))) {
			throw new Error("Only owners and admins can secure this workspace");
		}
		const existing = await getActiveRotation(workspaceId);
		if (existing) {
			void executeRotation(existing);
			return existing.id;
		}

		const oldEntry = await loadActiveKey(workspaceId);
		if (!oldEntry) throw new VaultKeyMissingError(workspaceId);
		const mine = identity();
		if (!mine || !privateKey) throw new VaultLockedError();

		const newKeyId = crypto.randomUUID();
		const { generateWorkspaceKey, exportWorkspaceKey } = await import(
			"./crypto"
		);
		const key = await generateWorkspaceKey();
		const rawKey = await exportWorkspaceKey(key);
		const members = await listWorkspaceMemberIds(workspaceId);
		const publicKeys = await readMemberPublicKeys(workspaceId);
		const wrappedKeys: { user_id: string; wrapped_key: Json }[] = [];
		for (const memberId of members) {
			const publicKey = publicKeys.get(memberId);
			if (!publicKey) continue;
			const wrapped = await wrapForKey(
				rawKey,
				publicKey,
				privateKey,
				mine.publicKey,
				workspaceId,
				memberId,
				newKeyId,
			);
			wrappedKeys.push({
				user_id: memberId,
				wrapped_key: wrapped as unknown as Json,
			});
		}

		const { data, error } = await supabase.rpc("begin_workspace_key_rotation", {
			p_workspace_id: workspaceId,
			p_new_key_id: newKeyId,
			p_old_key_id: oldEntry.keyId,
			p_wrapped_keys: wrappedKeys as unknown as Json,
		});
		if (error) throw error;
		const rotationId = data as string;

		keyCache.set(newKeyId, {
			keyId: newKeyId,
			key,
			rawKey,
			workspaceId,
		});
		activeKeyId.set(workspaceId, newKeyId);
		setFailedRotation(null);
		setRequiredRotations((prev) => prev.filter((id) => id !== workspaceId));
		await logSecurityEvent("rotation.started", {
			workspace_id: workspaceId,
			rotation_id: rotationId,
		});
		await syncRotationState();

		const rotation: RotationRow = {
			id: rotationId,
			workspace_id: workspaceId,
			from_key_id: oldEntry.keyId,
			to_key_id: newKeyId,
			status: "running",
			processed_count: 0,
			last_record_key: "",
			total_count: 0,
			error_code: null,
		};
		void executeRotation(rotation);
		return rotationId;
	};

	const retryRotation = async (workspaceId: string) => {
		const failed = await getFailedRotation(workspaceId);
		if (!failed) {
			await beginRotation(workspaceId);
			return;
		}
		const { error } = await supabase.rpc("retry_rotation", {
			p_rotation_id: failed.id,
		});
		if (error) throw error;
		setFailedRotation(null);
		await executeRotation({ ...failed, status: "running", error_code: null });
	};

	const resumeRotations = async () => {
		await syncRotationState();
		for (const rotation of rotations()) {
			if (rotation.status === "running" || rotation.status === "pending") {
				void executeRotation(rotation);
			}
		}
		for (const workspaceId of requiredRotations()) {
			if (rotations().some((r) => r.workspace_id === workspaceId)) continue;
			try {
				if (await isWorkspaceAdmin(workspaceId))
					await beginRotation(workspaceId);
			} catch {}
		}
	};

	const retryDecryption = (workspaceId: string) => {
		for (const [keyId, cached] of keyCache) {
			if (cached.workspaceId !== workspaceId) continue;
			keyCache.delete(keyId);
			clearNoncePool(keyId);
		}
		activeKeyId.delete(workspaceId);
		pendingKeys.delete(workspaceId);
		bumpEpoch();
	};

	createEffect(() => {
		const activeUserId = userId();
		const expectedToken = ++initToken;
		resetVault();
		setStatus("loading");

		if (!activeUserId) return;

		void initializeVault(expectedToken);

		const channel = supabase
			.channel(`vault-keys:${activeUserId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "workspace_keys",
					filter: `user_id=eq.${activeUserId}`,
				},
				(payload) => {
					if (status() !== "unlocked") return;
					const row = payload.new as { workspace_id?: string; key_id?: string };
					if (row.key_id) keyCache.delete(row.key_id);
					if (row.workspace_id) void ensureWorkspaceKey(row.workspace_id);
				},
			)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "key_rotations" },
				() => {
					if (status() !== "unlocked") return;
					void syncRotationState();
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "device_link_requests",
					filter: `user_id=eq.${activeUserId}`,
				},
				() => {
					void refreshDeviceLinks();
				},
			)
			.subscribe();

		onCleanup(() => {
			void supabase.removeChannel(channel);
		});
	});

	const api: VaultApi = {
		status,
		epoch,
		error,
		hasDevice,
		setup,
		pendingRecoveryCode,
		clearPendingRecoveryCode: () => setPendingRecoveryCode(null),
		unlockWithRecoveryCode,
		unlockFromDevice,
		lock,
		rememberThisDevice: async (label) => {
			const mine = identity();
			if (!mine || !privateKey) throw new VaultLockedError();
			deviceRecord = await rememberDevice(mine, privateKey, label);
			setHasDevice(true);
		},
		forgetDevice: async (deviceId) => {
			const current = deviceRecord?.id;
			if (!current) throw new Error("This device is not trusted");
			if (deviceId === current) {
				throw new Error("You cannot untrust this device");
			}
			await forgetTrustedDevice(deviceId, current);
			await refreshTrustedDevices();
		},
		newRecoveryCode: async () => {
			const mine = identity();
			if (!mine || !privateKey) throw new VaultLockedError();
			return regenerateRecoveryCode(mine, privateKey);
		},
		sealText,
		sealBinary,
		openText,
		openTextSafe,
		openBinary,
		ensureWorkspaceKey,
		shareWorkspaceKey,
		missingKeys,
		markMissingKey,
		sealDisplayName,
		openDisplayName,
		deviceLinks,
		refreshDeviceLinks,
		trustedDevices,
		refreshTrustedDevices,
		deviceId: () => deviceRecord?.id ?? null,
		startLink,
		approveLink,
		rejectLink,
		consumeLink,
		pendingRotations: () => rotations(),
		failedRotation,
		rotationRequired,
		startRotation: beginRotation,
		retryRotation,
		resumeRotations,
		retryDecryption,
	};

	return (
		<VaultContext.Provider value={api}>{props.children}</VaultContext.Provider>
	);
};

export function useVault(): VaultApi {
	const context = useContext(VaultContext);
	if (!context) throw new Error("useVault must be used within a VaultProvider");
	return context;
}

export default VaultProvider;
