import {
	closeSidebarButton,
	navHeader,
	workspaceName,
	workspaceTrigger,
} from "./workspace.css";

interface WorkspaceHeaderProps {
	collapsed: () => boolean;
	onToggleCollapsed: () => void;
}

const WorkspaceHeader = (props: WorkspaceHeaderProps) => {
	return (
		<nav slot="navigation-header" class={navHeader}>
			<wa-dropdown>
				<wa-button
					type="button"
					slot="trigger"
					variant="neutral"
					appearance="plain"
					with-caret
					class={workspaceTrigger}
				>
					<wa-avatar
						initials="MW"
						label="Workspace"
						slot="start"
						style={{ "--size": "2rem" }}
					></wa-avatar>
					<span class={workspaceName}>My Workspace</span>
				</wa-button>

				<wa-dropdown-item value="my-workspace">
					<wa-avatar
						initials="MW"
						label="Workspace"
						slot="icon"
						style={{ "--size": "2rem" }}
					></wa-avatar>
					My Workspace
				</wa-dropdown-item>

				<wa-dropdown-item value="second-workspace">
					<wa-avatar
						initials="SW"
						label="Workspace"
						slot="icon"
						style={{ "--size": "2rem" }}
					></wa-avatar>
					Second Workspace
				</wa-dropdown-item>
			</wa-dropdown>

			<wa-button
				appearance="plain"
				onClick={(event) => {
					const pageEl = (event.currentTarget as HTMLElement).closest(
						"wa-page",
					);

					if (pageEl?.getAttribute("view") !== "desktop") {
						return;
					}

					props.onToggleCollapsed();
				}}
				class={closeSidebarButton}
			>
				<wa-icon
					name={props.collapsed() ? "pin" : "pin-off"}
					label={props.collapsed() ? "Open sidebar" : "Close sidebar"}
					style={{ "font-size": "1.3rem" }}
				></wa-icon>
			</wa-button>
		</nav>
	);
};

export default WorkspaceHeader;
