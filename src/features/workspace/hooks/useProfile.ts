import type { User } from "@supabase/supabase-js";
import { createSignal } from "solid-js";

const [customName, setCustomName] = createSignal<string | null>(null);

export function useProfile(user?: () => User | null | undefined) {
	const name = () => {
		const custom = customName();
		if (custom?.trim()) return custom.trim();

		const metadataName = user?.()?.user_metadata?.display_name;
		if (typeof metadataName === "string" && metadataName.trim()) {
			return metadataName.trim();
		}

		const email = user?.()?.email;
		if (!email) return "";
		return email;
	};

	return { name, customName, setCustomName };
}
