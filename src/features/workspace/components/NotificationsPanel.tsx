import type WaDrawer from "@awesome.me/webawesome/dist/components/drawer/drawer.js";
import { For, Show } from "solid-js";
import { Motion } from "solid-motionone";
import DeleteButton from "#/features/ui/DeleteButton";
import { formatDateTime } from "#/utils/date";
import type { NotificationRow } from "../hooks/useNotifications";
import { useNotifications } from "../hooks/useNotifications";
import {
	bellBadge,
	bellButton,
	empty,
	item,
	itemBody,
	itemContainer,
	itemDelete,
	itemHeader,
	itemRow,
	itemTime,
	itemTitle,
} from "./notificationPanel.css";

const MENTION_LINK = /\[([^\]]+)\]\(mention:[0-9a-fA-F-]{36}\)/g;

const readableBody = (body: string | null): string =>
	(body ?? "").replace(MENTION_LINK, "$1");

const NotificationsPanel = () => {
	let drawerRef!: WaDrawer;

	const { notifications, unreadCount, markRead, markAllRead, remove } =
		useNotifications();

	const contextHref = (n: NotificationRow) => {
		if (n.entity_type === "card" && n.page_id && n.entity_id)
			return `/workspace/p/${n.page_id}?c=${n.entity_id}`;

		if (n.entity_type === "page" && n.entity_id)
			return `/workspace/p/${n.entity_id}`;

		if (n.page_id) return `/workspace/p/${n.page_id}`;

		return null;
	};

	const cappedCount = () => {
		const n = unreadCount();
		return n > 99 ? "99+" : n;
	};

	return (
		<>
			<wa-button
				class={bellButton}
				appearance="plain"
				variant="neutral"
				aria-label="Notifications"
				data-drawer="open notifications-drawer"
			>
				<wa-icon name="bell" label="Notifications"></wa-icon>
				<For each={[unreadCount()]}>
					{(count) => (
						<Motion.div
							class={bellBadge}
							initial={{ opacity: 0, scale: 0 }}
							animate={{
								opacity: count > 0 ? 1 : 0,
								scale: count > 0 ? 1 : 0,
								transition: { duration: 0.2 },
							}}
						>
							{cappedCount()}
						</Motion.div>
					)}
				</For>
			</wa-button>

			<wa-drawer
				id="notifications-drawer"
				label="Notifications"
				placement="end"
				light-dismiss
				style={{ "--size": "22rem" }}
				ref={(el) => (drawerRef = el)}
			>
				<Show when={unreadCount() > 0}>
					<wa-button
						size="small"
						appearance="plain"
						onClick={() => markAllRead()}
						style={{ "margin-bottom": "var(--wa-space-s)" }}
					>
						Mark all read
					</wa-button>
				</Show>
				<Show
					when={notifications().length > 0}
					fallback={
						<p class={empty}>You're all caught up. No notifications yet.</p>
					}
				>
					<div class={itemContainer}>
						<For each={notifications()}>
							{(n) => {
								const href = contextHref(n);

								return (
									<div class={itemRow}>
										<wa-button
											class={item}
											href={href ?? undefined}
											appearance={n.read_at === null ? "filled" : "plain"}
											variant="brand"
											onClick={() => {
												void markRead(n.id);
												drawerRef.open = false;
											}}
										>
											<span class={itemHeader}>
												<span class={itemTitle}>{n.title}</span>
												<span class={itemTime}>
													{formatDateTime(n.created_at)}
												</span>
											</span>
											<Show when={n.body}>
												<span class={itemBody}>{readableBody(n.body)}</span>
											</Show>
										</wa-button>
										<DeleteButton
											class={itemDelete}
											iconOnly
											label={`Delete notification: ${n.title}`}
											onDelete={() => void remove(n.id)}
										/>
									</div>
								);
							}}
						</For>
					</div>
				</Show>
			</wa-drawer>
		</>
	);
};

export default NotificationsPanel;
