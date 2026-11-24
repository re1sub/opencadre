import { createSignal } from "solid-js";
import { createResizablePanel } from "./createResizablePanel";

const panel = createResizablePanel({
	storageKey: "workspace.sidebarWidth",
	minWidth: 300,
	maxWidth: 480,
	defaultWidth: 300,
	direction: "start",
});

const NAV_SLOTS =
	"[slot='navigation-header'], [slot='navigation'], [slot='navigation-footer']";

const inNav = (el: EventTarget | null) =>
	el instanceof Element && el.closest(NAV_SLOTS) !== null;

export function useSidebarResize() {
	// Permanent user preference.
	const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);

	// Temporary state used only while hovering the collapsed edge.
	const [sidebarHovered, setSidebarHovered] = createSignal(false);

	return {
		sidebarWidth: panel.width,
		sidebarCollapsed,
		setSidebarCollapsed,
		sidebarHovered,
		setSidebarHovered,
		onResizePointerDown: panel.onResizePointerDown,
		inNav,
	};
}
