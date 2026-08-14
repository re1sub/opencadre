import type { ToolbarButton as ToolbarButtonDef } from "../toolbar";

interface ToolbarButtonProps {
	button: ToolbarButtonDef;
	id: string;
	onClick: () => void;
	activeClass: string;
	active: () => boolean;
}

const ToolbarButton = (props: ToolbarButtonProps) => (
	<>
		<wa-button
			id={props.id}
			size="s"
			appearance="plain"
			onClick={props.onClick}
			classList={{ [props.activeClass]: props.active() }}
		>
			<wa-icon name={props.button.icon} label={props.button.label}></wa-icon>
		</wa-button>
		<wa-tooltip for={props.id}>{props.button.label}</wa-tooltip>
	</>
);

export default ToolbarButton;
