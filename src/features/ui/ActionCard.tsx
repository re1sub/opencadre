import {
	actionCard,
	actionHint,
	actionIcon,
	actionLabel,
} from "../workspace/components/workspaceHome.css";

interface ActionCardProps {
	icon: string;
	iconLabel: string;
	label: string;
	hint: string;
	onClick: () => void;
}

const ActionCard = (props: ActionCardProps) => (
	<wa-button
		type="button"
		variant="neutral"
		appearance="plain"
		class={actionCard}
		onClick={props.onClick}
	>
		<wa-icon
			class={actionIcon}
			name={props.icon}
			label={props.iconLabel}
			slot="start"
		></wa-icon>

		<span class={actionLabel}>{props.label}</span>
		<p class={actionHint}>{props.hint}</p>
	</wa-button>
);

export default ActionCard;
