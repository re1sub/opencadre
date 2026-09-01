import { createEffect, onCleanup } from "solid-js";

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
	combo: string | (() => string | null),
	handler: (event: KeyboardEvent) => void,
) {
	const comboAccessor = typeof combo === "function" ? combo : () => combo;

	createEffect(() => {
		const raw = comboAccessor();
		if (!raw) return;

		const spec = parseCombo(raw);

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

		document.addEventListener("keydown", handleKeyDown);
		onCleanup(() => {
			document.removeEventListener("keydown", handleKeyDown);
		});
	});
}

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta", "CapsLock"]);

export function isModifierKey(raw: string): boolean {
	return MODIFIER_KEYS.has(raw);
}

function normalizeKey(raw: string): string | null {
	if (MODIFIER_KEYS.has(raw) || raw === "Escape") return null;
	return raw.toLowerCase();
}

export function buildComboParts(event: KeyboardEvent): string[] {
	const parts: string[] = [];
	if (IS_MAC ? event.metaKey : event.ctrlKey) parts.push("mod");
	else if (event.ctrlKey) parts.push("ctrl");
	else if (event.metaKey) parts.push("meta");
	if (event.altKey) parts.push("alt");
	if (event.shiftKey) parts.push("shift");
	const key = normalizeKey(event.key);
	if (key) parts.push(key);
	return parts;
}

const MOD_LABELS: Record<string, string> = {
	mod: IS_MAC ? "⌘" : "Ctrl",
	ctrl: IS_MAC ? "⌃" : "Ctrl",
	meta: IS_MAC ? "⌘" : "Meta",
	alt: IS_MAC ? "⌥" : "Alt",
	shift: IS_MAC ? "⇧" : "Shift",
};

const KEY_LABELS: Record<string, string> = {
	" ": "Space",
	arrowup: "↑",
	arrowdown: "↓",
	arrowleft: "←",
	arrowright: "→",
};

export function formatComboParts(parts: string[]): string[] {
	return parts.map((part) => {
		const p = part.toLowerCase();
		if (p in MOD_LABELS) return MOD_LABELS[p];
		return (
			KEY_LABELS[p] ??
			(p.length === 1
				? p.toUpperCase()
				: p.charAt(0).toUpperCase() + p.slice(1))
		);
	});
}

export function formatComboKeys(combo: string): string[] {
	return formatComboParts(combo.split("+"));
}
