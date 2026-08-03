import { style } from "@vanilla-extract/css";

export const titleBlock = style({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	marginTop: "5rem",
});

export const heading = style({
	fontWeight: 500,
	textAlign: "center",
	color: "var(--wa-color-text-normal)",
});

export const subtitle = style({
	maxWidth: "800px",
	fontWeight: 200,
	textAlign: "center",
	color: "var(--wa-color-text-normal)",
});

export const grid = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(min(400px, 100%), 1fr))",
	gap: "0.5rem",
	justifyContent: "center",
	maxWidth: "1440px",
	margin: "0 auto",
	padding: "1rem",
	paddingTop: "2rem",
	paddingBottom: "5rem",
});

export const card = style({
	position: "relative",
	padding: "1.2px",
	background: "var(--wa-color-surface-raised)",
	border: "1px solid var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-l)",
	overflow: "hidden",
	vars: {
		"--mouse-x": "0px",
		"--mouse-y": "0px",
	},
	selectors: {
		"&::before": {
			content: "",
			position: "absolute",
			inset: 0,
			borderRadius: "inherit",
			zIndex: 3,
			backgroundImage:
				"radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), color-mix(in srgb, var(--wa-color-text-normal) 20%, transparent), transparent 40%)",
			opacity: 0,
			pointerEvents: "none",
			transition: "opacity 500ms",
		},
		"&:hover::before": {
			opacity: 1,
		},
		"&::after": {
			content: "",
			position: "absolute",
			inset: 0,
			borderRadius: "inherit",
			zIndex: 1,
			backgroundImage:
				"radial-gradient(500px circle at var(--mouse-x) var(--mouse-y), color-mix(in srgb, var(--wa-color-text-normal) 80%, transparent), transparent 40%)",
			opacity: 0,
			pointerEvents: "none",
			transition: "opacity 500ms",
		},
		[`${grid}:hover > &::after`]: {
			opacity: 1,
		},
	},
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			selectors: {
				"&::before, &::after": {
					transitionDuration: "0ms",
				},
			},
		},
	},
});

export const cardInner = style({
	position: "relative",
	zIndex: 2,
	display: "flex",
	flexDirection: "column",
	width: "100%",
	height: "100%",
	background: "var(--wa-color-surface-raised)",
	borderRadius: "calc(var(--wa-border-radius-l) - 1px)",
	overflow: "hidden",
});

export const cardImageWrapper = style({
	position: "relative",
	selectors: {
		"&::after": {
			content: "",
			position: "absolute",
			inset: 0,
			background: "rgba(0, 0, 0, 0.2)",
			pointerEvents: "none",
		},
	},
});

export const cardImage = style({
	width: "100%",
	maxHeight: "180px",
	objectFit: "cover",
	objectPosition: "top",
});

export const cardContent = style({
	display: "flex",
	alignItems: "center",
	gap: "20px",
	width: "100%",
	height: "100%",
	padding: "20px",
	borderTop: "1px solid var(--wa-color-surface-border)",
});

export const cardIcon = style({
	fontSize: "20px",
	flexShrink: 0,
});

export const cardText = style({
	display: "flex",
	flexDirection: "column",
	gap: "5px",
});

export const cardTitle = style({
	fontSize: "16px",
	fontWeight: 400,
	color: "var(--wa-color-text-normal)",
});

export const cardDescription = style({
	fontSize: "12px",
	fontWeight: 200,
	color: "var(--wa-color-text-normal)",
});
