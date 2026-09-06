import { createEffect, createSignal, Index, Show } from "solid-js";
import CommentsPanel from "#/features/comments/components/CommentsPanel";
import { useCommentsAdapter } from "#/features/comments/hooks/useCommentsAdapter";
import MarkdownField from "#/features/markdown/components/MarkdownField";
import TagEditor from "#/features/tags/components/TagEditor";
import TagPicker from "#/features/tags/components/TagPicker";
import { useWorkspaceTagsAdapter } from "#/features/tags/hooks/useWorkspaceTagsAdapter";
import type { Tag } from "#/features/tags/types";
import DeleteButton from "#/features/ui/DeleteButton";
import EditableText from "#/features/ui/EditableText";
import type {
	WorkspaceMember,
	WorkspaceRole,
} from "#/features/workspace/types";
import type { EntityContext } from "#/types/ai";
import { useDialog } from "#/utils/useDialog";
import type { Card } from "../types";
import AssigneePicker from "./AssigneePicker";
import {
	customLabel,
	dialogCardTitle,
	dialogContainer,
	dialogContent,
	dialogLeftColumn,
	dialogMetaGroup,
	dialogMetaRow,
	dialogTags,
	editCardDialog,
} from "./cardDialog.css";
import DueDate from "./DueDate";
import MemberChips from "./MemberChips";

interface CardDialogProps {
	card: Card;
	workspaceId: string;
	pageId?: string;
	members: WorkspaceMember[];
	myRole?: WorkspaceRole;
	isNew?: boolean;
	onClose: () => void;
	onSave: (card: Card) => void;
	onCreate?: (card: Card) => void;
	onRequestDelete: () => void;
}

