import { globalStyle, style } from "@vanilla-extract/css";
import { applyMarkdownContentStyles } from "./markdownContent.css";

export const editor = style({
	maxWidth: "72ch",
	minHeight: "100%",
	outline: "none",
	cursor: "text",
});

applyMarkdownContentStyles(editor, "prose");

globalStyle(`.${editor} mark[data-comment-id]`, {
	backgroundColor: "var(--wa-color-brand-fill-quiet)",
	borderRadius: "0.2em",
	padding: "0 0.15em",
	cursor: "pointer",
});

globalStyle(`.${editor} mark[data-comment-id]:hover`, {
	backgroundColor: "var(--wa-color-brand-fill-normal)",
});

globalStyle(`.${editor}.markdown-body`, {
	margin: "2rem auto",
	marginBottom: "0",
	minHeight: "100%",
	maxWidth: "72ch",
	cursor: "text",
	outline: "none",
	background: "transparent",
});

globalStyle(`.${editor} h2`, {
	fontSize: "2em !important",
});

globalStyle(`.${editor} h2:first-child::before`, {
	content: "attr(data-placeholder)",
	color: "var(--wa-color-text-quiet)",
	opacity: 0.8,
	float: "left",
	height: 0,
	pointerEvents: "none",
});

globalStyle(`.${editor} p::before`, {
	content: "attr(data-placeholder)",
	color: "var(--wa-color-text-quiet)",
	opacity: 0.8,
	float: "left",
	height: 0,
	pointerEvents: "none",
});

globalStyle(`.${editor} hr`, {
	margin: "1.5em 0",
	border: "none",
	borderTop: "1px solid var(--wa-color-surface-border)",
});

globalStyle(`.${editor} .ProseMirror-selectednode`, {
	outline: "none",
});
