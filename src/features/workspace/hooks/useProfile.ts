import type { User } from "@supabase/supabase-js";
import { createEffect, createSignal } from "solid-js";
import { reportDecryptionError } from "#/features/crypto/decryptionErrors";
import { VaultDecryptionError } from "#/features/crypto/errors";
import { useVault } from "#/features/crypto/VaultProvider";
import { supabase } from "#/utils/supabase";

const [customName, setCustomName] = createSignal<string | null>(null);
const [pendingDisplayName, setPendingDisplayName] = createSignal<string | null>(
	null,
);
const [loadedFor, setLoadedFor] = createSignal<string | null>(null);

let lastPersisted: string | null = null;

export { setPendingDisplayName };

export function useProfile(user?: () => User | null | undefined) {
	const vault = useVault();
	const userId = () => user?.()?.id ?? null;

	createEffect(() => {
		const id = userId();
		const status = vault.status();
		if (!id || status !== "unlocked" || loadedFor() === id) return;

		void (async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select("display_name_ciphertext")
				.eq("id", id)
				.maybeSingle();
			if (error) return;

			let name: string | null = null;
			if (data?.display_name_ciphertext) {
				try {
					name = await vault.openDisplayName(data.display_name_ciphertext);
				} catch (err) {
					if (err instanceof VaultDecryptionError) {
						reportDecryptionError(`${id}:profile:display_name`, err);
					} else {
						console.error("Failed to open the display name", err);
					}
					// Keep the stored ciphertext and the fallback name untouched.
					setLoadedFor(id);
					return;
				}
			} else {
				name = pendingDisplayName();
			}

			lastPersisted = data?.display_name_ciphertext ? name : null;
			setCustomName(name?.trim() || null);
			setPendingDisplayName(null);
			setLoadedFor(id);
		})();
	});

	createEffect(() => {
		const id = userId();
		const name = customName();
		const status = vault.status();
		if (!id || status !== "unlocked" || loadedFor() !== id) return;

		const trimmed = name?.trim() || null;
		if (trimmed === lastPersisted) return;
		lastPersisted = trimmed;

		void (async () => {
			try {
				const display_name_ciphertext = trimmed
					? await vault.sealDisplayName(trimmed)
					: null;
				const { error } = await supabase.from("profiles").upsert({
					id,
					display_name_ciphertext,
					updated_at: new Date().toISOString(),
				});
				if (error) lastPersisted = null;
			} catch {
				lastPersisted = null;
			}
		})();
	});

	const name = () => {
		const custom = customName();
		if (custom?.trim()) return custom.trim();

		const email = user?.()?.email;
		if (!email) return "";
		return email;
	};

	return {
		name,
		customName,
		setCustomName,
		setPendingDisplayName,
	};
}
