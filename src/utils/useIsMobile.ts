import { createSignal, onCleanup, onMount } from "solid-js";

const MOBILE_BREAKPOINT = 768;

const isMobileViewport = () =>
	typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;

export function useIsMobile() {
	const [isMobile, setIsMobile] = createSignal(isMobileViewport());

	onMount(() => {
		const handleResize = () => setIsMobile(isMobileViewport());
		window.addEventListener("resize", handleResize);
		onCleanup(() => window.removeEventListener("resize", handleResize));
	});

	return isMobile;
}
