import { globalFontFace } from "@vanilla-extract/css";

export const geistFont = globalFontFace("Geist", [
	{
		src: 'url("/Geist/Geist-VariableFont_wght.ttf") format("truetype")',
		fontWeight: "100 900",
		fontStyle: "normal",
	},
	{
		src: 'url("/Geist/Geist-Italic-VariableFont_wght.ttf") format("truetype")',
		fontWeight: "100 900",
		fontStyle: "italic",
	},
]);

export const vercettiFont = globalFontFace("Vercetti", {
	src: `
    url("/Vercetti/Vercetti-Regular.woff2") format("woff2"),
    url("/Vercetti/Vercetti-Regular.woff") format("woff")
  `,
	fontWeight: "400",
	fontStyle: "normal",
	fontDisplay: "swap",
});
