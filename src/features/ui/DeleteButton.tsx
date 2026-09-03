interface DeleteButtonProps {
	onDelete: () => void;
	label?: string;
	iconOnly?: boolean;
	disabled?: boolean;
}

const DeleteButton = (props: DeleteButtonProps) => {
	return (
		<wa-button
			variant="danger"
			appearance={props.iconOnly ? "plain" : "filled-outlined"}
			onClick={props.onDelete}
			aria-label={props.label || "Delete"}
			disabled={props.disabled}
		>
			<wa-icon name="trash-2" slot={props.iconOnly ? "" : "start"}></wa-icon>
			{!props.iconOnly && <span>{props.label || "Delete"}</span>}
		</wa-button>
	);
};

export default DeleteButton;
