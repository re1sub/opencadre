import { Show } from "solid-js";
import { bubbleMenuButton } from "../editorBubbleMenu.css";
import type { ToolbarButtonDef } from "../types";

interface ToolbarButtonProps {
	button: ToolbarButtonDef;
	id: string;
	onClick: () => void;
	active: () => boolean;
	activeClass?: string;
	showLabels?: boolean;
}

const ToolbarButton = (props: ToolbarButtonProps) => {
	return (
		<>
			<wa-button
				id={props.id}
				size="s"
				appearance="plain"
				onClick={props.onClick}
				class={props.showLabels ? bubbleMenuButton : ""}
				classList={{
					[props.activeClass ?? "bubble-menu-is-active"]: props.active(),
				}}
			>
				<wa-icon
					name={props.button.icon}
					label={props.button.label}
					slot={props.showLabels ? "start" : ""}
				></wa-icon>
				<Show when={props.showLabels}>{props.button.label}</Show>
			</wa-button>
			<Show when={!props.showLabels}>
				<wa-tooltip
					for={props.id}
					on:wa-after-hide={(e) => e.stopPropagation()}
				>
					{props.button.label}
				</wa-tooltip>
			</Show>
		</>
	);
};

export default ToolbarButton;
