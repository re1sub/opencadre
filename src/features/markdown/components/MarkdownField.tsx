import { Editor } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { createEffect, createSignal, For, onCleanup, onMount } from "solid-js";
import { uid } from "#/utils/uid";
import {
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
	onChange?: (markdown: string) => void;
	class?: string;
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
	const [toolbarVersion, setToolbarVersion] = createSignal(0);
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
		const selectEvent = event as unknown as {
			detail: { item: { value?: string } | null };
		};
		const id = selectEvent.detail.item?.value ?? "";
		actions[id]?.run();
		bumpToolbar();
	};

	onMount(() => {
		if (!editorRef || !toolbarRef) return;

		instance = new Editor({
			element: editorRef,
			extensions: [
				StarterKit.configure({
					trailingNode: false,
				}),
				Heading.configure({ levels: [1, 2, 3] }),
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
				props.onChange?.(markdown);
			},
		});

		const editorInstance = instance;
		actions = createMarkdownActions(editorInstance);

		editorInstance.on("transaction", bumpToolbar);
		editorInstance.on("selectionUpdate", bumpToolbar);

		bumpToolbar();
	});

	createEffect(() => {
		if (!instance) return;
		if (props.value === lastValue) return;

		instance.commands.setContent(props.value, {
			emitUpdate: false,
		});

		lastValue = props.value;
	});

	onCleanup(() => {
		instance?.destroy();
	});

	createEffect(() => {
		if (!toolbarRef) return;

		const tooltips = toolbarRef.querySelectorAll("wa-tooltip");

		tooltips.forEach((tooltip) => {
			tooltip.addEventListener("wa-hide", (event) => {
				event.stopPropagation();
			});

			tooltip.addEventListener("wa-after-hide", (event) => {
				event.stopPropagation();
			});
		});
	});

	return (
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
					on:wa-after-hide={(event) => event.stopPropagation()}
					on:wa-hide={(event) => event.stopPropagation()}
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

				<wa-tooltip for={`${ns}-heading-trigger`}>Paragraph style</wa-tooltip>

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

				<wa-dropdown
					placement="bottom-end"
					size="s"
					on:wa-after-hide={(event) => event.stopPropagation()}
					on:wa-hide={(event) => event.stopPropagation()}
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

				<wa-tooltip for={`${ns}-more-trigger`}>More formatting</wa-tooltip>
			</div>

			<div
				ref={editorRef}
				class={content}
				style={{
					"min-height": props.minHeight ?? "5rem",
				}}
				onClick={() => {
					if (!instance.isFocused) {
						instance?.commands.focus();
					}
				}}
			/>
		</div>
	);
};

export default MarkdownField;
