import { createEffect, onCleanup } from "solid-js";

/**
 * Attach a DOM event listener to the element returned by `target`. The effect
 * re-runs (and the listener is re-attached) whenever tracked value inside
 * `target` changes; returning `null` from `target` detaches nothing.
 */
export function useEventListener(
	target: () => EventTarget | null | undefined,
	type: string,
	handler: EventListenerOrEventListenerObject,
	options?: AddEventListenerOptions | boolean,
) {
	createEffect(() => {
		const el = target();
		if (!el) return;
		el.addEventListener(type, handler, options);
		onCleanup(() => el.removeEventListener(type, handler, options));
	});
}
