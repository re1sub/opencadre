import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";

const measureWidth = (element: Element | null | undefined) => {
	if (!element) return 0;

	return Math.round(element.getBoundingClientRect().width);
};

export function useElementWidth(
	getElement: Accessor<Element | null | undefined>,
) {
	const [width, setWidth] = createSignal(measureWidth(getElement()));

	createEffect(() => {
		const element = getElement();
		if (!element) {
			setWidth(0);
			return;
		}

		setWidth(measureWidth(element));

		if (typeof ResizeObserver === "undefined") return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;

			const borderBox = entry.borderBoxSize?.[0];
			const nextWidth = borderBox
				? borderBox.inlineSize
				: entry.contentRect.width;

			setWidth(Math.round(nextWidth));
		});

		observer.observe(element);
		onCleanup(() => observer.disconnect());
	});

	return width;
}
