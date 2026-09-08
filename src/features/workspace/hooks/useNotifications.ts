import type { RealtimeChannel } from "@supabase/supabase-js";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import type { Json, Tables } from "#/types/database";
import { nowIso } from "#/utils/date";
import { isPlainObject } from "#/utils/misc";
import { supabase } from "#/utils/supabase";

export type NotificationRow = Tables<"notifications">;

export type NotificationPrefs = {
	comments: boolean;
	mentions: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
	comments: true,
	mentions: true,
};

const [notifications, setNotifications] = createSignal<NotificationRow[]>([]);
const [prefs, setPrefs] = createSignal<NotificationPrefs>({
	...DEFAULT_NOTIFICATION_PREFS,
});

let channel: RealtimeChannel | null = null;
let subscribedForUserId: string | null = null;

function parsePrefs(raw: Json | null): NotificationPrefs {
	const next: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
	if (!isPlainObject(raw)) return next;

	for (const key of Object.keys(next) as Array<keyof NotificationPrefs>) {
		if (typeof raw[key] === "boolean") {
			next[key] = raw[key] as boolean;
		}
	}

	return next;
}

async function loadNotifications(userId: string) {
	const [notesResult, prefsResult] = await Promise.all([
		supabase
			.from("notifications")
			.select("*")
			.eq("user_id", userId)
			.order("created_at", { ascending: false })
			.limit(50),
		supabase
			.from("user_settings")
			.select("notifications")
			.eq("user_id", userId)
			.maybeSingle(),
	]);

	if (!notesResult.error && notesResult.data) {
		setNotifications(notesResult.data as NotificationRow[]);
	}

	if (!prefsResult.error && prefsResult.data) {
		setPrefs(parsePrefs(prefsResult.data.notifications as Json));
	}
}

async function persistPrefs(userId: string, next: NotificationPrefs) {
	await supabase.from("user_settings").upsert(
		{
			user_id: userId,
			notifications: next as unknown as Json,
			updated_at: nowIso(),
		},
		{ onConflict: "user_id" },
	);
}

export function useNotifications() {
	const { user } = useAuth();

	const unreadCount = () =>
		notifications().filter((n) => n.read_at === null).length;

	createEffect(() => {
		const id = user()?.id ?? null;

		if (id === subscribedForUserId) return;

		if (channel) {
			void supabase.removeChannel(channel);
			channel = null;
		}

		subscribedForUserId = id;

		if (!id) {
			setNotifications([]);
			setPrefs({ ...DEFAULT_NOTIFICATION_PREFS });
			return;
		}

		void loadNotifications(id);

		const userChannel = supabase
			.channel(`notifications:${id}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "notifications",
					filter: `user_id=eq.${id}`,
				},
				(payload) => {
					const row = payload.new as NotificationRow;

					setNotifications((prev) =>
						prev.some((n) => n.id === row.id)
							? prev
							: [row, ...prev].slice(0, 50),
					);
				},
			)
			.subscribe();

		channel = userChannel;

		onCleanup(() => {
			if (channel) {
				void supabase.removeChannel(channel);
				channel = null;
			}

			subscribedForUserId = null;
		});
	});

	const markRead = async (notificationId: NotificationRow["id"]) => {
		// Don't make another request if it's already read.
		const notification = notifications().find((n) => n.id === notificationId);

		if (!notification || notification.read_at !== null) return;

		const readAt = nowIso();

		const { error } = await supabase
			.from("notifications")
			.update({ read_at: readAt })
			.eq("id", notificationId);

		if (error) {
			console.error("Failed to mark notification as read", error);
			return;
		}

		setNotifications((prev) =>
			prev.map((n) =>
				n.id === notificationId ? { ...n, read_at: readAt } : n,
			),
		);
	};

	const markAllRead = async () => {
		const {
			data: { user: u },
		} = await supabase.auth.getUser();

		if (!u) return;

		const { error } = await supabase.rpc("mark_notifications_read");

		if (error) return;

		const readAt = nowIso();

		setNotifications((prev) =>
			prev.map((n) => (n.read_at === null ? { ...n, read_at: readAt } : n)),
		);
	};

	const remove = async (notificationId: NotificationRow["id"]) => {
		const currentUser = user()?.id;
		if (!currentUser) return;

		const previous = notifications();

		setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

		const { error } = await supabase
			.from("notifications")
			.delete()
			.eq("id", notificationId)
			.eq("user_id", currentUser);

		if (error) {
			console.error("Failed to delete notification", error);
			setNotifications(previous);
		}
	};

	const setPref = (key: keyof NotificationPrefs, value: boolean) => {
		const next = { ...prefs(), [key]: value };
		setPrefs(next);

		const id = user()?.id;
		if (id) void persistPrefs(id, next);
	};

	return {
		notifications,
		unreadCount,
		prefs,
		setPref,
		markRead,
		markAllRead,
		remove,
	};
}
