import { useDroppable } from "@dnd-kit/solid";
import { useSortable } from "@dnd-kit/solid/sortable";
import { For } from "solid-js";
import type { Tag } from "#/features/tags/types";
import type { WorkspaceMember } from "#/features/workspace/types";
import { useDragTilt } from "../hooks/useDragTilt";
import { BOARD_ID, type Column } from "../types";
import * as styles from "./board.css";
import SortableCard from "./SortableCard";

interface BoardColumnProps {
	column: Column;
	tags: Tag[];
	members?: WorkspaceMember[];
	index: () => number;
	pageId?: string;
	onAddCard: (columnId: string) => void;
	onEditColumn: (column: Column) => void;
	onFocusColumn?: (columnId: string) => void;
}

const BoardColumn = (props: BoardColumnProps) => {
	// Column as sortable (for column reordering)
	const {
		ref: sortableRef,
		handleRef,
		isDragging,
		isDropTarget,
	} = useSortable({
		get id() {
			return props.column.id;
		},
		get index() {
			return props.index();
		},
		group: BOARD_ID,
		type: "column",
		accept: ["column"],
		collisionPriority: 1,
	});

	// Column as a droppable for cards (so empty columns can receive drops)
	const { ref: droppableRef, isDropTarget: isCardDropTarget } = useDroppable({
		id: `${props.column.id}-cards-droppable`,
		type: "column-droppable",
		accept: ["card"],
		collisionPriority: 0, // lower than cards (cards have 2)
	});

	const rotation = useDragTilt(isDragging);

	return (
		<section
			ref={(el) => {
				sortableRef(el);
				droppableRef(el);
			}}
			class={styles.column}
			classList={{
				[styles.columnDragging]: isDragging(),
				[styles.columnDropTarget]: isDropTarget(),
				[styles.columnCardDropTarget]: isCardDropTarget(),
			}}
			onClick={() => props.onFocusColumn?.(props.column.id)}
			style={{
				"--column-accent": props.column.color,
				rotate: `${rotation()}deg`,
			}}
		>
			<div class={styles.columnHeader}>
				<div ref={handleRef} class={styles.columnHeaderTitle}>
					<span class={styles.columnDot}></span>
					<span class={styles.columnTitle}>
						{props.column.title}
						<strong class={styles.columnCount}>
							{props.column.cards.length}
						</strong>
					</span>
				</div>

				<wa-button
					type="button"
					variant="neutral"
					appearance="plain"
					aria-label="Column settings"
					class={styles.columnControlsButton}
					size="xs"
					onClick={() => props.onEditColumn(props.column)}
				>
					<wa-icon name="ellipsis-vertical" label="Column settings"></wa-icon>
				</wa-button>
			</div>

			<div class={styles.columnCards}>
				<For each={props.column.cards}>
					{(card, index) => (
						<SortableCard
							card={card}
							tags={props.tags}
							members={props.members}
							index={index()}
							columnId={props.column.id}
							pageId={props.pageId}
						/>
					)}
				</For>
			</div>

			<wa-button
				type="button"
				variant="neutral"
				appearance="outlined"
				class={styles.addCardButton}
				onClick={() => props.onAddCard(props.column.id)}
			>
				<wa-icon slot="start" name="plus"></wa-icon>
				Add card
			</wa-button>
		</section>
	);
};

export default BoardColumn;
