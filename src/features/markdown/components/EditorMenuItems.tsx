import { createEffect, For } from "solid-js";
import { toolbarGroups } from "../toolbar";
import type { MenuItemsProps } from "../types";
import ToolbarButton from "./ToolbarButton";

const EditorMenuItems = (props: MenuItemsProps) => {
	const groups = () => props.groups ?? toolbarGroups;

	// Helper to compute flat index based on current group & item indices
	const getFlatIndex = (groupIdx: number, itemIdx: number) => {
		let count = 0;
		const currentGroups = groups();
		for (let i = 0; i < groupIdx; i++) {
			count += currentGroups[i]?.length ?? 0;
		}
		return count + itemIdx;
	};

	return (
		<For each={groups()}>
			{(group, groupIndex) => (
				<>
					{groupIndex() > 0 && (
						<wa-divider orientation="horizontal"></wa-divider>
					)}
					<For each={group}>
						{(button, buttonIndex) => {
							const isFocused = () => {
								if (!props.isCommandMenu) return false;
								const flatIndex = getFlatIndex(groupIndex(), buttonIndex());
								return props.selectedIndex === flatIndex;
							};

							let itemRef!: HTMLDivElement;

							createEffect(() => {
								if (isFocused() && itemRef) {
									itemRef.scrollIntoView({
										block: "nearest",
										behavior: "smooth",
									});
								}
							});

							return (
								<div
									ref={(el) => (itemRef = el)}
									style={{
										"min-width": "150px",
										width: "100%",
										display: props.showLabels ? "block" : "contents",
									}}
								>
									<ToolbarButton
										button={button}
										id={button.id}
										onClick={() => {
											if (props.isCommandMenu && props.onExecuteCommand) {
												props.onExecuteCommand(button.id);
											} else {
												props.actions[button.id]?.run();
											}
										}}
										active={() => isFocused() || props.isActive(button.id)}
										showLabels={props.showLabels ?? false}
									/>
								</div>
							);
						}}
					</For>
				</>
			)}
		</For>
	);
};

export default EditorMenuItems;
