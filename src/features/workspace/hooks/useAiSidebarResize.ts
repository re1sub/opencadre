import { createResizablePanel } from "./createResizablePanel";

const panel = createResizablePanel({
	storageKey: "opencadre:ai-sidebar-width",
	minWidth: 280,
	maxWidth: 560,
	defaultWidth: 340,
	direction: "end",
	keyboardStep: 16,
});

export function useAiSidebarResize() {
	return panel;
}
