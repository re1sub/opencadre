import { createEffect, onCleanup } from "solid-js";

const RESERVED_INPUT_TYPES = new Set(["number", "range"]);

function isReservedTarget(target: EventTarget | null) {
	const el =
		target instanceof Element ? target.closest("textarea, input") : null;

	return (
		el instanceof HTMLTextAreaElement ||
		(el instanceof HTMLInputElement && RESERVED_INPUT_TYPES.has(el.type))
	);
}

function hasScrollableParent(
	target: EventTarget | null,
	scroller: HTMLElement,
	delta: number,
) {
	let el = target instanceof Element ? target.parentElement : null;

	while (el && el !== scroller) {
		if (el instanceof HTMLElement) {
			const style = getComputedStyle(el);
			const max = el.scrollHeight - el.clientHeight;

			if (
				(style.overflowY === "auto" || style.overflowY === "scroll") &&
				(delta > 0 ? el.scrollTop < max : el.scrollTop > 0)
			) {
				return true;
			}
		}

		el = el.parentElement;
	}

	return false;
}

export function useHorizontalWheelScroll(
	getTarget: () => HTMLElement | null | undefined,
	getScroller?: (host: HTMLElement) => HTMLElement | null,
) {
	createEffect(() => {
		const host = getTarget();
		if (!host) return;

		const onWheel = (event: WheelEvent) => {
			if (
				event.ctrlKey ||
				Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
				isReservedTarget(event.target)
			) {
				return;
			}

			const delta = event.deltaY;
			if (!delta) return;

			const scroller = getScroller?.(host) ?? host;

			if (
				scroller.scrollWidth <= scroller.clientWidth ||
				hasScrollableParent(event.target, scroller, delta)
			) {
				return;
			}

			event.preventDefault();

			if (getComputedStyle(scroller).scrollSnapType !== "none") {
				const items = [...scroller.children] as HTMLElement[];

				if (!items.length) return;

				const current = items.reduce(
					(closest, item, i) =>
						Math.abs(item.offsetLeft - scroller.scrollLeft) <
						Math.abs(items[closest].offsetLeft - scroller.scrollLeft)
							? i
							: closest,
					0,
				);

				const next = Math.max(
					0,
					Math.min(items.length - 1, current + Math.sign(delta)),
				);

				if (next !== current) {
					items[next].scrollIntoView({
						behavior: "smooth",
						block: "nearest",
						inline: "start",
					});
				}

				return;
			}

			scroller.scrollLeft += delta;
		};

		host.addEventListener("wheel", onWheel, { passive: false });

		onCleanup(() => host.removeEventListener("wheel", onWheel));
	});
}
