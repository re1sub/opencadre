import { For, Show } from "solid-js";
import { getInitials } from "#/utils/initials";
import type { Workspace } from "../types";
import {
	closeSidebarButton,
	navHeader,
	workspaceItem,
	workspaceName,
	workspaceTrigger,
} from "./workspace.css";

interface WorkspaceHeaderProps {
	collapsed: () => boolean;
	activeWorkspace: () => Workspace | null | undefined;
	onToggleCollapsed: () => void;
	onRename: (name: string) => void;
	onSelectWorkspace: (id: string) => void;
	workspaces: Workspace[];
	onAddWorkspace: () => void;
}

const WorkspaceHeader = (props: WorkspaceHeaderProps) => {
	const handleSelect = (e: Event) => {
		const selectEvent = e as unknown as {
			detail: { item: { value?: string } | null };
		};

		const value = selectEvent.detail.item?.value;

		if (value === "__add__") props.onAddWorkspace();
		else if (value) props.onSelectWorkspace(value);
	};

	return (
		<nav slot="navigation-header" class={navHeader}>
			<Show when={props.activeWorkspace()} fallback={null}>
				{(active) => (
					<wa-dropdown on:wa-select={handleSelect}>
						<wa-button
							type="button"
							slot="trigger"
							variant="neutral"
							appearance="plain"
							with-caret
							class={workspaceTrigger}
						>
							<wa-avatar
								initials={getInitials(active().name)}
								label={active().name}
								slot="start"
								style={{ "--size": "2rem" }}
							></wa-avatar>
							<span class={workspaceName}>{active().name}</span>
						</wa-button>

						<For each={props.workspaces}>
							{(workspace) => (
								<wa-dropdown-item
									value={workspace.id}
									type="checkbox"
									checked={workspace.id === active().id}
									class={workspaceItem}
									style={{
										"background-color":
											workspace.id === active().id
												? "var(--wa-color-neutral-fill-normal)"
												: "",
									}}
								>
									<wa-avatar
										initials={getInitials(workspace.name)}
										label={workspace.name}
										style={{ "--size": "2rem" }}
										slot="icon"
									></wa-avatar>
									{workspace.name}
								</wa-dropdown-item>
							)}
						</For>

						<wa-dropdown-item value="__add__">
							<wa-icon slot="icon" name="plus"></wa-icon>
							New workspace
						</wa-dropdown-item>
					</wa-dropdown>
				)}
			</Show>

			<wa-button
				appearance="plain"
				onClick={(e) => {
					const pageEl = (e.currentTarget as HTMLElement).closest("wa-page");

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
