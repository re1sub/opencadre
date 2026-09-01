import { DragDropProvider } from "@dnd-kit/solid";
import { useSearchParams } from "@solidjs/router";
import { createEffect, For, Show } from "solid-js";
import { useWorkspaceTagsAdapter } from "#/features/tags/hooks/useWorkspaceTagsAdapter";
import ConfirmDialog from "#/features/ui/ConfirmDialog";
import { useWorkspaceMembersAdapter } from "#/features/workspace/hooks/useWorkspaceMembersAdapter";
import BoardColumn from "./components/BoardColumn";
import * as styles from "./components/board.css";
import CardDialog from "./components/CardDialog";
import ColumnDialog from "./components/ColumnDialog";
import { useKanbanBoardAdapter } from "./hooks/useKanbanBoardAdapter";

import type { Card } from "./types";

interface KanbanBoardProps {
	pageId?: string;
	workspaceId?: string;
	content?: string;
	onChangeContent?: (content: string) => void;
}

const KanbanBoard = (props: KanbanBoardProps) => {
	const [searchParams, setSearchParams] = useSearchParams<{ c?: string }>();
	const clearCardParam = () =>
		setSearchParams({ c: undefined }, { replace: true });

	const board = useKanbanBoardAdapter({
		pageId: props.pageId ?? "",
		onChange: (columns) => {
			props.onChangeContent?.(JSON.stringify(columns));
		},
	});
	const { tags } = useWorkspaceTagsAdapter(() => props.workspaceId ?? "");
	const { members } = useWorkspaceMembersAdapter(() => props.workspaceId ?? "");

	let openedCardParam: string | undefined;

	createEffect(() => {
		const cardId = searchParams.c;
		if (!cardId) {
			openedCardParam = undefined;
			return;
		}

		const columns = board.columns();

		let found: { columnId: string; card: Card } | undefined;

		for (const col of columns) {
			const card = col.cards.find((c) => c.id === cardId);
			if (card) {
				found = { columnId: col.id, card };
				break;
			}
		}

		if (!found) {
			clearCardParam();
			return;
		}

		if (openedCardParam === cardId) return;

		openedCardParam = cardId;
		board.openCardDialog(found.columnId, found.card);

		requestAnimationFrame(() => {
			const el = document.querySelector(`[data-card-id="${cardId}"]`);
			el?.scrollIntoView({ behavior: "smooth", block: "center" });
		});
	});

	const closeCardDialog = () => {
		openedCardParam = undefined;
		clearCardParam();
		board.setCardDialog(null);
	};

	return (
		<div class={styles.board} data-page-id={props.pageId}>
			<header class={styles.boardHeader}>
				<div>
					{/*<p class=d{styles.boardSubtitle}>
						{board
							.columns()
							.reduce((sum, column) => sum + column.cards.length, 0)}{" "}
						cards across {board.columns().length} columns
					</p>*/}
				</div>
			</header>

			<DragDropProvider onDragEnd={board.onDragEnd}>
				<div class={styles.columnsTrack}>
					<For each={board.columns()}>
						{(column, index) => (
							<BoardColumn
								column={column}
								tags={tags()}
								members={members()}
								index={index}
								pageId={props.pageId}
								onAddCard={board.addCard}
								onEditColumn={board.setColumnDialog}
							/>
						)}
					</For>

					<button
						type="button"
						class={styles.addColumnButton}
						onClick={board.addColumn}
					>
						+ Add column
					</button>
				</div>
			</DragDropProvider>

			<Show when={board.cardDialog()}>
				{(dialog) => (
					<CardDialog
						card={dialog().card}
						workspaceId={props.workspaceId ?? ""}
						members={members()}
						isNew={dialog().isNew}
						onClose={closeCardDialog}
						onSave={board.saveCard}
						onCreate={(draft) => board.createCard(draft)}
						onRequestDelete={() => {
							const target = dialog();
							closeCardDialog();
							board.setConfirmDialog({
								kind: "card",
								columnId: target.columnId,
								cardId: target.card.id,
								title: target.card.title,
							});
						}}
					/>
				)}
			</Show>

			<Show when={board.columnDialog()}>
				{(dialog) => (
					<ColumnDialog
						column={dialog()}
						onClose={() => board.setColumnDialog(null)}
						onSave={board.saveColumn}
						onRequestDelete={() => {
							const target = dialog();
							board.setColumnDialog(null);
							board.setConfirmDialog({
								kind: "column",
								columnId: target.id,
								title: target.title,
							});
						}}
					/>
				)}
			</Show>

			<Show when={board.confirmDialog()}>
				{(dialog) => {
					const target = dialog();

					return target.kind === "card" ? (
						<ConfirmDialog
							label="Delete card"
							message={`Are you sure you want to delete "${target.title}"? This action cannot be undone.`}
							onConfirm={() => board.deleteCard(target.columnId, target.cardId)}
							onClose={() => board.setConfirmDialog(null)}
						/>
					) : (
						<ConfirmDialog
							label="Delete column"
							message={`Are you sure you want to delete "${target.title}" and all of its cards? This action cannot be undone.`}
							onConfirm={() => board.deleteColumn(target.columnId)}
							onClose={() => board.setConfirmDialog(null)}
						/>
					);
				}}
			</Show>
		</div>
	);
};

export default KanbanBoard;
