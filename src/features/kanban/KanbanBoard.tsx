import { DragDropProvider } from "@dnd-kit/solid";
import { For, Show } from "solid-js";
import { useWorkspaceTags } from "#/features/tags/hooks/useWorkspaceTags";
import ConfirmDialog from "#/features/ui/ConfirmDialog";
import BoardColumn from "./components/BoardColumn";
import * as styles from "./components/board.css";
import CardDialog from "./components/CardDialog";
import ColumnDialog from "./components/ColumnDialog";
import { useKanbanBoard } from "./hooks/useKanbanBoard";

interface KanbanBoardProps {
	pageId?: string;
	workspaceId?: string;
}

const KanbanBoard = (props: KanbanBoardProps) => {
	const board = useKanbanBoard();
	const { tags } = useWorkspaceTags(props.workspaceId ?? "");

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
								index={index}
								onAddCard={board.addCard}
								onOpenCard={board.openCardDialog}
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
						onClose={() => board.setCardDialog(null)}
						onSave={board.saveCard}
						onRequestDelete={() => {
							const target = dialog();
							board.setCardDialog(null);
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
