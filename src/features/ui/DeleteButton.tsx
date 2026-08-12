interface DeleteButtonProps {
	onDelete: () => void;
	label?: string;
}

const DeleteButton = ({ onDelete, label }: DeleteButtonProps) => {
	return (
		<wa-button variant="danger" appearance="filled-outlined" onClick={onDelete}>
			<wa-icon name="trash-2" slot="start"></wa-icon>
			{label ?? "Delete"}
		</wa-button>
	);
};

export default DeleteButton;
