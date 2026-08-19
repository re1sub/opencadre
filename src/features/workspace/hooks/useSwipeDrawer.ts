import { onCleanup, onMount } from "solid-js";

interface SwipeDrawerOptions {
	isOpen: () => boolean;
	onOpen: () => void;
	onClose: () => void;
	edgeThreshold?: number;
	swipeDistance?: number;
}

export function useSwipeDrawer({
	isOpen,
	onOpen,
	onClose,
	edgeThreshold = 50,
	swipeDistance = 40,
}: SwipeDrawerOptions) {
	let startX = 0;
	let startY = 0;
	let tracking = false;
	let horizontalGesture = false;

	const isInteractive = (target: EventTarget | null) => {
		return (
			target instanceof HTMLElement &&
			!!target.closest(
				'button, a, input, textarea, select, [role="button"], [data-toggle-nav]',
			)
		);
	};

	const handleTouchStart = (e: TouchEvent) => {
		if (e.touches.length !== 1) return;

		const touch = e.touches[0];
		if (!touch) return;

		// Never treat normal UI controls as swipe gestures.
		if (isInteractive(e.target)) {
			tracking = false;
			return;
		}

		startX = touch.clientX;
		startY = touch.clientY;
		horizontalGesture = false;

		const currentlyOpen = isOpen();

		// Closed: only allow opening from the left edge.
		if (!currentlyOpen) {
			tracking = startX <= edgeThreshold;
			return;
		}

		// Open: allow closing from anywhere except interactive elements.
		tracking = true;
	};

	const handleTouchMove = (e: TouchEvent) => {
		if (!tracking) return;

		const touch = e.touches[0];
		if (!touch) return;

		const deltaX = touch.clientX - startX;
		const deltaY = touch.clientY - startY;

		// Once vertical movement dominates, this is normal scrolling.
		if (!horizontalGesture && Math.abs(deltaY) > Math.abs(deltaX)) {
			tracking = false;
			return;
		}

		// Don't interfere with tiny movements.
		if (Math.abs(deltaX) < 10) return;

		horizontalGesture = true;

		if (e.cancelable) {
			e.preventDefault();
		}
	};

	const handleTouchEnd = (e: TouchEvent) => {
		if (!tracking) return;

		tracking = false;

		const touch = e.changedTouches[0];
		if (!touch) return;

		const deltaX = touch.clientX - startX;
		const deltaY = touch.clientY - startY;

		if (!horizontalGesture) return;

		// Ignore mostly-vertical gestures.
		if (Math.abs(deltaY) >= Math.abs(deltaX)) return;

		if (!isOpen() && deltaX >= swipeDistance) {
			onOpen();
		} else if (isOpen() && deltaX <= -swipeDistance) {
			onClose();
		}
	};

	onMount(() => {
		window.addEventListener("touchstart", handleTouchStart, {
			capture: true,
			passive: true,
		});

		window.addEventListener("touchmove", handleTouchMove, {
			capture: true,
			passive: false,
		});

		window.addEventListener("touchend", handleTouchEnd, {
			capture: true,
			passive: true,
		});
	});

	onCleanup(() => {
		window.removeEventListener("touchstart", handleTouchStart, {
			capture: true,
		});

		window.removeEventListener("touchmove", handleTouchMove, {
			capture: true,
		});

		window.removeEventListener("touchend", handleTouchEnd, {
			capture: true,
		});
	});
}
