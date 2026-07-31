import { globalStyle } from "@vanilla-extract/css";
import "./fonts.css";

// Base reset and box-sizing
globalStyle("*", {
	boxSizing: "border-box",
});

globalStyle("*, *::before, *::after", {
	boxSizing: "border-box",
});

globalStyle("html, body", {
	margin: 0,
	padding: 0,
	fontFamily: "Geist",
	backgroundColor: "var(--wa-color-surface-default, #000000)",
	backgroundImage: `
    radial-gradient(
      color-mix(in srgb, var(--wa-color-border-normal, #444444) 70%, transparent) 1.4px,
      transparent 1.5px
    )
  `,
	backgroundSize: "20px 20px",
	color: "var(--wa-color-text-normal, #ffffff)",
	lineHeight: 1.2,
	WebkitFontSmoothing: "antialiased",
	textRendering: "optimizeLegibility",
	scrollBehavior: "smooth",
});

// Remove default margins and padding from common elements
globalStyle("h1, h2, h3, h4, h5, h6, p, blockquote, figure, figcaption", {
	margin: 0,
	padding: 0,
});

globalStyle("h1", {
	fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
});

globalStyle("h2", {
	fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
});

globalStyle("::-webkit-scrollbar-track", {
	boxShadow: "inset 0 0 6px rgba(0,0,0,0.3)",
	backgroundColor: "var(--wa-color-surface-raised)",
});

globalStyle("::-webkit-scrollbar", {
	width: "10px",
});

globalStyle("::-webkit-scrollbar-thumb", {
	backgroundColor: "var(--wa-color-surface-border)",
});

globalStyle("img", {
	maxWidth: "100%",
	display: "block",
});

globalStyle("a", {
	color: "inherit",
	textDecoration: "none",
	transition: "opacity 0.3s",
	width: "fit-content",
	height: "fit-content",
});

globalStyle("a:hover", {
	opacity: 0.8,
});

globalStyle("button", {
	fontFamily: "inherit",
	cursor: "pointer",
	border: "none",
	background: "none",
	color: "inherit",
});
