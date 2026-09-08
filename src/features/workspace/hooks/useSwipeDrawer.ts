import { useDebouncedCallback } from "#/utils/useDebouncedCallback";
import { useEventListener } from "#/utils/useEventListener";

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
	let isScrolling = false;

	const endScroll = useDebouncedCallback(() => {
		isScrolling = false;
	}, 150);

	const handleScroll = () => {
		isScrolling = true;
		endScroll();
	};

	const isInteractive = (target: EventTarget | null) => {
		return (
			target instanceof HTMLElement &&
			!!target.closest(
				'button, a, input, textarea, select, [role="button"], [data-toggle-nav]',
			)
		);
	};

	// Helper to detect if touch started inside an actively scrollable container
	const isInsideScrollableContainer = (target: EventTarget | null): boolean => {
		let el = target instanceof HTMLElement ? target : null;

		while (el && el !== document.body && el !== document.documentElement) {
			const style = window.getComputedStyle(el);
			const overflowY = style.overflowY;
			const isScrollable = overflowY === "auto" || overflowY === "scroll";
			const hasScrollableContent = el.scrollHeight > el.clientHeight;

			if (isScrollable && hasScrollableContent) {
				return true;
			}
			el = el.parentElement;
		}

		return false;
	};

	const handleTouchStart = (e: TouchEvent) => {
		if (e.touches.length !== 1) return;

		// Cancel tracking if any element on page is currently in momentum scroll
		if (isScrolling) {
			tracking = false;
			return;
		}

		const touch = e.touches[0];
		if (!touch) return;

		if (isInteractive(e.target)) {
			tracking = false;
			return;
		}

		startX = touch.clientX;
		startY = touch.clientY;
		horizontalGesture = false;

		const currentlyOpen = isOpen();

		if (!currentlyOpen) {
			// When drawer is closed, don't trigger edge swipe if user is starting inside an overflow scroll view
			if (isInsideScrollableContainer(e.target)) {
				tracking = false;
				return;
			}
			tracking = startX <= edgeThreshold;
			return;
		}

		tracking = true;
	};

	const handleTouchMove = (e: TouchEvent) => {
		if (!tracking) return;

		const touch = e.touches[0];
		if (!touch) return;

		const deltaX = touch.clientX - startX;
		const deltaY = touch.clientY - startY;

		// Direction lock: If vertical movement exceeds horizontal movement, kill tracking
		if (!horizontalGesture) {
			if (Math.abs(deltaY) > Math.abs(deltaX) || Math.abs(deltaY) > 6) {
				tracking = false;
				return;
			}
			if (Math.abs(deltaX) > 10) {
				horizontalGesture = true;
			}
		}

		if (horizontalGesture && e.cancelable) {
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
		if (Math.abs(deltaY) >= Math.abs(deltaX)) return;

		if (!isOpen() && deltaX >= swipeDistance) {
			onOpen();
		} else if (isOpen() && deltaX <= -swipeDistance) {
			onClose();
		}
	};

	// Capture scroll events at root so sub-container scrolling triggers handleScroll
	useEventListener(() => document, "scroll", handleScroll, {
		capture: true,
		passive: true,
	});

	useEventListener(
		() => document,
		"touchstart",
		handleTouchStart as EventListener,
		{ capture: true, passive: true },
	);

	useEventListener(
		() => document,
		"touchmove",
		handleTouchMove as EventListener,
		{ capture: true, passive: false },
	);

	useEventListener(
		() => document,
		"touchend",
		handleTouchEnd as EventListener,
		{ capture: true, passive: true },
	);
}
