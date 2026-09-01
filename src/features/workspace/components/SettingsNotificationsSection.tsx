import { For } from "solid-js";
import { dialogBody, dialogLabel, settingsSection } from "./workspace.css";

const NOTIFICATION_OPTIONS = [
	{ label: "Email notifications", key: "email" },
	{ label: "In-app notifications", key: "inapp" },
	{ label: "When I'm mentioned", key: "mentions" },
	{ label: "Comments on my cards", key: "comments" },
];

const SettingsNotificationsSection = () => (
	<div class={dialogBody}>
		<p class={dialogLabel}>
			Notification preferences are a future feature. Here's a preview of the
			options.
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
						<wa-switch disabled aria-label={item.label}></wa-switch>
					</div>
				)}
			</For>
		</div>
	</div>
);

export default SettingsNotificationsSection;
