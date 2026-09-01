import { createEffect, createSignal } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import type { Json } from "#/types/database";
import { supabase } from "#/utils/supabase";
import {
	DEFAULT_SHORTCUTS,
	SHORTCUT_ACTIONS,
	type ShortcutAction,
	type ShortcutConfig,
	type Shortcuts,
} from "../constants/shortcuts";

const [shortcuts, setShortcuts] = createSignal<Shortcuts>({
	...DEFAULT_SHORTCUTS,
});

let loadedForUserId: string | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseShortcuts(raw: Json | null): Shortcuts {
	const next: Shortcuts = { ...DEFAULT_SHORTCUTS };
	if (!isRecord(raw)) return next;
	for (const action of SHORTCUT_ACTIONS) {
		const entry = raw[action];
		if (!isRecord(entry)) continue;
		if (typeof entry.combo === "string" && entry.combo) {
			next[action] = { ...next[action], combo: entry.combo };
		}
		if (typeof entry.enabled === "boolean") {
			next[action] = { ...next[action], enabled: entry.enabled };
		}
	}
	return next;
}

async function loadShortcuts(userId: string) {
	const { data, error } = await supabase
		.from("user_settings")
		.select("shortcuts")
		.eq("user_id", userId)
		.maybeSingle();
	if (error || !data?.shortcuts) return;
	setShortcuts(parseShortcuts(data.shortcuts as Json));
}

async function persist(next: Shortcuts) {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return;
	await supabase.from("user_settings").upsert(
		{
			user_id: user.id,
			shortcuts: next as unknown as Json,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "user_id" },
	);
}

export function useShortcuts() {
	const { user } = useAuth();

	createEffect(() => {
		const id = user()?.id ?? null;
		if (id === loadedForUserId) return;
		loadedForUserId = id;
		if (!id) {
			setShortcuts({ ...DEFAULT_SHORTCUTS });
			return;
		}
		void loadShortcuts(id);
	});

	const setShortcut = (action: ShortcutAction, config: ShortcutConfig) => {
		const next = { ...shortcuts(), [action]: config };
		setShortcuts(next);
		void persist(next);
	};

	const toggleShortcut = (action: ShortcutAction, enabled: boolean) => {
		setShortcut(action, { ...shortcuts()[action], enabled });
	};

	const resetShortcut = (action: ShortcutAction) => {
		setShortcut(action, { ...DEFAULT_SHORTCUTS[action] });
	};

	const resetAll = () => {
		const next = { ...DEFAULT_SHORTCUTS };
		setShortcuts(next);
		void persist(next);
	};

	return { shortcuts, setShortcut, toggleShortcut, resetShortcut, resetAll };
}
