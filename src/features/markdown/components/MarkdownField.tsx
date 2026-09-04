import { Editor } from "@tiptap/core";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import {
	createEffect,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import AiPopup from "#/features/ai/components/AiPopup";
import { dropdownItemValue, uid } from "#/utils/misc";
import { insertMarkdown } from "../insertMarkdown";
import {
	additionalButtons,
	blockButtons,
	createMarkdownActions,
	headingItems,
	inlineButtons,
	type MarkdownAction,
} from "../toolbar";
import { activeButton, content, field, toolbar } from "./markdownField.css";
import ToolbarButton from "./ToolbarButton";

interface MarkdownFieldProps {
	value: string;
	placeholder?: string;
	minHeight?: string;
	onSave?: (markdown: string) => void;
	onCancel?: () => void;
	onChange?: (markdown: string) => void;
	class?: string;
	noControlsFooter?: boolean;
}

const visibleInlineButtons = inlineButtons.filter(({ id }) =>
	["bold", "italic", "link"].includes(id),
);

const moreInlineButtons = inlineButtons.filter(({ id }) =>
	["strike", "underline", "code"].includes(id),
);

const visibleBlockButtons = blockButtons.filter(({ id }) =>
	["bullet-list", "ordered-list"].includes(id),
);

const moreBlockButtons = blockButtons.filter(({ id }) =>
	["blockquote", "code-block"].includes(id),
);

const MarkdownField = (props: MarkdownFieldProps) => {
	const ns = uid();

	let editorRef!: HTMLDivElement;
	let toolbarRef!: HTMLDivElement;
	let instance!: Editor;
	let actions: Record<string, MarkdownAction> = {};
	let lastValue = props.value;

	const [draftValue, setDraftValue] = createSignal(props.value);
	const [isFocused, setIsFocused] = createSignal(false);
	const [toolbarVersion, setToolbarVersion] = createSignal(0);
	const [aiRect, setAiRect] = createSignal<DOMRect | null>(null);

	const bumpToolbar = () => setToolbarVersion((v) => v + 1);

	const isActive = (id: string) => {
		toolbarVersion();
		return actions[id]?.active() ?? false;
	};

	const isHeadingActive = () => {
		toolbarVersion();
		return [1, 2, 3].some((level) =>
			Boolean(actions[`heading-${level}`]?.active()),
		);
	};

	const handleSelect = (event: Event) => {
		const id = dropdownItemValue(event) ?? "";
		actions[id]?.run();
		bumpToolbar();
	};

	const handleSave = () => {
		props.onSave?.(draftValue());
		setIsFocused(false);
	};

	const handleCancel = () => {
		lastValue = props.value;
		setDraftValue(props.value);
		instance?.commands.setContent(props.value, { emitUpdate: false });
		setIsFocused(false);
		props.onCancel?.();
	};

	onMount(() => {
		if (!editorRef || !toolbarRef) return;

		instance = new Editor({
			element: editorRef,
			extensions: [
				StarterKit.configure({
					trailingNode: false,
					heading: { levels: [1, 2, 3] },
				}),
				Placeholder.configure({
					placeholder: props.placeholder ?? "",
					showOnlyCurrent: false,
				}),
				Markdown.configure({ markedOptions: { gfm: true } }),
			],
			content: props.value,
			contentType: "markdown",
			onUpdate: ({ editor: editorInstance }) => {
				const markdown = editorInstance.getMarkdown();
				lastValue = markdown;
				setDraftValue(markdown);
				props.onChange?.(markdown);
			},
			onFocus: () => {
				setIsFocused(true);
			},
			onBlur: () => {
				setIsFocused(false);
			},
		});

		const editorInstance = instance;
		actions = {
			...createMarkdownActions(editorInstance),
			ai: {
				active: () => false,
				run: toggleAi,
			},
		};

		editorInstance.on("transaction", bumpToolbar);
		editorInstance.on("selectionUpdate", bumpToolbar);

		bumpToolbar();
	});

	createEffect(() => {
		if (!instance) return;
		if (props.value === lastValue) return;

		lastValue = props.value;
		setDraftValue(props.value);
		instance.commands.setContent(props.value, { emitUpdate: false });
	});

	onCleanup(() => {
		instance?.destroy();
	});

	const toggleAi = () => {
		if (aiRect()) {
			setAiRect(null);
			return;
		}
		const el = document.getElementById(`${ns}-ai`);
		const rect = el?.getBoundingClientRect() ?? null;
		if (rect) setAiRect(rect);
	};

	const handleAiInsert = (text: string) => {
		if (!text || !instance) return;
		insertMarkdown(instance, text);
		setAiRect(null);
	};

	return (
		<>
			<div class={`${field} ${props.class ?? ""}`}>
				<div ref={toolbarRef} class={toolbar} role="toolbar">
					<For each={visibleInlineButtons}>
						{(button) => (
							<ToolbarButton
								button={button}
								id={`${ns}-${button.id}`}
								onClick={() => actions[button.id]?.run()}
								activeClass={activeButton}
								active={() => isActive(button.id)}
							/>
						)}
					</For>

					<wa-divider
						orientation="vertical"
						style={{ "--spacing": "var(--wa-space-3xs)" }}
					></wa-divider>

					<wa-dropdown
						placement="bottom-start"
						size="s"
						on:wa-after-hide={(e: Event) => e.stopPropagation()}
						on:wa-hide={(e: Event) => e.stopPropagation()}
						on:wa-select={handleSelect}
					>
						<wa-button
							id={`${ns}-heading-trigger`}
							slot="trigger"
							size="s"
							appearance="plain"
							with-caret
							classList={{ [activeButton]: isHeadingActive() }}
						>
							<wa-icon name="heading-2" label="Paragraph style"></wa-icon>
						</wa-button>

						<For each={headingItems}>
							{(item) => (
								<wa-dropdown-item
									type="checkbox"
									value={item.id}
									checked={isActive(item.id)}
								>
									<wa-icon
										slot="icon"
										name={item.icon}
										label={item.label}
									></wa-icon>
									{item.label}
								</wa-dropdown-item>
							)}
						</For>
					</wa-dropdown>

					<wa-tooltip
						for={`${ns}-heading-trigger`}
						on:wa-after-hide={(e: Event) => e.stopPropagation()}
					>
						Paragraph style
					</wa-tooltip>

					<wa-divider
						orientation="vertical"
						style={{ "--spacing": "var(--wa-space-3xs)" }}
					></wa-divider>

					<For each={visibleBlockButtons}>
						{(button) => (
							<ToolbarButton
								button={button}
								id={`${ns}-${button.id}`}
								onClick={() => actions[button.id]?.run()}
								activeClass={activeButton}
								active={() => isActive(button.id)}
							/>
						)}
					</For>

					<wa-divider
						orientation="vertical"
						style={{ "--spacing": "var(--wa-space-3xs)" }}
					></wa-divider>

					<ToolbarButton
						button={additionalButtons[1]}
						id={`${ns}-ai`}
						onClick={toggleAi}
						activeClass={activeButton}
						active={() => Boolean(aiRect())}
					/>

					<wa-dropdown
						placement="bottom-end"
						size="s"
						on:wa-after-hide={(e: Event) => e.stopPropagation()}
						on:wa-hide={(e: Event) => e.stopPropagation()}
						on:wa-select={handleSelect}
					>
						<wa-button
							id={`${ns}-more-trigger`}
							slot="trigger"
							size="s"
							appearance="plain"
						>
							<wa-icon name="ellipsis" label="More formatting"></wa-icon>
						</wa-button>

						<For each={moreInlineButtons}>
							{(item) => (
								<wa-dropdown-item
									type="checkbox"
									value={item.id}
									checked={isActive(item.id)}
								>
									<wa-icon
										slot="icon"
										name={item.icon}
										label={item.label}
									></wa-icon>
									{item.label}
								</wa-dropdown-item>
							)}
						</For>

						<wa-divider></wa-divider>

						<For each={moreBlockButtons}>
							{(item) => (
								<wa-dropdown-item
									type="checkbox"
									value={item.id}
									checked={isActive(item.id)}
								>
									<wa-icon
										slot="icon"
										name={item.icon}
										label={item.label}
									></wa-icon>
									{item.label}
								</wa-dropdown-item>
							)}
						</For>
					</wa-dropdown>

					<wa-tooltip
						for={`${ns}-more-trigger`}
						on:wa-after-hide={(e: Event) => e.stopPropagation()}
					>
						More formatting
					</wa-tooltip>
				</div>

				<div
					ref={editorRef}
					class={content}
					style={{ "min-height": props.minHeight ?? "5rem" }}
					onClick={() => {
						if (!instance?.isFocused) {
							instance?.commands.focus();
						}
					}}
				/>
			</div>
			<AiPopup
				open={() => Boolean(aiRect())}
				anchorRect={aiRect}
				onInsert={handleAiInsert}
				onClose={() => setAiRect(null)}
			/>
			<Show when={isFocused() && !props.noControlsFooter}>
				<div
					style={{
						display: "flex",
						gap: "var(--wa-space-xs)",
						"margin-top": "var(--wa-space-xs)",
					}}
				>
					<wa-button
						variant="brand"
						appearance="filled"
						onMouseDown={(e: MouseEvent) => e.preventDefault()}
						onClick={handleSave}
					>
						Save
					</wa-button>
					<wa-button
						variant="neutral"
						appearance="outlined"
						onMouseDown={(e: MouseEvent) => e.preventDefault()}
						onClick={handleCancel}
					>
						Cancel
					</wa-button>
				</div>
			</Show>
		</>
	);
};

export default MarkdownField;
