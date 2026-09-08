export const uid = () => crypto.randomUUID();

export const colorMix = (color: string, opacity: number = 30) =>
	`color-mix(in srgb, ${color} ${opacity}%, transparent)`;

export function getInitials(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return "";

	const parts = trimmed.split(/\s+/);
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}

	const firstInitial = parts[0].charAt(0);
	const lastInitial = parts[parts.length - 1].charAt(0);
	return `${firstInitial}${lastInitial}`.toUpperCase();
}

export function dropdownItemValue(e: Event) {
	const selectEvent = e as unknown as {
		detail: { item: { value?: string } | null };
	};
	return selectEvent.detail.item?.value;
}

export function getErrorMessage(err: unknown, fallback: string): string {
	return err instanceof Error ? err.message : fallback;
}

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toStringOrNull(value: unknown): string | null {
	return typeof value === "string" && value ? value : null;
}

export const cn = (...classes: Array<string | false | null | undefined>) =>
	classes.filter(Boolean).join(" ");

export const deferFocus = (el: HTMLElement | null | undefined) => {
	const frame = requestAnimationFrame(() => el?.focus());
	return () => cancelAnimationFrame(frame);
};
