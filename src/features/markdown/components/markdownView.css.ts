import { globalStyle, style } from "@vanilla-extract/css";

export const view = style({
	fontSize: "0.85rem",
	lineHeight: 1.4,
	wordBreak: "break-word",
});

globalStyle(`.${view} > *:first-child`, {
	marginTop: 0,
});

globalStyle(`.${view} > *:last-child`, {
	marginBottom: 0,
});

globalStyle(`.${view} p, .${view} ul, .${view} ol`, {
	margin: "0.4em 0",
	lineHeight: 1.5,
});

globalStyle(`.${view} ul, .${view} ol`, {
	paddingLeft: "1.4em",
});

globalStyle(
	`.${view} h1, .${view} h2, .${view} h3, .${view} h4, .${view} h5, .${view} h6`,
	{
		margin: "0.7em 0 0.3em",
		lineHeight: 1.25,
	},
);

globalStyle(`.${view} h1`, {
	fontSize: "1.3rem",
});

globalStyle(`.${view} h2`, {
	fontSize: "1.15rem",
});

globalStyle(`.${view} h3`, {
	fontSize: "1.05rem",
});

globalStyle(`.${view} blockquote`, {
	margin: "0.4em 0",
	paddingLeft: "0.8em",
	borderLeft: "3px solid var(--wa-color-surface-border)",
	color: "var(--wa-color-text-quiet)",
});

globalStyle(`.${view} code`, {
	padding: "0.15em 0.4em",
	borderRadius: "0.25em",
	backgroundColor: "var(--wa-color-surface-raised)",
	fontFamily: "monospace",
	fontSize: "0.85em",
});

globalStyle(`.${view} pre`, {
	padding: "var(--wa-space-s)",
	borderRadius: "var(--wa-border-radius-s)",
	backgroundColor: "var(--wa-color-surface-raised)",
	overflowX: "auto",
});

globalStyle(`.${view} pre code`, {
	padding: 0,
	backgroundColor: "transparent",
});

globalStyle(`.${view} a`, {
	color: "var(--wa-color-text-link)",
	textDecoration: "underline",
	cursor: "pointer",
});

globalStyle(`.${view} img`, {
	maxWidth: "100%",
	borderRadius: "var(--wa-border-radius-m)",
});
