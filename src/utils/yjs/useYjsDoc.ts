import type { RealtimeChannel } from "@supabase/supabase-js";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import * as Y from "yjs";
import { reportDecryptionError } from "#/features/crypto/decryptionErrors";
import { VaultDecryptionError } from "#/features/crypto/errors";
import { useVault } from "#/features/crypto/VaultProvider";
import { ydocAad } from "#/features/crypto/vault";
import { supabase } from "#/utils/supabase";
import { nowIso } from "../date";
import type { YjsUpdateOrigin } from "./types";

interface UseYjsDocOptions {
	entityType: () => string;
	entityId: () => string;
	workspaceId: () => string;
}

const pendingPersists = new Map<string, Promise<void>>();

export function useYjsDoc(options: UseYjsDocOptions) {
	const vault = useVault();

	const [doc, setDoc] = createSignal<Y.Doc | null>(null);
	const [loaded, setLoaded] = createSignal(false);
	const [isNew, setIsNew] = createSignal(false);
	const [locked, setLocked] = createSignal(false);

	const entityId = createMemo(options.entityId);
	const entityType = createMemo(options.entityType);
	const workspaceId = createMemo(options.workspaceId);

	createEffect(() => {
		const type = entityType();
		const id = entityId();
		const wsId = workspaceId();
		const vaultStatus = vault.status();
		vault.epoch();

		if (vaultStatus !== "unlocked") {
			setDoc(null);
			setLoaded(false);
			setLocked(vaultStatus === "locked");
		}

		if (!type || !id || !wsId) return;
		if (vaultStatus !== "unlocked") return;

		const aad = ydocAad(type, id);
		const ydoc = new Y.Doc();
		let isDestroyed = false;
		let timeoutId: number | undefined;
		const persistKey = `${type}:${id}`;
		const channelName = `yjs:${type}:${id}`;

		const channel: RealtimeChannel = supabase.channel(channelName, {
			config: { broadcast: { ack: true } },
		});

		channel.on("broadcast", { event: "update" }, (payload) => {
			const raw = payload.payload?.update;
			if (typeof raw !== "string") return;

			void (async () => {
				try {
					const update = await vault.openBinary(wsId, raw, aad);
					if (!update || isDestroyed) return;
					Y.applyUpdate(ydoc, update, "supabase-broadcast");
				} catch (err) {
					if (err instanceof VaultDecryptionError) {
						reportDecryptionError(`${wsId}:ydoc:${type}:${id}`, err);
					}
					console.error("Failed to apply remote Yjs update", err);
				}
			})();
		});

		channel.subscribe();

		const persistState = async () => {
			const fullState = Y.encodeStateAsUpdate(ydoc);

			let state: string;
			try {
				state = await vault.sealBinary(wsId, fullState, aad);
			} catch (err) {
				console.error("Skipping document persist", err);
				return;
			}

			const { error } = await supabase.from("ydocs").upsert(
				{
					workspace_id: wsId,
					entity_type: type,
					entity_id: id,
					state,
					updated_at: nowIso(),
				},
				{ onConflict: "entity_type,entity_id" },
			);
			if (error) throw error;
		};

		const loadInitialState = async () => {
			await (pendingPersists.get(persistKey) || Promise.resolve());
			const { data } = await supabase
				.from("ydocs")
				.select("state")
				.eq("entity_type", type)
				.eq("entity_id", id)
				.maybeSingle();

			if (isDestroyed) return;

			let isNewDoc = true;
			if (data?.state) {
				try {
					const opened = await vault.openBinary(wsId, data.state, aad);
					if (isDestroyed) return;
					Y.applyUpdate(ydoc, opened, "supabase-load");
					isNewDoc = false;
				} catch (err) {
					if (err instanceof VaultDecryptionError) {
						reportDecryptionError(`${wsId}:ydoc:${type}:${id}`, err);
					}
					setLocked(true);
					setLoaded(false);
					setDoc(null);
					return;
				}
			}

			if (!isDestroyed) {
				setLocked(false);
				setIsNew(isNewDoc);
				setDoc(ydoc);
				setLoaded(true);
			}
		};

		void loadInitialState().catch(() => {});

		const broadcast = async (update: Uint8Array) => {
			let payload: string;
			try {
				payload = await vault.sealBinary(wsId, update, aad);
			} catch (err) {
				console.error("Skipping Yjs broadcast", err);
				return;
			}
			if (isDestroyed) return;
			channel.send({
				type: "broadcast",
				event: "update",
				payload: { update: payload },
			});
		};

		const onUpdate = (update: Uint8Array, origin: YjsUpdateOrigin) => {
			if (isDestroyed) return;
			if (origin === "supabase-load" || origin === "supabase-broadcast") return;

			void broadcast(update);

			if (timeoutId) window.clearTimeout(timeoutId);
			timeoutId = window.setTimeout(() => {
				const persistPromise = persistState()
					.catch((err) => {
						console.error("Failed to persist Yjs state", err);
					})
					.finally(() => {
						if (pendingPersists.get(persistKey) === persistPromise)
							pendingPersists.delete(persistKey);
					});
				pendingPersists.set(persistKey, persistPromise);
			}, 500);
		};

		ydoc.on("update", onUpdate);

		onCleanup(() => {
			isDestroyed = true;
			if (timeoutId) {
				window.clearTimeout(timeoutId);
				const flush = persistState().catch((err) =>
					console.error("Failed to persist Yjs state on cleanup", err),
				);
				const p: Promise<void> = flush.then(() => undefined);
				pendingPersists.set(persistKey, p);
				p.finally(() => {
					if (pendingPersists.get(persistKey) === p)
						pendingPersists.delete(persistKey);
				});
				timeoutId = undefined;
			}
			ydoc.off("update", onUpdate);
			ydoc.destroy();
			channel.unsubscribe();
		});
	});

	return { doc, loaded, isNew, locked };
}
