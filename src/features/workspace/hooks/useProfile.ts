import { createSignal } from "solid-js";

const [customName, setCustomName] = createSignal<string | null>(null);

export function useProfile(fallbackEmail?: () => string | undefined | null) {
	const name = () => {
		const custom = customName();
		if (custom?.trim()) return custom.trim();
		const email = fallbackEmail?.();
		if (!email) return "";
		return email;
	};

	return { name, customName, setCustomName };
}
