import { onCleanup, onMount } from "solid-js";

const IS_MAC =
	typeof navigator !== "undefined" &&
	/macintosh|mac os x|iphone|ipad|ipod/i.test(navigator.userAgent);

type Modifier = "mod" | "ctrl" | "meta" | "shift" | "alt";

interface ComboSpec {
	key: string;
	ctrl: boolean;
	meta: boolean;
	shift: boolean;
	alt: boolean;
}

function parseCombo(combo: string): ComboSpec {
	const parts = combo.toLowerCase().split("+");
	const key = parts.pop() ?? "";
	const has = (name: Modifier) => parts.includes(name);
	return {
		key,
		ctrl: has("ctrl") || (has("mod") && !IS_MAC),
		meta: has("meta") || (has("mod") && IS_MAC),
		shift: has("shift"),
		alt: has("alt"),
	};
}

export function useHotkey(
	combo: string,
	handler: (event: KeyboardEvent) => void,
) {
	const spec = parseCombo(combo);

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.repeat) return;
		if (
			event.key.toLowerCase() !== spec.key ||
			event.ctrlKey !== spec.ctrl ||
			event.metaKey !== spec.meta ||
			event.shiftKey !== spec.shift ||
			event.altKey !== spec.alt
		) {
			return;
		}
		event.preventDefault();
		handler(event);
	};

	onMount(() => {
		document.addEventListener("keydown", handleKeyDown);
	});

	onCleanup(() => {
		document.removeEventListener("keydown", handleKeyDown);
	});
}
