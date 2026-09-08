import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import type { Tables } from "#/types/database";
import { formatTimestamp } from "#/utils/date";
import { registerRealtimeHandlers } from "#/utils/realtime/registrar";
import { supabase } from "#/utils/supabase";
import { useLastEdit } from "../hooks/useLastEdit";
import type { Page, WorkspaceMember } from "../types";
import { PAGE_KIND_META } from "../types";
import {
	detailGrid,
	detailLabel,
	detailRow,
	detailSection,
	detailValue,
	drawerBody,
	editedBadge,
	kindBadge,
	sectionTitle,
	timeline,
	timelineAction,
	timelineHeader,
	timelineItem,
	timelineTime,
	tooltipCard,
	tooltipLabel,
	tooltipTime,
	tooltipTimeSpaced,
} from "./pageDetails.css";

interface PageDetailsProps {
	page: Page;
	members: WorkspaceMember[];
}

type ActivityRow = Tables<"activity_logs"> & { display_name?: string | null };

const PageDetails = (props: PageDetailsProps) => {
	const lastEdit = useLastEdit(() => props.page.id);
	const [logs, setLogs] = createSignal<ActivityRow[]>([]);
	const { user } = useAuth();

	const dateFormatter = new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	});

	const getActorName = (log: ActivityRow) => {
		if (!log.user_id) return "Someone";
		if (log.user_id === user()?.id) return "You";
		return (
			log.display_name ??
			props.members.find((m) => m.id === log.user_id)?.name ??
			"Someone"
		);
	};

	const humanizeAction = (log: ActivityRow) => {
		const actor = getActorName(log);
		const meta = log.metadata as { title?: string; excerpt?: string } | null;

		switch (log.action) {
			case "page_create":
				return `${actor} created this page`;
			case "page_delete":
				return `${actor} deleted this page`;
			case "page_edit":
				if (meta?.title) return `${actor} renamed this page to "${meta.title}"`;
				if (meta?.excerpt)
					return `${actor} edited this page — added "${meta.excerpt}"`;
				return `${actor} edited this page`;
			default:
				return `${actor} ${log.action.replace(/_/g, " ")}`;
		}
	};

	const ownerName = () =>
		props.members.find((m) => m.id === props.page.ownerId)?.name ?? "Unknown";

	const lastEditorName = () => {
		const e = lastEdit();
		if (!e) return "No edits yet";
		return props.members.find((m) => m.id === e.userId)?.name ?? "Unknown";
	};

	const kindMeta = () => PAGE_KIND_META[props.page.kind];

	createEffect(() => {
		const id = props.page.id;
		if (!id) return;
		void (async () => {
			const { data, error } = await supabase
				.from("activity_logs")
				.select("*")
				.eq("entity_type", "page")
				.eq("entity_id", id)
				.order("created_at", { ascending: false })
				.limit(50);
			if (error || !data) {
				setLogs([]);
				return;
			}
			if (data.length === 0) {
				setLogs([]);
				return;
			}
			const userIds = [...new Set(data.map((l) => l.user_id).filter(Boolean))];
			let profileMap = new Map<string, string | null>();
			if (userIds.length > 0) {
				const { data: profiles } = await supabase
					.from("profiles")
					.select("id, display_name")
					.in("id", userIds as string[]);
				profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]));
			}
			setLogs(
				data.map((l) => ({
					...l,
					display_name: l.user_id ? (profileMap.get(l.user_id!) ?? null) : null,
				})),
			);
		})();
	});

	createEffect(() => {
		const id = props.page.id;
		if (!id) return;

		const handleInsert = async (r: Tables<"activity_logs">) => {
			if (r.entity_type !== "page" || r.entity_id !== id) return;
			let display_name: string | null = null;
			if (r.user_id) {
				display_name =
					props.members.find((m) => m.id === r.user_id)?.name ?? null;
				if (!display_name) {
					const { data } = await supabase
						.from("profiles")
						.select("display_name")
						.eq("id", r.user_id)
						.maybeSingle();
					display_name = data?.display_name ?? null;
				}
			}
			setLogs((prev) => {
				if (prev.some((p) => p.id === r.id)) return prev;
				return [{ ...r, display_name } as ActivityRow, ...prev].slice(0, 50);
			});
		};

		const directChannel = supabase
			.channel(`page-activity-${id}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "activity_logs",
					filter: `entity_id=eq.${id}`,
				},
				(payload) => {
					void handleInsert(payload.new as Tables<"activity_logs">);
				},
			)
			.subscribe();

		const unregisterFallback = registerRealtimeHandlers("activity_logs", {
			applyInsert: (row) =>
				void handleInsert(row as unknown as Tables<"activity_logs">),
			applyUpdate: () => {},
			applyDelete: () => {},
		});

		onCleanup(() => {
			void supabase.removeChannel(directChannel);
			unregisterFallback();
		});
	});

	return (
		<>
			<wa-button
				id="edited-badge"
				class={editedBadge}
				appearance="plain"
				variant="neutral"
				data-drawer="open page-info-drawer"
				style={{ padding: "0 4px", "min-height": "auto" }}
			>
				Edited {formatTimestamp(props.page.updatedAt)}
			</wa-button>
			<wa-tooltip for="edited-badge" placement="bottom">
				<div class={tooltipCard}>
					<div>
						<div class={tooltipLabel}>Created by {ownerName()}</div>
						<div class={tooltipTimeSpaced}>
							{formatTimestamp(props.page.createdAt)}
						</div>
					</div>
					<div>
						<div class={tooltipLabel}>Last edited by {lastEditorName()}</div>
						<div class={tooltipTime}>
							{lastEdit() ? formatTimestamp(lastEdit()!.at) : ""}
						</div>
					</div>
				</div>
			</wa-tooltip>

			<wa-drawer
				id="page-info-drawer"
				label={`Page details : ${props.page.title || "Untitled"}`}
				placement="end"
				light-dismiss
				style={{ "--size": "28rem" }}
			>
				<div class={drawerBody}>
					<div class={detailSection}>
						<h3 class={sectionTitle}>
							<wa-icon name="file-text" label="Page"></wa-icon> Overview
						</h3>
						<wa-divider style={{ "--spacing": "0" }}></wa-divider>
						<div class={detailGrid}>
							<div class={detailRow}>
								<span class={detailLabel}>Title</span>
								<span class={detailValue}>
									{props.page.title || "Untitled"}
								</span>
							</div>
							<div class={detailRow}>
								<span class={detailLabel}>Type</span>
								<span class={`${detailValue} ${kindBadge}`}>
									<wa-icon
										name={kindMeta().icon}
										label={kindMeta().label}
									></wa-icon>
									{kindMeta().label}
								</span>
							</div>
							<div class={detailRow}>
								<span class={detailLabel}>Created</span>
								<span class={detailValue}>
									{formatTimestamp(props.page.createdAt)}
								</span>
							</div>
							<div class={detailRow}>
								<span class={detailLabel}>Created by</span>
								<span class={detailValue}>{ownerName()}</span>
							</div>
							<div class={detailRow}>
								<span class={detailLabel}>Last edited</span>
								<span class={detailValue}>
									{lastEdit() ? formatTimestamp(lastEdit()!.at) : "—"}
								</span>
							</div>
							<div class={detailRow}>
								<span class={detailLabel}>Last edited by</span>
								<span class={detailValue}>{lastEditorName()}</span>
							</div>
							<div class={detailRow}>
								<span class={detailLabel}>Page ID</span>
								<span class={detailValue} style={{ "font-size": "0.7rem" }}>
									{props.page.id}
								</span>
							</div>
						</div>
					</div>

					<div class={detailSection}>
						<h3 class={sectionTitle}>
							<wa-icon name="clock"></wa-icon> Activity
						</h3>
						<wa-divider style={{ "--spacing": "0" }}></wa-divider>
						<Show
							when={logs().length > 0}
							fallback={
								<p
									style={{
										color: "var(--wa-color-text-quiet)",
										"font-size": "var(--wa-font-size-xs)",
										margin: "0",
									}}
								>
									No activity yet for this page.
								</p>
							}
						>
							<div class={timeline}>
								<For each={logs()}>
									{(log) => {
										const text = humanizeAction(log);
										return (
											<div class={timelineItem}>
												<div class={timelineHeader}>
													<span class={timelineAction} title={text}>
														{text}
													</span>
													<span class={timelineTime}>
														{dateFormatter.format(new Date(log.created_at))}
													</span>
												</div>
											</div>
										);
									}}
								</For>
							</div>
						</Show>
					</div>
				</div>
			</wa-drawer>
		</>
	);
};

export default PageDetails;
