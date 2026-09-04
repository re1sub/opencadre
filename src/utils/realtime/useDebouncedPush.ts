import { onCleanup } from "solid-js";

/**
 * Trailing-debounce a push callback. Pass the (re)created callback via
 * `setPush` (e.g. in an effect keyed on the values it closes over), then call
 * `push()` to schedule. Repeated calls within `delayMs` reset the timer; only
 * the last invocation runs after the quiet period.
 *
 * Discrete/one-shot actions should call `pushNow()` to bypass the delay.
 *
 * The push target is held in a mutable ref (not a signal) so `setPush` can
 * accept a function value without colliding with Solid's signal-updater
 * overload.
 */
export function useDebouncedPush(delayMs = 400) {
	let pushTarget: (() => void) | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const setPush = (fn: () => void) => {
		pushTarget = fn;
	};

	const push = () => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			pushTarget?.();
		}, delayMs);
	};

	const pushNow = () => {
		if (timer) clearTimeout(timer);
		timer = undefined;
		pushTarget?.();
	};

	onCleanup(() => {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
			pushTarget?.();
		}
	});

	return { setPush, push, pushNow };
}
