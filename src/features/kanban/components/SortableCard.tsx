import { useSortable } from "@dnd-kit/solid/sortable";
import { For, Show } from "solid-js";
import type { Tag } from "#/features/tags/types";
import type { WorkspaceMember } from "#/features/workspace/types";
import { resolveRefs } from "#/utils/array";
import { formatDueDate, getDueDateStatus } from "#/utils/date";
import { colorMix, getInitials } from "#/utils/misc";
import { useDragTilt } from "../hooks/useDragTilt";
import type { Card } from "../types";
import * as styles from "./board.css";

interface SortableCardProps {
	card: Card;
	tags: Tag[];
	members?: WorkspaceMember[];
	commentCount?: number;
	index: number;
	columnId: string;
	pageId?: string;
}

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

	const assignedMembers = () =>
		resolveRefs(props.card.assigneeIds, props.members ?? []).filter(
			(member): member is WorkspaceMember => !!member,
		);

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
									"background-color": colorMix(tag.color, 30),
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
				<Show when={props.card.dueDate}>
					{(due) => (
						<span class={styles.cardDue} data-status={getDueDateStatus(due())}>
							<wa-icon name="calendar" label="Due date"></wa-icon>
							{formatDueDate(due())}
						</span>
					)}
				</Show>
				<div class={styles.cardMetaSpacer}></div>
				<Show when={(props.commentCount ?? 0) > 0}>
					<span class={styles.cardMetaGroup}>
						<wa-icon name="message-square-text" label="Comments"></wa-icon>
						{props.commentCount}
					</span>
				</Show>
				<Show when={assignedMembers().length}>
					<div class={styles.cardAvatarStack}>
						<For each={assignedMembers().slice(0, 5)}>
							{(member) => (
								<wa-avatar
									initials={getInitials(member.name)}
									label={member.name}
									class={styles.cardAvatar}
									style={{
										"--size": "26px",
										color: "#fff",
									}}
								></wa-avatar>
							)}
						</For>
						<Show when={assignedMembers().length > 5}>
							<span
								style={{
									"margin-left": "var(--wa-space-3xs)",
									color: "var(--wa-color-text-quiet)",
									"font-size": "var(--wa-font-size-xs)",
									"font-weight": "600",
								}}
							>
								+{assignedMembers().length - 5}
							</span>
						</Show>
					</div>
				</Show>
			</div>
		</a>
	);
};

export default SortableCard;
