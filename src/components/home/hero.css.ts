import { style } from "@vanilla-extract/css";

export const hero = style({
	position: "relative",
	overflow: "hidden",
	padding: "1rem",
	paddingTop: "5rem",
	textAlign: "center",
	zIndex: 0,
});

export const title = style({
	position: "relative",
	margin: "0 auto",
	maxWidth: "1164px",
	fontWeight: 500,
	color: "var(--wa-color-text-normal)",
	marginBottom: "3rem",
});

export const screenshot = style({
	position: "relative",
	margin: "30px auto 0",
	width: "1200px",
	maxWidth: "100%",
});

export const screenshotImage = style({
	width: "100%",
	height: "auto",
	borderRadius: "var(--wa-border-radius-l)",
	boxShadow: "0 0 5.5px rgba(0, 0, 0, 0.25)",
});
