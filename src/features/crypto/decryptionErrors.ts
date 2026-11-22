import { createSignal } from "solid-js";
import { getErrorMessage } from "#/utils/misc";

const [entries, setEntries] = createSignal<Map<string, string>>(new Map());

export const decryptionErrors = () => entries();

export function reportDecryptionError(key: string, error: unknown): void {
	const message = getErrorMessage(
		error,
		"This content could not be decrypted.",
	);
	setEntries((prev) => {
		if (prev.get(key) === message) return prev;
		const next = new Map(prev);
		next.set(key, message);
		return next;
	});
}

export function clearDecryptionError(key: string): void {
	setEntries((prev) => {
		if (!prev.has(key)) return prev;
		const next = new Map(prev);
		next.delete(key);
		return next;
	});
}

export function clearDecryptionErrorsFor(workspaceId: string): void {
	setEntries((prev) => {
		const next = new Map(prev);
		for (const key of next.keys()) {
			if (key.startsWith(`${workspaceId}:`)) next.delete(key);
		}
		return next;
	});
}

export function hasDecryptionErrors(workspaceId?: string): boolean {
	for (const key of entries().keys()) {
		if (!workspaceId || key.startsWith(`${workspaceId}:`)) return true;
	}
	return false;
}
