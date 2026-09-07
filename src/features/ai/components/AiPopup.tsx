import { createEffect, createSignal, Show } from "solid-js";
import { useAiChat } from "#/features/ai/hooks/useAiChat";
import MarkdownView from "#/features/markdown/components/MarkdownView";
import type { EntityContext } from "#/types/ai";
import { uid } from "#/utils/misc";
import { usePopup } from "#/utils/usePopup";
import { actions, field, panel, result } from "./aiPopup.css";

interface AiPopupProps {
	open: () => boolean;
	anchorRect: () => DOMRect | null;
	onInsert: (text: string) => void;
	onClose: () => void;
	entity?: EntityContext;
}

interface AiPopupElement extends HTMLElement {
	anchor: unknown;
	reposition: () => void;
	active: boolean;
}

const isAiTrigger = (target: HTMLElement | null) =>
	Boolean(target?.closest?.('[id$="-ai"], #ai'));

const AiPopup = (props: AiPopupProps) => {
	const ns = uid();

	const popup = usePopup({ onClose: props.onClose, ignore: isAiTrigger });

	let popupEl!: AiPopupElement;
	let textareaEl!: HTMLTextAreaElement;

	const [prompt, setPrompt] = createSignal("");
	const { messages, sendMessage, isLoading, clear } = useAiChat({
		entity: props.entity,
	});

	createEffect(() => {
		if (props.open()) {
			setPrompt("");
			clear();
		}
	});

	const assistantText = () => {
		for (let i = messages().length - 1; i >= 0; i--) {
			const message = messages()[i];
			if (message.role !== "assistant") continue;
			const part = message.parts.find((p) => p.type === "text");
			if (part && typeof part.content === "string") return part.content;
		}
		return "";
	};

	let lastAnchorRect: DOMRect | null = null;

	const virtualAnchor = () => {
		const rect = props.anchorRect();
		if (rect) lastAnchorRect = rect;
		return {
			getBoundingClientRect: () => lastAnchorRect ?? new DOMRect(0, 0, 0, 0),
		};
	};

	createEffect(() => {
		const shouldBeOpen = props.open();
		if (shouldBeOpen && !popup.open()) {
			popup.openPopup();
		} else if (!shouldBeOpen && popup.open()) {
			popup.close();
		}
	});

	createEffect(() => {
		const isOpen = props.open();
		const rect = props.anchorRect();

		if (!popupEl || !isOpen || !rect) return;

		queueMicrotask(() => {
			if (!popupEl) return;
			popupEl.anchor = virtualAnchor();
			popupEl.active = true;
			popupEl.reposition();
		});
	});

	const handleGenerate = () => {
		const text = prompt().trim();
		if (!text) return;
		void sendMessage(text);
	};

	const handleInsert = () => {
		const text = assistantText();
		if (text) props.onInsert(text);
	};

	return (
		<wa-popup
			ref={(el) => {
				popup.popupRef(el);
				popupEl = el as AiPopupElement;
			}}
			placement="bottom-start"
			distance={6}
			flip
			shift
			auto-size="vertical"
			active={popup.open()}
			on:wa-reposition={() => textareaEl?.focus()}
		>
			<div class={panel}>
				<textarea
					ref={(el) => (textareaEl = el as HTMLTextAreaElement)}
					id={`${ns}-ai-prompt-popup`}
					name={`${ns}-ai-prompt-popup`}
					class={field}
					value={prompt()}
					onInput={(e) => setPrompt(e.currentTarget.value)}
					placeholder="Ask AI to write, summarize, rewrite..."
					onKeyDown={(e) => {
						if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
							e.preventDefault();
							handleGenerate();
						}
					}}
				></textarea>
				<div class={actions}>
					<Show when={isLoading()}>
						<wa-button
							size="s"
							variant="neutral"
							appearance="outlined"
							disabled
						>
							Generating...
						</wa-button>
					</Show>
					<Show when={!isLoading()}>
						<wa-button
							size="s"
							variant="brand"
							appearance="filled"
							disabled={!prompt().trim()}
							onClick={handleGenerate}
						>
							<wa-icon slot="start" name="sparkles"></wa-icon>
							Generate
						</wa-button>
					</Show>
				</div>
				<Show when={assistantText()}>
					<div class={result}>
						<MarkdownView text={assistantText()} />
					</div>
					<div class={actions}>
						<wa-button
							size="s"
							variant="neutral"
							appearance="filled"
							onClick={handleInsert}
						>
							Insert
						</wa-button>
					</div>
				</Show>
			</div>
		</wa-popup>
	);
};

export default AiPopup;
