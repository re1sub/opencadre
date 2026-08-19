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

	const handleTouchStart = (e: TouchEvent) => {
		if (e.touches.length !== 1) return;

		const touch = e.touches[0];
		startX = touch.clientX;
		startY = touch.clientY;

		const currentlyOpen = isOpen();

		if (!currentlyOpen && startX <= edgeThreshold) {
			tracking = true;
		} else if (currentlyOpen) {
			tracking = true;
		}
	};

	const handleTouchMove = (e: TouchEvent) => {
		if (!tracking) return;

		const touch = e.touches[0];
		if (!touch) return;

		const deltaX = touch.clientX - startX;
		const deltaY = touch.clientY - startY;

		// Cancel if vertical scrolling is dominant
		if (Math.abs(deltaY) > Math.abs(deltaX)) {
			tracking = false;
			return;
		}

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

		if (Math.abs(deltaX) > Math.abs(deltaY)) {
			// SWIPE RIGHT (Finger moved right) -> Open
			if (deltaX > swipeDistance) {
				onOpen();
			}
			// SWIPE LEFT (Finger moved left) -> Close
			else if (deltaX < -swipeDistance) {
				onClose();
			}
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
