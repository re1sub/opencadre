import { createSignal } from "solid-js";
import { useLocalStorage } from "#/utils/useLocalStorage";

export type ResizeDirection = "start" | "end";

interface ResizablePanelOptions {
	storageKey: string;
	minWidth: number;
	maxWidth: number;
	defaultWidth: number;
	direction: ResizeDirection;
	keyboardStep?: number;
}

export function createResizablePanel(options: ResizablePanelOptions) {
	const { storageKey, minWidth, maxWidth, defaultWidth, direction } = options;
	const keyboardStep = options.keyboardStep ?? 16;

	const [storedWidth, setStoredWidth] = useLocalStorage(
		storageKey,
		defaultWidth,
		(raw, fallback) => {
			const parsed = Number(raw);
			return Number.isFinite(parsed) && parsed >= minWidth && parsed <= maxWidth
				? parsed
				: fallback;
		},
	);

	const [dragWidth, setDragWidth] = createSignal<number | null>(null);
	const [maxWidthOverride, setMaxWidthOverride] = createSignal<number | null>(
		null,
	);

	const getMaxWidth = () => Math.max(minWidth, maxWidthOverride() ?? maxWidth);

	const setMaxWidth = (value: number | null) =>
		setMaxWidthOverride(
			value === null
				? null
				: Math.round(Math.min(maxWidth, Math.max(minWidth, value))),
		);

	const clampWidth = (value: number) =>
		Math.round(Math.min(getMaxWidth(), Math.max(minWidth, value)));

	const width = () => clampWidth(dragWidth() ?? storedWidth());
	const dragSign = direction === "end" ? -1 : 1;

	const onResizePointerDown = (event: PointerEvent) => {
		const target = event.currentTarget as HTMLElement;
		if (!target) return;

		target.setPointerCapture(event.pointerId);

		const startX = event.clientX;
		const startWidth = width();
		let finished = false;
		let moved = false;

		document.body.style.userSelect = "none";
		document.body.style.cursor = "col-resize";

		const onMove = (moveEvent: PointerEvent) => {
			moved = true;
			setDragWidth(
				clampWidth(startWidth + dragSign * (moveEvent.clientX - startX)),
			);
		};

		const onEnd = () => {
			if (finished) return;
			finished = true;

			target.removeEventListener("pointermove", onMove);
			target.removeEventListener("pointerup", onEnd);
			target.removeEventListener("pointercancel", onEnd);
			target.removeEventListener("lostpointercapture", onEnd);

			document.body.style.userSelect = "";
			document.body.style.cursor = "";

			if (moved) setStoredWidth(clampWidth(width()));
			setDragWidth(null);
		};

		target.addEventListener("pointermove", onMove);
		target.addEventListener("pointerup", onEnd);
		target.addEventListener("pointercancel", onEnd);
		target.addEventListener("lostpointercapture", onEnd);
	};

	const onResizeKeyDown = (event: KeyboardEvent) => {
		const arrowDelta = (key: "ArrowLeft" | "ArrowRight") => {
			const increases =
				key === (direction === "end" ? "ArrowLeft" : "ArrowRight");
			return increases ? keyboardStep : -keyboardStep;
		};

		switch (event.key) {
			case "ArrowLeft":
			case "ArrowRight":
				event.preventDefault();
				setStoredWidth(clampWidth(width() + arrowDelta(event.key)));
				break;
			case "Home":
				event.preventDefault();
				setStoredWidth(minWidth);
				break;
			case "End":
				event.preventDefault();
				setStoredWidth(getMaxWidth());
				break;
		}
	};

	return {
		width,
		minWidth,
		maxWidth: getMaxWidth,
		setMaxWidth,
		onResizePointerDown,
		onResizeKeyDown,
	};
}
