interface DeleteButtonProps {
	onDelete: () => void;
	label?: string;
	iconOnly?: boolean;
}

const DeleteButton = ({
	onDelete,
	label = "Delete",
	iconOnly,
}: DeleteButtonProps) => {
	return (
		<wa-button
			variant="danger"
			appearance={iconOnly ? "plain" : "filled-outlined"}
			onClick={onDelete}
			aria-label={label}
		>
			<wa-icon name="trash-2" slot={iconOnly ? "" : "start"}></wa-icon>
			{!iconOnly && <span>{label}</span>}
		</wa-button>
	);
};

export default DeleteButton;
