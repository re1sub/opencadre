import { createSignal } from "solid-js";

const [open, setOpen] = createSignal(false);

export function useAiAssistant() {
	return {
		open,
		toggle: () => setOpen((value) => !value),
		close: () => setOpen(false),
	};
}
