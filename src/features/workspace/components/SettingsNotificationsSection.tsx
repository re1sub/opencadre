import { For } from "solid-js";
import { useNotifications } from "../hooks/useNotifications";
import { dialogBody, dialogLabel, settingsSection } from "./workspace.css";

const NOTIFICATION_OPTIONS = [
	{
		label: "When I'm mentioned",
		description: "Get notified when someone mentions you in a page.",
		key: "mentions" as const,
	},
	{
		label: "Comments on pages",
		description: "Get notified when someone comments in a workspace page.",
		key: "comments" as const,
	},
];

const SettingsNotificationsSection = () => {
	const { prefs, setPref } = useNotifications();

	return (
		<div class={dialogBody}>
			<p class={dialogLabel}>
				Choose which updates you want to be notified about. Your inbox is
				available from the bell icon in the top bar.
			</p>
			<div class={settingsSection}>
				<For each={NOTIFICATION_OPTIONS}>
					{(item) => (
						<div
							style={{
								display: "flex",
								"align-items": "center",
								"justify-content": "space-between",
								gap: "var(--wa-space-s)",
							}}
						>
							<span style={{ color: "var(--wa-color-text-normal)" }}>
								{item.label}
							</span>
							<wa-switch
								checked={prefs()[item.key]}
								aria-label={item.label}
								onChange={(e) =>
									setPref(
										item.key,
										Boolean((e.currentTarget as HTMLInputElement).checked),
									)
								}
							></wa-switch>
						</div>
					)}
				</For>
			</div>
		</div>
	);
};

export default SettingsNotificationsSection;
