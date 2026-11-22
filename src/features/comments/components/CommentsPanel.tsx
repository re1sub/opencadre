import { createSignal, For, Show } from "solid-js";
import MarkdownField from "#/features/markdown/components/MarkdownField";
import MarkdownView from "#/features/markdown/components/MarkdownView";
import { canManageMembers } from "#/features/workspace/constants/roles";
import type {
	WorkspaceMember,
	WorkspaceRole,
} from "#/features/workspace/types";
import type { EntityContext } from "#/types/ai";
import { formatTimestamp } from "#/utils/date";
import { dropdownItemValue, getInitials } from "#/utils/misc";
import { REACTIONS_LIST } from "../constants/reactions";
import type { Comment, CommentReaction } from "../types";
import * as styles from "./commentsPanel.css";

interface CommentsPanelProps {
	comments: Comment[];
	reactions: CommentReaction[];
	currentUserId: string | null;
	authorNames?: Record<string, string>;
	myRole?: WorkspaceRole;
	onAddComment: (text: string) => void | Promise<void>;
	onToggleReaction: (commentId: string, reaction: string) => void;
	onDelete?: (commentId: string) => void;
	maxHeight?: string;
	entity?: EntityContext;
	members?: WorkspaceMember[];
}

const CommentsPanel = (props: CommentsPanelProps) => {
	const [commentDraft, setCommentDraft] = createSignal("");

	const submitComment = async () => {
		const text = commentDraft().trim();
		if (!text) return;
		setCommentDraft("");
		try {
			await props.onAddComment(text);
		} catch {
			return;
		}
	};

	return (
		<div class={styles.commentsPanel}>
			<div>
				<div class={styles.commentsHeader}>
					<wa-icon name="message-square-text" label="Comments"></wa-icon>
					Comments
				</div>

				<div class={styles.flexGapS}>
					<div class={styles.commentForm}>
						<MarkdownField
							value={commentDraft()}
							onChange={setCommentDraft}
							placeholder="Write a comment..."
							noControlsFooter={true}
							entity={props.entity}
							members={props.members}
						/>
						<wa-button
							type="button"
							variant="neutral"
							appearance="plain"
							slot="start"
							size="s"
							disabled={commentDraft().trim() === ""}
							onClick={submitComment}
							class={styles.saveButton}
							tabIndex={0}
						>
							<wa-icon
								name="send-horizontal"
								label="Save comment"
								class={styles.sendIcon}
							></wa-icon>
						</wa-button>
					</div>
				</div>
			</div>

			<Show when={props.comments.length > 0}>
				<wa-divider class={styles.dividerSpacingS}></wa-divider>
				<div
					class={styles.commentsFeed}
					style={{ "--comments-max-height": props.maxHeight ?? "200px" }}
				>
					<For each={props.comments}>
						{(comment) => {
							const getDisplayName = (userId: string) =>
								props.authorNames?.[userId] ?? userId.slice(0, 8);

							const name = () => getDisplayName(comment.authorId);
							const initials = () => getInitials(name());

							const reactionGroups = () => {
								const map = new Map<string, string[]>();
								for (const r of props.reactions) {
									if (r.commentId !== comment.id) continue;
									const users = map.get(r.reaction) ?? [];
									users.push(r.userId);
									map.set(r.reaction, users);
								}
								return [...map.entries()].map(([reaction, users]) => ({
									reaction,
									users,
								}));
							};

							const reactedByMe = (reaction: string) =>
								Boolean(
									props.currentUserId &&
										reactionGroups().some(
											(g) =>
												g.reaction === reaction &&
												g.users.includes(props.currentUserId!),
										),
								);

							const canDelete = (comment: Comment) =>
								Boolean(
									props.onDelete &&
										props.currentUserId &&
										(comment.authorId === props.currentUserId ||
											(props.myRole && canManageMembers(props.myRole))),
								);

							return (
								<div class={styles.flexGapS}>
									<div class={styles.commentBubble}>
										<div class={styles.commentMeta}>
											<div class={styles.metaAuthorGroup}>
												<wa-avatar
													initials={initials()}
													label={`Avatar with initials: ${initials()}`}
													class={styles.smallAvatar}
												></wa-avatar>
												<span class={styles.authorName}>{name()}</span>
												<span class={styles.quietText}>
													{formatTimestamp(comment.createdAt)}
												</span>
											</div>
											<Show when={canDelete(comment)}>
												<wa-button
													variant="neutral"
													appearance="plain"
													size="xs"
													aria-label="Delete comment"
													onClick={() => props.onDelete?.(comment.id)}
												>
													<wa-icon name="trash-2"></wa-icon>
												</wa-button>
											</Show>
										</div>
										<div class={styles.commentText}>
											<MarkdownView
												text={comment.text}
												members={props.members}
											/>
										</div>

										<div class={styles.reactionBar}>
											<For each={reactionGroups()}>
												{(group) => {
													const matched = REACTIONS_LIST.find(
														(r) => r.icon === group.reaction,
													);
													const tooltipId = `reaction-${comment.id}-${group.reaction}`;
													return (
														<>
															<wa-button
																id={tooltipId}
																appearance={
																	reactedByMe(group.reaction)
																		? "filled"
																		: "outlined"
																}
																variant="neutral"
																pill
																size="xs"
																onClick={() =>
																	props.onToggleReaction(
																		comment.id,
																		group.reaction,
																	)
																}
															>
																<wa-icon
																	name={group.reaction}
																	label={matched?.name ?? group.reaction}
																	class={styles.reactionIcon}
																	style={{
																		"--comments-reaction-color":
																			matched?.color || "",
																	}}
																	slot="start"
																></wa-icon>
																{group.users.length}
															</wa-button>
															<wa-tooltip
																for={tooltipId}
																on:wa-after-hide={(e: Event) =>
																	e.stopPropagation()
																}
															>
																<div class={styles.tooltipUsers}>
																	<For each={group.users.slice(0, 5)}>
																		{(userId) => {
																			const name = getDisplayName(userId);
																			const initials = getInitials(name);
																			return (
																				<div class={styles.tooltipUserRow}>
																					<wa-avatar
																						initials={initials}
																						label={`Avatar with initials: ${initials}`}
																						class={styles.smallAvatar}
																					></wa-avatar>
																					<span>{name}</span>
																				</div>
																			);
																		}}
																	</For>
																	<Show when={group.users.length > 5}>
																		<wa-divider
																			class={styles.dividerSpacing3xs}
																		></wa-divider>
																		<span
																			class={`${styles.quietText} ${styles.extraUsersFontSize}`}
																		>
																			+{group.users.length - 5} users
																		</span>
																	</Show>
																</div>
															</wa-tooltip>
														</>
													);
												}}
											</For>

											<wa-dropdown
												on:wa-after-hide={(e: Event) => e.stopPropagation()}
												on:wa-select={(e: Event) => {
													const iconName = dropdownItemValue(e) ?? "";
													if (iconName) {
														props.onToggleReaction(comment.id, iconName);
													}
												}}
												placement="bottom-end"
											>
												<wa-button
													slot="trigger"
													variant="neutral"
													appearance="plain"
													size="s"
													aria-label="Choose reaction"
												>
													<wa-icon name="face-slightly-smiling-plus"></wa-icon>
												</wa-button>
												<div class={styles.reactionPicker}>
													<For each={REACTIONS_LIST}>
														{(reaction) => (
															<wa-dropdown-item
																checked={reactedByMe(reaction.icon)}
																value={reaction.icon}
																class={styles.dropdownItemPadding}
															>
																<wa-icon
																	name={reaction.icon}
																	label={reaction.name}
																	class={styles.dropdownReactionIcon}
																	style={{
																		"--comments-dropdown-reaction-color":
																			reaction.color,
																	}}
																></wa-icon>
															</wa-dropdown-item>
														)}
													</For>
												</div>
											</wa-dropdown>
										</div>
									</div>
								</div>
							);
						}}
					</For>
				</div>
			</Show>
		</div>
	);
};

export default CommentsPanel;
