import { createEffect, createSignal, onCleanup } from "solid-js";

const TILT_FACTOR = 0.005;
const MAX_TILT = 6;
const STIFFNESS = 100;
const DAMPING = 12;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

export function useDragTilt(isDragging: () => boolean) {
	const [rotation, setRotation] = createSignal(0);

	let angle = 0;
	let angularVelocity = 0;
	let pointerVelocity = 0;
	let lastX = 0;
	let lastMoveTime = 0;
	let lastFrameTime = 0;
	let rafId: number | null = null;

	const startLoop = () => {
		if (rafId === null) {
			lastFrameTime = performance.now();
			rafId = requestAnimationFrame(tick);
		}
	};

	const onPointerMove = (event: PointerEvent) => {
		const now = performance.now();
		if (lastMoveTime > 0) {
			const dt = Math.max(1, now - lastMoveTime);
			const v = ((event.clientX - lastX) / dt) * 1000;
			pointerVelocity = pointerVelocity * 0.5 + v * 0.5;
		}
		lastMoveTime = now;
		lastX = event.clientX;
	};

	const tick = () => {
		const now = performance.now();
		const dt = lastFrameTime
			? Math.min(0.032, (now - lastFrameTime) / 1000)
			: 1 / 60;
		lastFrameTime = now;

		if (isDragging()) {
			if (now - lastMoveTime > 40) pointerVelocity *= 0.7;

			const target = clamp(pointerVelocity * TILT_FACTOR, -MAX_TILT, MAX_TILT);
			angularVelocity +=
				(STIFFNESS * (target - angle) - DAMPING * angularVelocity) * dt;
			angle += angularVelocity * dt;
			setRotation(angle);
		} else {
			angularVelocity += (-STIFFNESS * angle - DAMPING * angularVelocity) * dt;
			angle += angularVelocity * dt;

			if (Math.abs(angle) < 0.01 && Math.abs(angularVelocity) < 0.05) {
				angle = 0;
				angularVelocity = 0;
				setRotation(0);
				rafId = null;
				return;
			}
			setRotation(angle);
		}

		rafId = requestAnimationFrame(tick);
	};

	createEffect(() => {
		if (isDragging()) {
			pointerVelocity = 0;
			lastMoveTime = 0;
			lastX = 0;

			window.addEventListener("pointermove", onPointerMove, { capture: true });
			startLoop();
		} else {
			window.removeEventListener("pointermove", onPointerMove, {
				capture: true,
			});
			if (angle !== 0 || angularVelocity !== 0) {
				startLoop();
			}
		}
	});

	onCleanup(() => {
		window.removeEventListener("pointermove", onPointerMove, { capture: true });
		if (rafId !== null) cancelAnimationFrame(rafId);
	});

	return rotation;
}
