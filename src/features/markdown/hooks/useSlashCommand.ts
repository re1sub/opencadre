import type { Editor } from "@tiptap/core";
import { createEffect, createSignal } from "solid-js";
import { type MarkdownAction, slashCommandGroups } from "../toolbar";

export function useSlashCommand(getEditor: () => Editor | undefined) {
	const [commandVisible, setCommandVisible] = createSignal(false);
	const [commandQuery, setCommandQuery] = createSignal("");
	const [selectedIndex, setSelectedIndex] = createSignal(0);

	const filteredToolbarGroups = () => {
		const q = commandQuery().toLowerCase().trim();
		if (!q) return slashCommandGroups;

		return slashCommandGroups
			.map((group) =>
				group.filter((button) => button.label.toLowerCase().includes(q)),
			)
			.filter((group) => group.length > 0);
	};

	const flatFilteredButtons = () => filteredToolbarGroups().flat();

	createEffect(() => {
		commandQuery();
		setSelectedIndex(0);
	});

	const getSlashQuery = (editorInstance: Editor): string | null => {
		const { $from, empty } = editorInstance.state.selection;
		if (!empty) return null;

		const textBefore = $from.parent.textBetween(
			0,
			$from.parentOffset,
			null,
			"\ufffc",
		);
		const match = textBefore.match(/(?:^|\s)\/([^\s]*)$/);
		return match ? match[1] : null;
	};

	const deleteSlashQueryText = () => {
		const instance = getEditor();
		if (!instance) return;

		const { $from } = instance.state.selection;
		const textBefore = $from.parent.textBetween(
			0,
			$from.parentOffset,
			null,
			"\ufffc",
		);
		const match = textBefore.match(/(?:^|\s)\/([^\s]*)$/);

		if (match) {
			const matchLength = match[0].startsWith(" ")
				? match[0].length - 1
				: match[0].length;
			const from = $from.pos - matchLength;
			const to = $from.pos;
			instance.chain().focus().deleteRange({ from, to }).run();
		}
	};

	const executeCommand = (
		buttonId: string,
		actions: Record<string, MarkdownAction>,
	) => {
		deleteSlashQueryText();
		actions[buttonId]?.run();
		setCommandVisible(false);
	};

	const handleKeyDown = (
		event: KeyboardEvent,
		actions: Record<string, MarkdownAction>,
	) => {
		if (!commandVisible()) return false;

		const items = flatFilteredButtons();

		if (event.key === "ArrowDown") {
			event.preventDefault();
			setSelectedIndex((prev) =>
				items.length ? (prev + 1) % items.length : 0,
			);
			return true;
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();
			setSelectedIndex((prev) =>
				items.length ? (prev - 1 + items.length) % items.length : 0,
			);
			return true;
		}

		if (event.key === "Enter" || event.key === "Tab") {
			const currentItem = items[selectedIndex()];
			if (currentItem) {
				event.preventDefault();
				executeCommand(currentItem.id, actions);
				return true;
			}
		}

		if (event.key === " " || event.key === "Escape") {
			setCommandVisible(false);
		}

		return false;
	};

	return {
		commandVisible,
		setCommandVisible,
		commandQuery,
		setCommandQuery,
		selectedIndex,
		filteredToolbarGroups,
		getSlashQuery,
		executeCommand,
		handleKeyDown,
	};
}
