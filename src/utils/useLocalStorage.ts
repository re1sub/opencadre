import { createSignal } from "solid-js";

/**
 * Signal backed by `localStorage`. The initial value is read lazily and
 * validated by `parse`; setting the returned setter persists `String(value)`
 * and updates the signal. SSR-safe: storage writes and reads are skipped when
 * `window` is unavailable.
 */
export function useLocalStorage<T>(
	key: string,
	defaultValue: T,
	parse: (raw: string | null, fallback: T) => T,
) {
	const read = () => {
		if (typeof window === "undefined") return defaultValue;
		return parse(window.localStorage.getItem(key), defaultValue);
	};

	const [value, setValue] = createSignal<T>(read());

	// biome-ignore lint/complexity/noBannedTypes: must match SolidJS createSignal setter type
	const set: (next: Exclude<T, Function>) => void = (next) => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem(key, String(next));
		}
		setValue(next);
	};

	return [value, set] as const;
}
