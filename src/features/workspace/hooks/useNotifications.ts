import type { RealtimeChannel } from "@supabase/supabase-js";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import { reportDecryptionError } from "#/features/crypto/decryptionErrors";
import { VaultDecryptionError } from "#/features/crypto/errors";
import { useVault } from "#/features/crypto/VaultProvider";
import { notificationAad } from "#/features/crypto/vault";
import type { Json, Tables } from "#/types/database";
import { nowIso } from "#/utils/date";
import { isPlainObject } from "#/utils/misc";
import { supabase } from "#/utils/supabase";

type RawNotificationRow = Tables<"notifications">;

export type NotificationRow = Omit<
	RawNotificationRow,
	"title_ciphertext" | "body_ciphertext"
> & { title: string; body: string | null };

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
let subscribedEpoch = -1;

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

async function fetchNotifications(userId: string) {
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

	return {
		rows: (notesResult.error ? [] : (notesResult.data ?? [])) as
			| RawNotificationRow[]
			| never[],
		prefsRaw: prefsResult.error
			? null
			: (prefsResult.data?.notifications ?? null),
	};
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
	const vault = useVault();

	const commentIdOf = (row: RawNotificationRow): string | null => {
		const data = row.data;
		if (!data || typeof data !== "object" || Array.isArray(data)) return null;
		const value = (data as Record<string, unknown>).comment_id;
		return typeof value === "string" ? value : null;
	};

	const openNotification = async (
		row: RawNotificationRow,
	): Promise<NotificationRow> => {
		const { title_ciphertext, body_ciphertext, ...rest } = row;
		const commentId = commentIdOf(row);
		if (!commentId) {
			const err = new VaultDecryptionError(
				"This notification is missing its comment reference.",
			);
			reportDecryptionError(`${row.workspace_id}:notification:${row.id}`, err);
			throw err;
		}
		const titleAad = notificationAad(row.workspace_id, commentId, "title");
		const bodyAad = notificationAad(row.workspace_id, commentId, "body");

		const [title, body] = await Promise.all([
			vault.openTextSafe(
				row.workspace_id,
				title_ciphertext,
				titleAad,
				`notification:${row.id}:title`,
			),
			body_ciphertext
				? vault.openTextSafe(
						row.workspace_id,
						body_ciphertext,
						bodyAad,
						`notification:${row.id}:body`,
					)
				: Promise.resolve(null),
		]);
		return { ...rest, title, body };
	};

	const unreadCount = () =>
		notifications().filter((n) => n.read_at === null).length;

	createEffect(() => {
		const id = user()?.id ?? null;
		const status = vault.status();
		const epoch = vault.epoch();

		if (id === subscribedForUserId && epoch === subscribedEpoch) return;

		if (channel) {
			void supabase.removeChannel(channel);
			channel = null;
		}

		subscribedForUserId = id;
		subscribedEpoch = epoch;

		if (!id || status !== "unlocked") {
			setNotifications([]);
			if (!id) setPrefs({ ...DEFAULT_NOTIFICATION_PREFS });
			return;
		}

		void (async () => {
			const { rows, prefsRaw } = await fetchNotifications(id);
			const opened = (
				await Promise.all(
					rows.map(async (row) => {
						try {
							return await openNotification(row);
						} catch {
							return null;
						}
					}),
				)
			).filter((item): item is NotificationRow => item !== null);
			setNotifications(opened);
			setPrefs(parsePrefs(prefsRaw as Json | null));
		})();

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
					const row = payload.new as RawNotificationRow;
					void openNotification(row)
						.then((item) => {
							setNotifications((prev) =>
								prev.some((n) => n.id === item.id)
									? prev
									: [item, ...prev].slice(0, 50),
							);
						})
						.catch(() => {});
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
			subscribedEpoch = -1;
		});
	});

	const markRead = async (notificationId: NotificationRow["id"]) => {
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
