interface DeleteButtonProps {
	onDelete: () => void;
	label?: string;
	iconOnly?: boolean;
}

const DeleteButton = ({ onDelete, label, iconOnly }: DeleteButtonProps) => {
	return (
		<wa-button
			variant="danger"
			appearance={iconOnly ? "plain" : "filled-outlined"}
			onClick={onDelete}
			aria-label={label ?? "Delete"}
		>
			<wa-icon name="trash-2" slot={iconOnly ? "" : "start"}></wa-icon>
			{label && !iconOnly && <span>{label}</span>}
		</wa-button>
	);
};

export default DeleteButton;
