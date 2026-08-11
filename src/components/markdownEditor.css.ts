import { globalStyle, style } from "@vanilla-extract/css";

export const editor = style({
	maxWidth: "72ch",
	minHeight: "100%",
	outline: "none",
	cursor: "text",
	margin: "5rem auto",
	marginBottom: "0",
});

globalStyle(`.${editor}.markdown-body`, {
	margin: "5rem auto",
	marginBottom: "0",
	minHeight: "100%",
	maxWidth: "72ch",
	cursor: "text",
	outline: "none",
	background: "transparent",
});

globalStyle(`.${editor} > *:first-child`, {
	marginTop: 0,
});

globalStyle(`.${editor} h1:first-child::before`, {
	content: "attr(data-placeholder)",
	color: "var(--wa-color-text-quiet)",
	opacity: 0.8,
	float: "left",
	height: 0,
	pointerEvents: "none",
});

globalStyle(`.${editor} > *:last-child`, {
	marginBottom: 0,
});

globalStyle(`.${editor} h1, .${editor} h2, .${editor} h3, .${editor} h4`, {
	margin: "1.5em 0 0.5em",
	lineHeight: 1.2,
});

globalStyle(`.${editor} h1`, {
	fontSize: "2rem",
});

globalStyle(`.${editor} h2`, {
	fontSize: "1.5rem",
});

globalStyle(`.${editor} h3`, {
	fontSize: "1.25rem",
});

globalStyle(`.${editor} h4`, {
	fontSize: "1.1rem",
});

globalStyle(`.${editor} p, .${editor} ul, .${editor} ol`, {
	margin: "0.75em 0",
	lineHeight: 1.6,
});

globalStyle(`.${editor} ul, .${editor} ol`, {
	paddingLeft: "1.5em",
});

globalStyle(`.${editor} blockquote`, {
	margin: "0.75em 0",
	paddingLeft: "1em",
	borderLeft: "3px solid var(--wa-color-surface-border)",
	color: "var(--wa-color-text-quiet)",
	fontFamily: "inherit",
	fontSize: "1.1rem",
});

globalStyle(`.${editor} code`, {
	padding: "0.15em 0.4em",
	borderRadius: "0.25em",
	backgroundColor: "var(--wa-color-surface-raised)",
	fontFamily: "monospace",
	fontSize: "0.9em",
});

globalStyle(`.${editor} pre`, {
	padding: "var(--wa-space-m)",
	borderRadius: "var(--wa-border-radius-m)",
	backgroundColor: "var(--wa-color-surface-raised)",
	overflowX: "auto",
});

globalStyle(`.${editor} pre code`, {
	padding: 0,
	backgroundColor: "transparent",
});

globalStyle(`.${editor} a`, {
	color: "var(--wa-color-text-link)",
	textDecoration: "underline",
});

globalStyle(`.${editor} hr`, {
	margin: "1.5em 0",
	border: "none",
	borderTop: "1px solid var(--wa-color-surface-border)",
});

globalStyle(`.${editor} .ProseMirror-selectednode`, {
	outline: "none",
});

globalStyle(`.${editor}.ProseMirror:focus`, {
	outline: "none",
});
