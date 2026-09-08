import { onCleanup } from "solid-js";

/**
 * Trailing-debounce a callback. Repeated calls within `delayMs` reset the
 * timer; only the last invocation runs after the quiet period. Any pending
 * timer is cleared on cleanup.
 */
export function useDebouncedCallback<A extends unknown[]>(
	fn: (...args: A) => void,
	delayMs = 400,
) {
	let timer: ReturnType<typeof setTimeout> | undefined;

	const debounced = (...args: A) => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			fn(...args);
		}, delayMs);
	};

	onCleanup(() => {
		if (timer) clearTimeout(timer);
	});

	return debounced;
}
