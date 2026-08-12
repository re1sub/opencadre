import { useSortable } from "@dnd-kit/solid/sortable";
import { Show } from "solid-js";
import { useDragTilt } from "../hooks/useDragTilt";
import type { Card } from "../types";
import * as styles from "./board.css";

interface SortableCardProps {
	card: Card;
	index: number;
	columnId: string;
	onOpen: (card: Card) => void;
}

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

	return (
		<div
			ref={ref}
			class={styles.card}
			classList={{
				[styles.cardDragging]: isDragging(),
				[styles.cardDropTarget]: isDropTarget(),
			}}
			style={{
				rotate: `${rotation()}deg`,
			}}
			onClick={() => props.onOpen(props.card)}
		>
			<h4 class={styles.cardTitle}>{props.card.title}</h4>

			<Show when={props.card.description}>
				<p class={styles.cardDescription}>{props.card.description}</p>
			</Show>
		</div>
	);
};

export default SortableCard;
