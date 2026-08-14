import { marked } from "marked";
import { createEffect, splitProps } from "solid-js";
import { view } from "./markdownView.css";

interface MarkdownViewProps {
	text: string;
	class?: string;
}

const ALLOWED_TAGS = new Set([
	"P",
	"DIV",
	"BR",
	"HR",
	"H1",
	"H2",
	"H3",
	"H4",
	"H5",
	"H6",
	"UL",
	"OL",
	"LI",
	"BLOCKQUOTE",
	"PRE",
	"CODE",
	"STRONG",
	"EM",
	"S",
	"U",
	"DEL",
	"INS",
	"SUB",
	"SUP",
	"A",
	"IMG",
	"TABLE",
	"THEAD",
	"TBODY",
	"TR",
	"TH",
	"TD",
	"SPAN",
]);

const MarkdownView = (props: MarkdownViewProps) => {
	const [local, rest] = splitProps(props, ["text", "class"]);
	let ref!: HTMLDivElement;

	const render = (text: string): string => {
		const html = marked.parse(text, { async: false });
		return sanitize(html as string);
	};

	const sanitize = (html: string): string => {
		const template = document.createElement("template");
		template.innerHTML = html;
		template.content.querySelectorAll("*").forEach((el) => {
			const tag = el.tagName;
			if (!ALLOWED_TAGS.has(tag)) {
				el.remove();
				return;
			}
			Array.from(el.attributes).forEach((attr) => {
				const name = attr.name.toLowerCase();
				if (
					name.startsWith("on") ||
					(name === "href" && /^\s*javascript:/i.test(attr.value)) ||
					(name === "src" && !/^(https?:)?\/\//i.test(attr.value))
				) {
					el.removeAttribute(attr.name);
				}
			});
		});
		return template.innerHTML;
	};

	createEffect(() => {
		if (!ref) return;
		ref.innerHTML = render(local.text);
	});

	return <div ref={ref} class={`${view} ${local.class ?? ""}`} {...rest} />;
};

export default MarkdownView;
