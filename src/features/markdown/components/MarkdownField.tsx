import { Editor } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { createSignal, For, onCleanup, onMount } from "solid-js";
import { blockButtons, createMarkdownActions, inlineButtons } from "../toolbar";
import type { MarkdownAction } from "../types";
import { content, field, toolbar } from "./markdownField.css";
import ToolbarButton from "./ToolbarButton";

interface MarkdownFieldProps {
	value: string;
	placeholder?: string;
	onChange?: (markdown: string) => void;
	class?: string;
}

const MarkdownField = (props: MarkdownFieldProps) => {
	let editorRef!: HTMLDivElement;
	let instance: Editor | undefined;
	let actions: Record<string, MarkdownAction> = {};

	const [version, setVersion] = createSignal(0);
	const bump = () => setVersion((v) => v + 1);

	const isActive = (id: string) => {
		version();
		return actions[id]?.active() ?? false;
	};

	onMount(() => {
		if (!editorRef) return;

		instance = new Editor({
			element: editorRef,
			extensions: [
				StarterKit,
				Heading.configure({ levels: [1, 2, 3] }),
				Placeholder.configure({
					placeholder: props.placeholder ?? "Write something…",
				}),
				Markdown.configure({ markedOptions: { gfm: true } }),
			],
			content: props.value ?? "",
			contentType: "markdown",
			onUpdate: ({ editor }) => {
				props.onChange?.(editor.getMarkdown());
			},
		});

		actions = createMarkdownActions(instance);

		instance.on("transaction", bump);
		instance.on("selectionUpdate", bump);
		bump();
	});

	onCleanup(() => {
		instance?.destroy();
	});

	return (
		<div class={`${field} ${props.class ?? ""}`}>
			<div class={toolbar}>
				<For each={inlineButtons}>
					{(btn) => (
						<ToolbarButton
							button={btn}
							id={btn.id}
							onClick={() => actions[btn.id]?.run()}
							active={() => isActive(btn.id)}
						/>
					)}
				</For>
				<wa-divider orientation="vertical"></wa-divider>
				<For each={blockButtons}>
					{(btn) => (
						<ToolbarButton
							button={btn}
							id={btn.id}
							onClick={() => actions[btn.id]?.run()}
							active={() => isActive(btn.id)}
						/>
					)}
				</For>
			</div>
			<div ref={editorRef} class={content} />
		</div>
	);
};

export default MarkdownField;
