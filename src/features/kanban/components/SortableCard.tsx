import { useSortable } from "@dnd-kit/solid/sortable";
import { For, Show } from "solid-js";
import type { Tag } from "#/features/tags/types";
import { useDragTilt } from "../hooks/useDragTilt";
import type { Card } from "../types";
import * as styles from "./board.css";

interface SortableCardProps {
	card: Card;
	tags: Tag[];
	index: number;
	columnId: string;
	pageId?: string;
}

const colMixBg = (color: string, opacity: number = 30) =>
	`color-mix(in srgb, ${color} ${opacity}%, transparent)`;

const MAX_TAGS = 3;

const SortableCard = (props: SortableCardProps) => {
	const { ref, isDragging, isDropTarget } = useSortable({
		get id() {
			return props.card.id;
		},
		get index() {
			return props.index;
		},
		get group() {
			return props.columnId;
		},
		type: "card",
		accept: ["card"],
		collisionPriority: 2,
		transition: {
			duration: 0, // Too jumpy
		},
	});

	const rotation = useDragTilt(isDragging);

	const cardTags = () =>
		props.tags.filter((tag) => props.card.tagIds?.includes(tag.id));

	// Get only the first 4 tags
	const visibleTags = () => cardTags().slice(0, MAX_TAGS);

	// Calculate remaining count (+N)
	const remainingCount = () => cardTags().length - MAX_TAGS;

	const commentsCount = () => props.card.comments?.length ?? 0;

	return (
		<a
			ref={ref}
			href={`/workspace/p/${props.pageId ?? ""}?c=${props.card.id}`}
			class={styles.card}
			classList={{
				[styles.cardDragging]: isDragging(),
				[styles.cardDropTarget]: isDropTarget(),
			}}
			style={{
				rotate: `${rotation()}deg`,
			}}
			data-card-id={props.card.id}
		>
			<h4 class={styles.cardTitle}>{props.card.title}</h4>

			<Show when={props.card.description}>
				<p class={styles.cardDescription}>{props.card.description}</p>
			</Show>

			<Show when={cardTags().length}>
				<div class={styles.cardTags}>
					<For each={visibleTags()}>
						{(tag) => (
							<wa-tag
								size="xs"
								appearance="outlined"
								style={{
									"background-color": colMixBg(tag.color, 30),
									color: "var(--wa-color-text-normal)",
								}}
							>
								{tag.name}
							</wa-tag>
						)}
					</For>

					<Show when={remainingCount() > 0}>
						<wa-tag
							size="xs"
							appearance="outlined"
							style={{
								color: "var(--wa-color-text-subtle)",
								position: "absolute",
								top: "50%",
								transform: "translateY(-50%)",
								right: "5px",
							}}
						>
							+{remainingCount()}
						</wa-tag>
					</Show>
				</div>
			</Show>
			<div class={styles.cardMeta}>
				<wa-icon name="message-square-text" label="Comments"></wa-icon>
				<span>{commentsCount()}</span>
			</div>
		</a>
	);
};

export default SortableCard;
