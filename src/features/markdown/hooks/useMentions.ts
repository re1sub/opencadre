import type { Editor } from "@tiptap/core";
import { posToDOMRect } from "@tiptap/core";
import { createEffect, createSignal } from "solid-js";
import type { WorkspaceMember } from "#/features/workspace/types";

export function useMentions(getEditor: () => Editor | undefined) {
	const [mentionVisible, setMentionVisible] = createSignal(false);
	const [mentionQuery, setMentionQuery] = createSignal("");
	const [selectedIndex, setSelectedIndex] = createSignal(0);
	const [mentionRect, setMentionRect] = createSignal<DOMRect | null>(null);

	const filteredMembers = (members: WorkspaceMember[]) => {
		const q = mentionQuery().toLowerCase().trim();
		if (!q) return members;
		return members.filter((m) => m.name.toLowerCase().includes(q));
	};

	createEffect(() => {
		mentionQuery();
		setSelectedIndex(0);
	});

	const getMentionQuery = (
		editorInstance: Editor,
	): { from: number; to: number; query: string } | null => {
		const { $from, empty } = editorInstance.state.selection;
		if (!empty) return null;

		const textBefore = $from.parent.textBetween(
			0,
			$from.parentOffset,
			null,
			"\ufffc",
		);
		const match = textBefore.match(/(?:^|\s)@([^\s]*)$/);
		if (!match) return null;

		const matchLength = match[0].startsWith(" ")
			? match[0].length - 1
			: match[0].length;
		return { from: $from.pos - matchLength, to: $from.pos, query: match[1] };
	};

	const syncFromSelection = (
		editorInstance: Editor,
		members: WorkspaceMember[],
	) => {
		const match = getMentionQuery(editorInstance);
		if (match && filteredMembers(members).length > 0) {
			setMentionQuery(match.query);
			setMentionRect(posToDOMRect(editorInstance.view, match.from, match.to));
			if (!mentionVisible()) setMentionVisible(true);
		} else {
			setMentionVisible(false);
			setMentionRect(null);
			setMentionQuery("");
		}
	};

	const openMentionAt = (from: number) => {
		const instance = getEditor();
		if (!instance) return;
		setMentionQuery("");
		setMentionRect(posToDOMRect(instance.view, from, from));
		if (!mentionVisible()) setMentionVisible(true);
	};

	const insertMention = (member: WorkspaceMember) => {
		const instance = getEditor();
		if (!instance) return;

		const match = getMentionQuery(instance);
		if (!match) return;

		instance
			.chain()
			.focus()
			.deleteRange({ from: match.from, to: match.to })
			.insertContent([
				{
					type: "text",
					text: `@${member.name}`,
					marks: [{ type: "link", attrs: { href: `mention:${member.id}` } }],
				},
				{ type: "text", text: " " },
			])
			.run();

		setMentionVisible(false);
		setMentionRect(null);
	};

	const handleKeyDown = (
		event: KeyboardEvent,
		members: WorkspaceMember[],
	): boolean => {
		if (!mentionVisible()) return false;

		const items = filteredMembers(members);

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
				insertMention(currentItem);
				return true;
			}
		}

		if (event.key === " " || event.key === "Escape") {
			setMentionVisible(false);
			setMentionRect(null);
		}

		return false;
	};

	return {
		mentionVisible,
		setMentionVisible,
		mentionQuery,
		setMentionQuery,
		selectedIndex,
		mentionRect,
		filteredMembers,
		getMentionQuery,
		syncFromSelection,
		openMentionAt,
		insertMention,
		handleKeyDown,
	};
}
