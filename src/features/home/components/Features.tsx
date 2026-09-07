import { For } from "solid-js";
import { Motion } from "solid-motionone";
import {
	card,
	cardContent,
	cardDescription,
	cardIcon,
	cardImage,
	cardInner,
	cardText,
	cardTitle,
	grid,
	heading,
	subtitle,
	titleBlock,
} from "./features.css";

const featureCards = [
	{
		icon: "zap",
		title: "Real-time collaboration",
		description:
			"Every change is instantly visible to your whole team. No refreshing, no conflicts, no out-of-sync boards.",
	},
	{
		icon: "sparkles",
		title: "AI assistance",
		description:
			"Write descriptions, edit content, create cards and generate subtasks. AI is built into the workflow, not bolted on.",
	},
	{
		icon: "layout-template",
		title: "Templates",
		description:
			"Start faster with pre-built board templates. Duplicate and customize them for any project type.",
	},
	{
		icon: "message-circle-more",
		title: "Comments",
		description:
			"Discuss tasks directly on the card. Keep context where the work is, not scattered across messages.",
	},
	{
		icon: "square-slash",
		title: "Keyboard shortcuts",
		description:
			"Navigate, create and act without leaving the keyboard. Built for people who prefer to stay in flow.",
	},
	{
		icon: "bell",
		title: "Notifications",
		description:
			"Stay in the loop on what matters. Get notified when cards are updated, assigned or commented on.",
	},
];

const Features = () => {
	let gridRef!: HTMLDivElement;

	function onCardPointerMove(e: PointerEvent) {
		if (e.pointerType !== "mouse") return;

		for (const child of gridRef.children) {
			const element = child as HTMLElement;
			const rect = element.getBoundingClientRect();

			element.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
			element.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
		}
	}

	return (
		<Motion.section
			initial={{ opacity: 0, y: 50 }}
			inView={{ opacity: 1, y: 0 }}
			inViewOptions={{ once: true }}
			transition={{ duration: 1 }}
		>
			<div class={titleBlock}>
				<h2 class={heading}>Less overhead, more done</h2>
				<p class={subtitle}>
					OpenCadre combines kanban boards, real-time collaboration and AI
					assistance in one clean interface.
				</p>
				<wa-badge
					variant="brand"
					pill
					style={{ "font-size": "var(--wa-font-size-m)" }}
				>
					Features
				</wa-badge>
			</div>
			<div class={grid} ref={gridRef} onPointerMove={onCardPointerMove}>
				<For each={featureCards}>
					{(feature) => (
						<article class={card}>
							<div class={cardInner}>
								<wa-icon
									class={cardImage}
									name={feature.icon}
									style={{ "font-size": "5rem" }}
								></wa-icon>
								<div class={cardContent}>
									<span class={cardIcon}>
										<wa-icon name={feature.icon}></wa-icon>
									</span>
									<div class={cardText}>
										<h3 class={cardTitle}>{feature.title}</h3>
										<p class={cardDescription}>{feature.description}</p>
									</div>
								</div>
							</div>
						</article>
					)}
				</For>
			</div>
		</Motion.section>
	);
};

export default Features;
