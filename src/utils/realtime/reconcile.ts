type RecordedWrite = {
	updatedAt?: string;
	version?: number;
	blob?: string;
};

/**
 * Echo suppression for realtime events.
 *
 * postgres_changes payloads carry no client id, so we compare an incoming
 * event against the client's own last write (per table+id) and drop the event
 * if it is ourselves. This prevents optimistic local updates from being
 * double-applied when the write echoes back over Realtime.
 *
 * For whole-blob content (markdown/table) we track `version` (authoritative,
 * bumped DB-side) and the exact blob. For row edits we track `updatedAt`.
 *
 * `shouldApply` is the filter every incoming event passes through. Call
 * `recordWrite` after each successful (or optimistic) local write.
 */
export function createReconcileGuard() {
	const writes = new Map<string, RecordedWrite>();

	const key = (table: string, id: string) => `${table}:${id}`;

	const recordWrite = (table: string, id: string, meta: RecordedWrite) => {
		writes.set(key(table, id), meta);
	};

	const clear = (table: string, id: string) => {
		writes.delete(key(table, id));
	};

	const shouldApply = (
		table: string,
		id: string,
		event: {
			updatedAt?: string;
			version?: number;
			content?: string;
		},
	): boolean => {
		if (event.version !== undefined) {
			const last = writes.get(key(table, id));
			if (last && last.version !== undefined) {
				if (event.version <= last.version) {
					writes.delete(key(table, id));
					return false;
				}
			}
		}

		if (event.content !== undefined && event.updatedAt !== undefined) {
			const last = writes.get(key(table, id));
			if (last && last.blob === event.content) {
				writes.delete(key(table, id));
				return false;
			}
		}

		if (event.updatedAt !== undefined) {
			const last = writes.get(key(table, id));
			if (last && last.updatedAt === event.updatedAt) {
				writes.delete(key(table, id));
				return false;
			}
		}

		return true;
	};

	return { recordWrite, clear, shouldApply };
}
