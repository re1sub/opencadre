import { createSignal, For, onMount } from "solid-js";
import type { Tables } from "#/types/database";
import { uniqueValues } from "#/utils/array";
import { formatDateTime } from "#/utils/date";
import { supabase } from "#/utils/supabase";
import {
	dialogBody,
	settingsSection,
	settingsSectionTitle,
} from "./workspace.css";

type ActivityLogRow = Tables<"activity_logs"> & {
	display_name?: string | null;
};

interface SettingsActivitySectionProps {
	workspaceId: string;
}

const SettingsActivitySection = (props: SettingsActivitySectionProps) => {
	const [logs, setLogs] = createSignal<ActivityLogRow[]>([]);

	const fetchLogs = async () => {
		const { data, error } = await supabase
			.from("activity_logs")
			.select("*")
			.eq("workspace_id", props.workspaceId)
			.order("created_at", { ascending: false })
			.limit(50);
		if (error || !data) {
			console.error("Error fetching logs", error);
			return;
		}

		const userIds = uniqueValues(data, (l) => l.user_id);
		const { data: profiles } = await supabase
			.from("profiles")
			.select("id, display_name")
			.in("id", userIds as string[]);

		const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]));

		setLogs(
			data.map((l) => ({
				...l,
				display_name: l.user_id ? profileMap.get(l.user_id) : null,
			})),
		);
	};

	onMount(fetchLogs);

	return (
		<div class={dialogBody}>
			<h3 class={settingsSectionTitle}>Activity</h3>
			<wa-divider style={{ "--spacing": "0" }}></wa-divider>
			<div class={settingsSection}>
				<For each={logs()}>
					{(log) => (
						<div
							style={{
								padding: "var(--wa-space-s)",
								"border-bottom": "1px solid var(--wa-color-surface-border)",
								display: "flex",
								"flex-direction": "column",
								gap: "var(--wa-space-3xs)",
							}}
						>
							<div
								style={{ display: "flex", "justify-content": "space-between" }}
							>
								<span style={{ "font-weight": "bold" }}>
									{log.display_name ?? "System"}
								</span>
								<span
									style={{
										"font-size": "0.8em",
										color: "var(--wa-color-text-quiet)",
									}}
								>
									{formatDateTime(log.created_at)}
								</span>
							</div>
							<span style={{ "font-size": "0.9em" }}>{log.action}</span>
						</div>
					)}
				</For>
			</div>
		</div>
	);
};

export default SettingsActivitySection;