const CardDialog = (props: CardDialogProps) => {
	const dialog = useDialog(props.onClose, props.onRequestDelete);

	const {
		tags,
		addTag: addWorkspaceTag,
		updateTag: updateWorkspaceTag,
	} = useWorkspaceTagsAdapter(() => props.workspaceId);

	const [card, setCard] = createSignal<Card>(props.card);
	const [titleFocused, setTitleFocused] = createSignal(false);
	const [descFocused, setDescFocused] = createSignal(false);

	const cardComments = useCommentsAdapter(() =>
		props.isNew ? null : { type: "card" as const, id: props.card.id },
	);

	const cardThread = () => cardComments.threads()[0];

	const cardEntity: EntityContext = {
		type: "card",
		id: card().id,
		pageId: props.pageId,
	};

	// Live-sync remote edits into the local buffer, except fields currently being typed
	createEffect(() => {
		if (props.isNew) return;
		const remote = props.card;
		const tf = titleFocused();
		const df = descFocused();
		setCard((prev) => {
			// Preserve focused text fields to avoid stomping keystrokes/caret
			const nextTitle = tf ? prev.title : remote.title;
			const nextDesc = df
				? (prev.description ?? "")
				: (remote.description ?? "");
			// Short-circuit if nothing meaningful changed to avoid noisy rerenders
			if (
				prev.title === nextTitle &&
				(prev.description ?? "") === nextDesc &&
				(prev.dueDate ?? null) === (remote.dueDate ?? null) &&
				JSON.stringify(prev.assigneeIds ?? []) ===
					JSON.stringify(remote.assigneeIds ?? []) &&
				JSON.stringify(prev.tagIds ?? []) ===
					JSON.stringify(remote.tagIds ?? [])
			)
				return prev;
			return {
				...prev,
				title: nextTitle,
				description: nextDesc,
				dueDate: remote.dueDate ?? null,
				assigneeIds: remote.assigneeIds ?? [],
				tagIds: remote.tagIds ?? [],
			};
		});
	});

	const attachedTags = () =>
		(card().tagIds ?? [])
			.map((id) => tags().find((tag) => tag.id === id))
			.filter((tag): tag is Tag => !!tag);

	const updateAndSaveCard = (updates: Partial<Card>) => {
		const updated = { ...card(), ...updates };
		setCard(updated);
		if (!props.isNew) props.onSave(updated);
	};

	const handleTitleChange = (newTitle: string) => {
		updateAndSaveCard({ title: newTitle });
	};

	const handleDescriptionSave = (newDescription: string) => {
		updateAndSaveCard({ description: newDescription });
	};

	const handleCreate = () => {
		props.onCreate?.(card());
		dialog.close();
	};

	const attachTag = (tagId: string) => {
		const current = card().tagIds ?? [];
		if (!current.includes(tagId)) {
			updateAndSaveCard({ tagIds: [...current, tagId] });
		}
	};

	const createTag = async (tagName: string, color: string) => {
		const tag = await addWorkspaceTag(tagName, color);
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

	const toggleAssignee = (memberId: string) => {
		const current = card().assigneeIds ?? [];
		updateAndSaveCard({
			assigneeIds: current.includes(memberId)
				? current.filter((id) => id !== memberId)
				: [...current, memberId],
		});
	};

	return (
		<wa-dialog
			ref={dialog.ref}
			light-dismiss
			label="Card details"
			on:wa-after-hide={dialog.handleHide}
			class={dialogContainer}
			classList={{
				[editCardDialog]: !props.isNew,
			}}
			style={{ "--width": props.isNew ? "40vw" : "" }}
		>
			<div slot="header-actions">
				<Show when={!props.isNew}>
					<DeleteButton
						onDelete={dialog.handleDelete}
						label="Delete card"
						iconOnly
					/>
				</Show>
			</div>

			<div class={dialogContent}>
				<div class={dialogLeftColumn}>
					<div
						onFocusIn={() => setTitleFocused(true)}
						onFocusOut={() => setTitleFocused(false)}
					>
						<EditableText
							value={card().title}
							onChange={handleTitleChange}
							ariaLabel="Title"
							class={dialogCardTitle}
							autoFocus={props.isNew}
						/>
					</div>

					<div
						class={dialogLeftColumn}
						style={{ padding: "var(--wa-space-xs)" }}
					>
						<div class={dialogMetaRow}>
							<div class={dialogMetaGroup}>
								Assignees
								<AssigneePicker
									members={props.members}
									assigneeIds={card().assigneeIds ?? []}
									onToggle={toggleAssignee}
								/>
							</div>
						</div>

						<MemberChips
							assigneeIds={card().assigneeIds ?? []}
							members={props.members}
							onRemove={toggleAssignee}
						/>

						<div class={dialogMetaGroup}>
							Tags
							<TagPicker
								tags={tags()}
								attachedTagIds={card().tagIds ?? []}
								onAttach={attachTag}
								onCreate={createTag}
							/>
						</div>

						<div
							class={dialogTags}
							style={{ height: attachedTags().length ? "80px" : "10px" }}
						>
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

						<div
							class={customLabel}
							style={{ "margin-bottom": "var(--wa-space-xs)" }}
						>
							<wa-icon name="calendar"></wa-icon>Due date
						</div>
						<DueDate
							value={card().dueDate ?? null}
							onChange={(v) => updateAndSaveCard({ dueDate: v })}
						/>
						<div class={customLabel}>
							<wa-icon name="list-sort-descending"></wa-icon>Description
						</div>
						<div
							onFocusIn={() => setDescFocused(true)}
							onFocusOut={() => setDescFocused(false)}
						>
							<MarkdownField
								value={card().description ?? ""}
								onSave={handleDescriptionSave}
								onChange={props.isNew ? handleDescriptionSave : undefined}
								noControlsFooter={props.isNew}
								placeholder="Add a description..."
								entity={cardEntity}
							/>
						</div>
					</div>
				</div>

				<Show when={!props.isNew}>
					<CommentsPanel
						comments={cardThread()?.comments ?? []}
						reactions={cardComments.reactions()}
						currentUserId={cardComments.currentUserId()}
						authorNames={cardComments.authorNames()}
						myRole={props.myRole}
						entity={cardEntity}
						onAddComment={async (text) => {
							const thread =
								cardThread() ?? (await cardComments.ensureThread());
							await cardComments.addComment(thread.id, text);
						}}
						onToggleReaction={(commentId, reaction) => {
							void cardComments.toggleReaction(commentId, reaction);
						}}
						onDelete={(commentId) => {
							const thread = cardThread();
							if (thread) void cardComments.deleteComment(thread.id, commentId);
						}}
					/>
				</Show>
			</div>

			<Show when={props.isNew}>
				<div slot="footer">
					<div style={{ display: "flex", gap: "var(--wa-space-s)" }}>
						<wa-button variant="neutral" onClick={() => dialog.close()}>
							Cancel
						</wa-button>
						<wa-button variant="brand" onClick={handleCreate}>
							Create card
						</wa-button>
					</div>
				</div>
			</Show>
		</wa-dialog>
	);
};

export default CardDialog;
