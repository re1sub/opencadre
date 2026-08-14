import { createSignal, onCleanup, onMount } from "solid-js";

export function useDialog(onClose: () => void, onRequestDelete?: () => void) {
	let dialogRef: { open: boolean } | undefined;

	const setDialogRef = (el: { open: boolean } | undefined) => {
		dialogRef = el;
	};

	const [pendingDelete, setPendingDelete] = createSignal(false);

	onMount(() => {
		const frame = requestAnimationFrame(() => {
			if (dialogRef) dialogRef.open = true;
		});
		onCleanup(() => cancelAnimationFrame(frame));
	});

	const close = () => {
		if (dialogRef) dialogRef.open = false;
	};

	const handleHide = () => {
		if (onRequestDelete && pendingDelete()) {
			onRequestDelete();
		} else {
			onClose();
		}
	};

	const handleDelete = () => {
		setPendingDelete(true);
		close();
	};

	return { ref: setDialogRef, close, handleDelete, handleHide };
}
