import { Mark, mergeAttributes } from "@tiptap/core";

export const COMMENT_MARK_NAME = "comment";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		comment: {
			setComment: (commentId: string) => ReturnType;
			unsetComment: () => ReturnType;
		};
	}
}

export const CommentMark = Mark.create({
	name: COMMENT_MARK_NAME,
	group: "inline",
	inclusive: false,

	addAttributes() {
		return {
			commentId: {
				default: null,
				parseHTML: (element) =>
					(element as HTMLElement).getAttribute("data-comment-id"),
				renderHTML: (attributes) => ({
					"data-comment-id": attributes.commentId as string,
				}),
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: "mark[data-comment-id]",
				getAttrs: (element) => ({
					commentId: (element as HTMLElement).getAttribute("data-comment-id"),
				}),
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return ["mark", mergeAttributes(HTMLAttributes), 0];
	},

	renderMarkdown(node, helpers) {
		const commentId = (node.attrs?.commentId as string) ?? "";
		return `<mark data-comment-id="${commentId}">${helpers.renderChildren(
			node.content ?? [],
		)}</mark>`;
	},

	addCommands() {
		return {
			setComment:
				(commentId: string) =>
				({ commands }) =>
					commands.setMark(COMMENT_MARK_NAME, { commentId }),
			unsetComment:
				() =>
				({ commands }) =>
					commands.unsetMark(COMMENT_MARK_NAME),
		};
	},
});
