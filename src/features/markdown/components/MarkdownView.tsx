import DOMPurify from "dompurify";
import { marked } from "marked";
import { createEffect, createSignal, For, splitProps } from "solid-js";
import type { WorkspaceMember } from "#/features/workspace/types";
import { cn, getInitials, uid } from "#/utils/misc";
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
		// Use DOMPurify for hardened sanitization
		const cleanHtml = DOMPurify.sanitize(html, {
			ADD_TAGS: ["wa-badge"], // Explicitly allow Web Awesome components
		});
		const template = document.createElement("template");
		template.innerHTML = cleanHtml;

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
			<div ref={ref} class={cn(view, local.class)} {...rest} />
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
