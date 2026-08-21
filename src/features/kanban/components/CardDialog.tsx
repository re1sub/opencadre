import { createSignal, Index, Show } from "solid-js";
import CommentsPanel from "#/features/comments/components/CommentsPanel";
import type { Comment } from "#/features/comments/types";
import MarkdownField from "#/features/markdown/components/MarkdownField";
import TagEditor from "#/features/tags/components/TagEditor";
import TagPicker from "#/features/tags/components/TagPicker";
import { useWorkspaceTags } from "#/features/tags/hooks/useWorkspaceTags";
import type { Tag } from "#/features/tags/types";
import DeleteButton from "#/features/ui/DeleteButton";
import EditableText from "#/features/ui/EditableText";
import { useDialog } from "#/utils/useDialog";
import type { Card } from "../types";
import {
	customLabel,
	dialogCardTitle,
	dialogContainer,
	dialogContent,
	dialogLeftColumn,
	dialogTags,
} from "./cardDialog.css";

interface CardDialogProps {
	card: Card;
	workspaceId: string;
	onClose: () => void;
	onSave: (card: Card) => void;
	onRequestDelete: () => void;
}

const CardDialog = (props: CardDialogProps) => {
	const dialog = useDialog(props.onClose, props.onRequestDelete);

	const {
		tags,
		addTag: addWorkspaceTag,
		updateTag: updateWorkspaceTag,
	} = useWorkspaceTags(props.workspaceId);

	const [card, setCard] = createSignal<Card>(props.card);

	const attachedTags = () =>
		(card().tagIds ?? [])
			.map((id) => tags().find((tag) => tag.id === id))
			.filter((tag): tag is Tag => !!tag);

	const updateAndSaveCard = (updates: Partial<Card>) => {
		const updated = { ...card(), ...updates };
		setCard(updated);
		props.onSave(updated);
	};

	const handleTitleChange = (newTitle: string) => {
		updateAndSaveCard({ title: newTitle });
	};

	const handleCommentsChange = (newComments: Comment[]) => {
		updateAndSaveCard({ comments: newComments });
	};

	const handleDescriptionSave = (newDescription: string) => {
		updateAndSaveCard({ description: newDescription });
	};

	const attachTag = (tagId: string) => {
		const current = card().tagIds ?? [];
		if (!current.includes(tagId)) {
			updateAndSaveCard({ tagIds: [...current, tagId] });
		}
	};

	const createTag = (tagName: string, color: string) => {
		const tag = addWorkspaceTag(tagName, color);
		const current = card().tagIds ?? [];
		updateAndSaveCard({ tagIds: [...current, tag.id] });
	};

	const updateTag = (tagId: string, name: string, color: string) => {
		updateWorkspaceTag(tagId, name, color);
	};

	const removeTag = (tagId: string) => {
		const current = card().tagIds ?? [];
		updateAndSaveCard({ tagIds: current.filter((id) => id !== tagId) });
	};

	return (
		<wa-dialog
			ref={dialog.ref}
			light-dismiss
			label="Card details"
			on:wa-after-hide={dialog.handleHide}
			class={dialogContainer}
		>
			<div slot="header-actions">
				<DeleteButton
					onDelete={dialog.handleDelete}
					label="Delete card"
					iconOnly
				/>
			</div>

			<div class={dialogContent}>
				<div class={dialogLeftColumn}>
					<EditableText
						value={card().title}
						onChange={handleTitleChange}
						ariaLabel="Title"
						class={dialogCardTitle}
					/>

					<div
						class={dialogLeftColumn}
						style={{ padding: "var(--wa-space-xs)" }}
					>
						<div
							style={{
								display: "flex",
								gap: "var(--wa-space-xs)",
								"align-items": "center",
							}}
						>
							Tags
							<TagPicker
								tags={tags()}
								attachedTagIds={card().tagIds ?? []}
								onAttach={attachTag}
								onCreate={createTag}
							/>
						</div>
						<div class={dialogTags}>
							<Show when={attachedTags().length}>
								<Index each={attachedTags()}>
									{(tag) => (
										<TagEditor
											tag={tag()}
											onUpdate={updateTag}
											onRemove={removeTag}
										/>
									)}
								</Index>
							</Show>
						</div>
						<div class={customLabel}>
							<wa-icon name="list-sort-descending"></wa-icon>Description
						</div>

						<MarkdownField
							value={card().description ?? ""}
							onSave={handleDescriptionSave}
							placeholder="Add a description..."
						/>
					</div>
				</div>

				<CommentsPanel
					parentId={card().id}
					comments={card().comments ?? []}
					onChange={handleCommentsChange}
				/>
			</div>
		</wa-dialog>
	);
};

export default CardDialog;
