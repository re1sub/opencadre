import { createSignal, For, Show } from "solid-js";
import { useDialog } from "#/utils/useDialog";
import type { Page, PageKind, Workspace } from "../types";
import SettingsGeneralSection from "./SettingsGeneralSection";
import SettingsKeyboardSection from "./SettingsKeyboardSection";
import SettingsMembersSection from "./SettingsMembersSection";
import SettingsNotificationsSection from "./SettingsNotificationsSection";
import SettingsWorkspaceSection from "./SettingsWorkspaceSection";
import {
	settingsBack,
	settingsDialogContainer,
	settingsFooter,
	settingsFooterSpacer,
	settingsLayout,
	settingsNav,
	settingsNavButton,
	settingsPanel,
	settingsPanelOpen,
} from "./workspace.css";

export type SettingsSection =
	| "general"
	| "workspace"
	| "members"
	| "keyboard"
	| "notifications";

interface SettingsDialogProps {
	workspaceId: string;
	workspace: () => Workspace | null;
	pages: () => Page[];
	initialSection?: SettingsSection;
	onUpdateWorkspace: (
		id: string,
		fields: {
			name?: string;
			description?: string | null;
			defaultPageKind?: PageKind;
		},
	) => void;
	onAddPage: (
		kind: PageKind,
		opts?: { title?: string; content?: string },
	) => Promise<Page>;
	onDeleteWorkspace: (id: string) => void;
	onLeaveWorkspace: (id: string) => void;
	onClose: () => void;
}

const SECTIONS: {
	value: SettingsSection;
	label: string;
	icon: string;
}[] = [
	{ value: "general", label: "General", icon: "settings" },
	{ value: "workspace", label: "Workspace", icon: "briefcase" },
	{ value: "members", label: "Members", icon: "users" },
	{ value: "keyboard", label: "Keyboard", icon: "keyboard" },
	{ value: "notifications", label: "Notifications", icon: "bell" },
];

const SettingsDialog = (props: SettingsDialogProps) => {
	const dialog = useDialog(props.onClose);

	const [section, setSection] = createSignal<SettingsSection>(
		props.initialSection ?? "general",
	);
	const [panelOpen, setPanelOpen] = createSignal(Boolean(props.initialSection));

	const selectSection = (value: SettingsSection) => {
		setSection(value);
		setPanelOpen(true);
	};

	return (
		<wa-dialog
			ref={dialog.ref}
			light-dismiss
			label="Settings"
			on:wa-after-hide={dialog.handleHide}
			class={settingsDialogContainer}
		>
			<div class={settingsLayout}>
				<nav class={settingsNav} aria-label="Settings sections">
					<For each={SECTIONS}>
						{(item) => (
							<wa-button
								type="button"
								variant={section() === item.value ? "brand" : "neutral"}
								with-caret
								appearance="plain"
								aria-current={section() === item.value ? "true" : undefined}
								class={settingsNavButton}
								onClick={() => selectSection(item.value)}
							>
								<wa-icon
									slot="start"
									name={item.icon}
									label={item.label}
								></wa-icon>
								{item.label}
							</wa-button>
						)}
					</For>
				</nav>

				<div class={`${settingsPanel} ${panelOpen() ? settingsPanelOpen : ""}`}>
					<wa-button
						type="button"
						variant="neutral"
						appearance="plain"
						class={settingsBack}
						onClick={() => setPanelOpen(false)}
					>
						<wa-icon slot="start" name="chevron-left" label="Back"></wa-icon>
						Back
					</wa-button>

					<Show when={section() === "general"}>
						<SettingsGeneralSection />
					</Show>

					<Show when={section() === "workspace"}>
						<SettingsWorkspaceSection
							workspaceId={props.workspaceId}
							workspace={props.workspace}
							pages={props.pages}
							onUpdateWorkspace={props.onUpdateWorkspace}
							onAddPage={props.onAddPage}
							onDeleteWorkspace={props.onDeleteWorkspace}
							onLeaveWorkspace={props.onLeaveWorkspace}
						/>
					</Show>

					<Show when={section() === "members"}>
						<SettingsMembersSection workspaceId={props.workspaceId} />
					</Show>

					<Show when={section() === "keyboard"}>
						<SettingsKeyboardSection />
					</Show>

					<Show when={section() === "notifications"}>
						<SettingsNotificationsSection />
					</Show>
				</div>
			</div>

			<div slot="footer">
				<div class={settingsFooter}>
					<Show when={section() === "notifications"}>
						<wa-tag variant="warning">Planned</wa-tag>
					</Show>
					<span class={settingsFooterSpacer}></span>
					<wa-button variant="brand" onClick={dialog.close}>
						Done
					</wa-button>
				</div>
			</div>
		</wa-dialog>
	);
};

export default SettingsDialog;
