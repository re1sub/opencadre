import { marked } from "marked";
import { createEffect, createSignal, For, splitProps } from "solid-js";
import type { WorkspaceMember } from "#/features/workspace/types";
import { getInitials, uid } from "#/utils/misc";
import { view } from "./markdownView.css";

interface MarkdownViewProps {
	text: string;
	class?: string;
	members?: WorkspaceMember[];
}

interface MentionTooltip {
	id: string;
	userId: string;
	name: string;
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
	const [local, rest] = splitProps(props, ["text", "class", "members"]);
	const [tooltips, setTooltips] = createSignal<MentionTooltip[]>([]);
	const instanceId = uid();
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

		// Turn mention links into badge spans and collect their tooltip data.
		const found: MentionTooltip[] = [];
		template.content.querySelectorAll('a[href^="mention:"]').forEach((el) => {
			const userId = el.getAttribute("href")?.slice("mention:".length) ?? "";
			const label = el.textContent ?? "";
			const id = `${instanceId}-mention-${found.length}`;
			const badge = document.createElement("wa-badge");
			badge.id = id;
			badge.setAttribute("variant", "neutral");
			badge.setAttribute("appearance", "outlined");
			badge.style.fontSize = "0.8rem";
			badge.textContent = label;
			el.replaceWith(badge);
			found.push({ id, userId, name: label.replace(/^@/, "") });
		});
		setTooltips(found);
		return template.innerHTML;
	};

	createEffect(() => {
		if (!ref) return;
		ref.innerHTML = render(local.text);
	});

	const getMember = (userId: string) =>
		local.members?.find((m) => m.id === userId);

	return (
		<>
			<div ref={ref} class={`${view} ${local.class ?? ""}`} {...rest} />
			<For each={tooltips()}>
				{(tip) => {
					const member = getMember(tip.userId);
					const name = member?.name ?? tip.name;
					const initials = getInitials(name);
					return (
						<wa-tooltip
							for={tip.id}
							on:wa-after-hide={(e: Event) => e.stopPropagation()}
						>
							<div
								style={{
									display: "flex",
									"align-items": "center",
									gap: "var(--wa-space-xs)",
								}}
							>
								<wa-avatar
									initials={initials}
									label={`Avatar with initials: ${initials}`}
									style={{ "--size": "24px" }}
								></wa-avatar>
								<span>{name}</span>
							</div>
						</wa-tooltip>
					);
				}}
			</For>
		</>
	);
};

export default MarkdownView;
