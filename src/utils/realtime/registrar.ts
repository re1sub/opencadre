export interface RealtimeEventPayload {
	table: string;
	eventType: "INSERT" | "UPDATE" | "DELETE" | "*";
	new?: Record<string, unknown> | null;
	old?: Record<string, unknown> | null;
	errors?: unknown;
	commit_timestamp?: string;
}

export interface RealtimeHandlers {
	applyInsert: (row: Record<string, unknown>) => void;
	applyUpdate: (row: Record<string, unknown>) => void;
	applyDelete: (row: Record<string, unknown>) => void;
}

type HandlerSet = Map<number, RealtimeHandlers>;

const registries = new Map<string, HandlerSet>();
let nextId = 1;

/**
 * Module-level registrar that connects Realtime events to the adapter hooks
 * that own each table's client state. Adapters register their handlers here;
 * `useWorkspaceRealtime` dispatches inbound postgres_changes payloads to every
 * registered handler for the event's table.
 */
export function registerRealtimeHandlers(
	table: string,
	handlers: RealtimeHandlers,
): () => void {
	let set = registries.get(table);
	if (!set) {
		set = new Map();
		registries.set(table, set);
	}
	const id = nextId++;
	set.set(id, handlers);
	return () => {
		set?.delete(id);
		if (set && set.size === 0) registries.delete(table);
	};
}

export function dispatchRealtimeEvent(payload: RealtimeEventPayload) {
	const set = registries.get(payload.table);
	if (!set) return;

	for (const handlers of set.values()) {
		if (payload.eventType === "INSERT" && payload.new) {
			handlers.applyInsert(payload.new);
		} else if (payload.eventType === "UPDATE" && payload.new) {
			handlers.applyUpdate(payload.new);
		} else if (payload.eventType === "DELETE" && payload.old) {
			handlers.applyDelete(payload.old);
		}
	}
}
