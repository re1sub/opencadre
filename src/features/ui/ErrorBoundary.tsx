import { type JSXElement, ErrorBoundary as SolidErrorBoundary } from "solid-js";
import {
	errorActions,
	errorBoundary,
	errorIcon,
	errorMessage,
	errorTitle,
} from "./errorBoundary.css";

interface ErrorBoundaryProps {
	children?: JSXElement;
}

interface FallbackProps {
	reset: () => void;
}

const Fallback = (props: FallbackProps) => {
	return (
		<div class={errorBoundary} role="alert">
			<wa-icon class={errorIcon} name="triangle-alert"></wa-icon>
			<h1 class={errorTitle}>Something went wrong</h1>
			<p class={errorMessage}>
				An unexpected error occurred. Try again, or reload the page to go back
				to the workspace.
			</p>
			<div class={errorActions}>
				<wa-button variant="brand" onClick={props.reset}>
					<wa-icon slot="start" name="rotate-ccw"></wa-icon>
					Try again
				</wa-button>
				<wa-button variant="neutral" onClick={() => window.location.reload()}>
					<wa-icon slot="start" name="house"></wa-icon>
					Reload page
				</wa-button>
			</div>
		</div>
	);
};

const ErrorBoundary = (props: ErrorBoundaryProps) => {
	return (
		<SolidErrorBoundary
			fallback={(err, reset) => {
				console.error("OpenCadre caught an error:", err);
				return <Fallback reset={reset} />;
			}}
		>
			{props.children}
		</SolidErrorBoundary>
	);
};

export default ErrorBoundary;
