import { onCleanup, onMount } from "solid-js";
import { inlineInputStyle } from "./editableText.css";

interface EditableTextProps {
	value: string;
	onChange: (value: string) => void;
	onConfirm?: () => void;
	onCancel?: () => void;
	placeholder?: string;
	ariaLabel?: string;
	class?: string;
	isolateEvents?: boolean;
	autoFocus?: boolean;
}

export function EditableText(props: EditableTextProps) {
	let inputRef!: HTMLElement;
	let isCanceling = false;

	const handleEvent = (e: Event) => {
		if (props.isolateEvents) {
			e.stopPropagation();
		}
	};

	onMount(() => {
		if (!inputRef) return;

		const eventsToIsolate = ["click", "dblclick", "pointerdown", "mousedown"];
		if (props.isolateEvents) {
			eventsToIsolate.forEach((evt) => {
				inputRef?.addEventListener(evt, handleEvent);
			});
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			if (props.isolateEvents) e.stopPropagation();

			if (e.key === "Enter") {
				e.preventDefault();
				inputRef?.blur(); // Triggers handleBlur -> onConfirm
			} else if (e.key === "Escape") {
				e.preventDefault();

				isCanceling = true;
				props.onCancel?.();
				inputRef?.blur();
			}
		};

		const handleBlur = (e: FocusEvent) => {
			if (props.isolateEvents) e.stopPropagation();

			// If blur was triggered by Escape, skip onConfirm
			if (isCanceling) {
				isCanceling = false;
				return;
			}

			props.onConfirm?.();
		};

		inputRef?.addEventListener("keydown", handleKeyDown as EventListener);
		inputRef?.addEventListener("blur", handleBlur as EventListener);

		onCleanup(() => {
			if (props.isolateEvents) {
				eventsToIsolate.forEach((evt) => {
					inputRef?.removeEventListener(evt, handleEvent);
				});
			}
			inputRef?.removeEventListener("keydown", handleKeyDown as EventListener);
			inputRef?.removeEventListener("blur", handleBlur as EventListener);
		});

		if (props.autoFocus) {
			queueMicrotask(() => {
				inputRef?.focus();
			});
		}
	});

	return (
		<wa-input
			ref={(el) => {
				inputRef = el;
			}}
			class={`${inlineInputStyle} ${props.class ?? ""}`}
			type="text"
			value={props.value}
			placeholder={props.placeholder ?? "Untitled"}
			aria-label={props.ariaLabel ?? "Editable text"}
			onInput={(e) =>
				props.onChange((e.currentTarget as HTMLInputElement).value)
			}
			onFocus={(e) => {
				const label = (e.currentTarget as HTMLElement).closest(
					".st-header-label",
				);
				label?.setAttribute("draggable", "false");
			}}
			onBlur={(e) => {
				const label = (e.currentTarget as HTMLElement).closest(
					".st-header-label",
				);
				label?.setAttribute("draggable", "true");
			}}
		></wa-input>
	);
}
