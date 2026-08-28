import { createSignal } from "solid-js";

const SIDEBAR_MIN_WIDTH = 300;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_DEFAULT_WIDTH = SIDEBAR_MIN_WIDTH;
const SIDEBAR_STORAGE_KEY = "workspace.sidebarWidth";

const NAV_SLOTS =
	"[slot='navigation-header'], [slot='navigation'], [slot='navigation-footer']";

const inNav = (el: EventTarget | null) =>
	el instanceof Element && el.closest(NAV_SLOTS) !== null;

function getInitialSidebarWidth(): number {
	if (typeof localStorage === "undefined") return SIDEBAR_DEFAULT_WIDTH;

	const saved = Number(localStorage.getItem(SIDEBAR_STORAGE_KEY));

	return saved >= SIDEBAR_MIN_WIDTH && saved <= SIDEBAR_MAX_WIDTH
		? saved
		: SIDEBAR_DEFAULT_WIDTH;
}

export function useSidebarResize() {
	const [sidebarWidth, setSidebarWidth] = createSignal(
		getInitialSidebarWidth(),
	);

	// Permanent user preference.
	const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);

	// Temporary state used only while hovering the collapsed edge.
	const [sidebarHovered, setSidebarHovered] = createSignal(false);

	let dragState: { startX: number; startWidth: number } | undefined;

	const onResizePointerDown = (event: PointerEvent) => {
		const target = event.currentTarget as HTMLElement;
		if (!target) return;

		target.setPointerCapture(event.pointerId);

		dragState = {
			startX: event.clientX,
			startWidth: sidebarWidth(),
		};

		document.body.style.userSelect = "none";
		document.body.style.cursor = "col-resize";

		const onMove = (moveEvent: PointerEvent) => {
			if (!dragState) return;

			const next =
				dragState.startWidth + (moveEvent.clientX - dragState.startX);

			setSidebarWidth(
				Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, next)),
			);
		};

		const onEnd = () => {
			target.removeEventListener("pointermove", onMove);
			target.removeEventListener("pointerup", onEnd);
			target.removeEventListener("pointercancel", onEnd);

			document.body.style.userSelect = "";
			document.body.style.cursor = "";

			localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth()));

			dragState = undefined;
		};

		target.addEventListener("pointermove", onMove);
		target.addEventListener("pointerup", onEnd);
		target.addEventListener("pointercancel", onEnd);
	};

	return {
		sidebarWidth,
		sidebarCollapsed,
		setSidebarCollapsed,
		sidebarHovered,
		setSidebarHovered,
		onResizePointerDown,
		inNav,
	};
}
