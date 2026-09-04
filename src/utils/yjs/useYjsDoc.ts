import type { RealtimeChannel } from "@supabase/supabase-js";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import * as Y from "yjs";
import { supabase } from "#/utils/supabase";
import { base64ToUint8Array, uint8ArrayToBase64 } from "./base64";
import type { YjsUpdateOrigin } from "./types";

interface UseYjsDocOptions {
	entityType: () => string;
	entityId: () => string;
	workspaceId: () => string;
}

const pendingPersists = new Map<string, Promise<void>>();

/**
 * Provides a synchronized Yjs document for a given entity.
 */
export function useYjsDoc(options: UseYjsDocOptions) {
	const [doc, setDoc] = createSignal<Y.Doc | null>(null);
	const [loaded, setLoaded] = createSignal(false);
	const [isNew, setIsNew] = createSignal(false);

	const entityId = createMemo(options.entityId);
	const entityType = createMemo(options.entityType);
	const workspaceId = createMemo(options.workspaceId);

	createEffect(() => {
		const type = entityType();
		const id = entityId();
		const wsId = workspaceId();

		if (!type || !id || !wsId) return;

		const ydoc = new Y.Doc();
		let isDestroyed = false;
		let timeoutId: number | undefined;
		const persistKey = `${type}:${id}`;
		const channelName = `yjs:${type}:${id}`;

		const channel: RealtimeChannel = supabase.channel(channelName, {
			config: { broadcast: { ack: true } },
		});

		channel.on("broadcast", { event: "update" }, (payload) => {
			if (isDestroyed) return;
			if (typeof payload.payload?.update === "string") {
				try {
					const update = base64ToUint8Array(payload.payload.update);
					Y.applyUpdate(ydoc, update, "supabase-broadcast");
				} catch (err) {
					console.error("Failed to apply remote Yjs update", err);
				}
			}
		});

		channel.subscribe();

		const persistState = async () => {
			const fullState = Y.encodeStateAsUpdate(ydoc);
			const stateBase64 = uint8ArrayToBase64(fullState);

			await supabase.from("ydocs").upsert(
				{
					workspace_id: wsId,
					entity_type: type,
					entity_id: id,
					state: stateBase64,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "entity_type,entity_id" },
			);
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
					const uint8 = base64ToUint8Array(data.state);
					Y.applyUpdate(ydoc, uint8, "supabase-load");
					isNewDoc = false;
				} catch (err) {
					console.error(err);
					isNewDoc = true;
				}
			}

			if (!isDestroyed) {
				setIsNew(isNewDoc);
				setDoc(ydoc);
				setLoaded(true);
			}
		};

		loadInitialState();

		const onUpdate = (update: Uint8Array, origin: YjsUpdateOrigin) => {
			if (isDestroyed) return;
			if (origin === "supabase-load" || origin === "supabase-broadcast") return;

			const updateBase64 = uint8ArrayToBase64(update);
			channel.send({
				type: "broadcast",
				event: "update",
				payload: { update: updateBase64 },
			});

			if (timeoutId) window.clearTimeout(timeoutId);
			timeoutId = window.setTimeout(async () => {
				const persistPromise = persistState();
				pendingPersists.set(persistKey, persistPromise);
				await persistPromise;
				pendingPersists.delete(persistKey);
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

	return { doc, loaded, isNew };
}
