import type { Component } from "solid-js";

const LoadingSpinner: Component<{
	color?: string;
	size?: string;
	fullscreen?: boolean;
}> = (props) => {
	return (
		<wa-spinner
			style={{
				"--indicator-color": props.color || "var(--wa-color-brand)",
				"--track-width": "5px",
				"font-size": props.size || "1.5rem",
				position: props.fullscreen ? "fixed" : "relative",
				top: props.fullscreen ? "50%" : "auto",
				left: props.fullscreen ? "50%" : "auto",
				transform: props.fullscreen ? "translate(-50%, -50%)" : "none",
			}}
		></wa-spinner>
	);
};

export default LoadingSpinner;
