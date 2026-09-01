import { createSignal, For, onMount, Show } from "solid-js";
import MarkdownField from "#/features/markdown/components/MarkdownField";
import MarkdownView from "#/features/markdown/components/MarkdownView";
import { formatTimestamp } from "#/utils/date";
import { dropdownItemValue, getInitials, uid } from "#/utils/misc";
import { REACTIONS_LIST } from "../constants/reactions";
import { seedComments } from "../constants/seed";
import type { Comment } from "../types";
import * as styles from "./commentsPanel.css";

interface CommentsPanelProps {
	parentId: string;
	comments: Comment[];
	onChange: (comments: Comment[]) => void;
	author?: string;
	seed?: boolean;
	onDelete?: (commentId: string) => void;
	maxHeight?: string;
}

const CommentsPanel = (props: CommentsPanelProps) => {
	const [commentDraft, setCommentDraft] = createSignal("");
	// Stores reactions per comment: { [commentId]: ["smile", "heart"] }
	const [reactions, setReactions] = createSignal<Record<string, string[]>>({});

	onMount(() => {
		if (props.seed && !props.comments.length) {
			props.onChange(seedComments(props.parentId));
		}
	});

	const addComment = () => {
		const text = commentDraft().trim();
		if (!text) return;

		const newComment: Comment = {
			id: uid(),
			parentId: props.parentId,
			author: props.author ?? "You",
			text,
			createdAt: new Date().toISOString(),
		};

		props.onChange([...props.comments, newComment]);
		setCommentDraft("");
	};

	const toggleReaction = (commentId: string, reactionIcon: string) => {
		setReactions((prev) => {
			const currentList = prev[commentId] ?? [];
			const exists = currentList.includes(reactionIcon);

			const updatedList = exists
				? currentList.filter((item) => item !== reactionIcon)
				: [...currentList, reactionIcon];

			return {
				...prev,
				[commentId]: updatedList,
			};
		});
	};

	return (
		<div class={styles.commentsPanel}>
			<div class={styles.commentsHeader}>
				<wa-icon name="message-square-text" label="Comments"></wa-icon>
				Comments
			</div>

			<div
				style={{
					display: "flex",
					gap: "var(--wa-space-s)",
				}}
			>
				<div class={styles.commentForm}>
					<MarkdownField
						value={commentDraft()}
						onChange={setCommentDraft}
						placeholder="Write a comment..."
						noControlsFooter={true}
					/>
					<wa-button
						type="button"
						variant="neutral"
						appearance="plain"
						slot="start"
						size="s"
						disabled={commentDraft().trim() === ""}
						onClick={addComment}
						style={{
							position: "absolute",
							bottom: "0",
							right: "0",
						}}
						tabIndex={0}
					>
						<wa-icon
							name="send-horizontal"
							label="Save comment"
							style={{ "font-size": "1.2rem" }}
						></wa-icon>
					</wa-button>
				</div>
			</div>

			<Show when={props.comments.length > 0}>
				<wa-divider style={{ "--spacing": "var(--wa-space-s)" }}></wa-divider>
				<div
					class={styles.commentsFeed}
					style={{ "max-height": props.maxHeight ?? "200px" }}
				>
					<For each={props.comments}>
						{(comment) => {
							const initials = getInitials(comment.author);
							const commentReactions = () => reactions()[comment.id] ?? [];

							return (
								<div
									style={{
										display: "flex",
										gap: "var(--wa-space-s)",
									}}
								>
									<wa-avatar
										initials={initials}
										label={`Avatar with initials: ${initials}`}
										style={{ "--size": "40px" }}
									></wa-avatar>
									<div class={styles.commentBubble}>
										<div class={styles.commentMeta}>
											<div
												style={{ display: "flex", gap: "var(--wa-space-s)" }}
											>
												<span
													style={{
														"font-weight": 600,
														color: "var(--wa-color-text-normal)",
													}}
												>
													{comment.author}
												</span>
												<span style={{ color: "var(--wa-color-text-quiet)" }}>
													{formatTimestamp(comment.createdAt)}
												</span>
											</div>
											{props.onDelete && (
												<wa-button
													variant="neutral"
													appearance="plain"
													size="xs"
													aria-label="Delete comment"
													onClick={() => props.onDelete?.(comment.id)}
												>
													<wa-icon name="trash-2"></wa-icon>
												</wa-button>
											)}
										</div>
										<div class={styles.commentText}>
											<MarkdownView text={comment.text} />
										</div>

										<div
											style={{
												display: "flex",
												"align-items": "center",
												gap: "var(--wa-space-3xs)",
												position: "absolute",
												bottom: "0",
												right: "0",
											}}
										>
											{/* Render active reaction badges */}
											<For each={commentReactions()}>
												{(iconName) => {
													const matched = REACTIONS_LIST.find(
														(r) => r.icon === iconName,
													);
													return (
														<wa-button
															appearance="outlined"
															variant="neutral"
															pill
															size="xs"
															onClick={() =>
																toggleReaction(comment.id, iconName)
															}
														>
															<wa-icon
																name={iconName}
																label={matched?.name ?? iconName}
																style={{
																	color: matched?.color || "",
																	"margin-right": "var(--wa-space-3xs)",
																}}
																slot="start"
															></wa-icon>
															{reactions.length + 1}
														</wa-button>
													);
												}}
											</For>

											<wa-dropdown
												on:wa-after-hide={(e: Event) => e.stopPropagation()}
												on:wa-select={(e: Event) => {
													const iconName = dropdownItemValue(e) ?? "";
													if (iconName) {
														toggleReaction(comment.id, iconName);
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
												<div
													style={{
														display: "flex",
														"flex-wrap": "wrap",
													}}
												>
													<For each={REACTIONS_LIST}>
														{(reaction) => {
															const isSelected = commentReactions().includes(
																reaction.icon,
															);
															return (
																<wa-dropdown-item
																	checked={isSelected}
																	value={reaction.icon}
																	style={{ padding: "var(--wa-space-xs)" }}
																>
																	<wa-icon
																		name={reaction.icon}
																		label={reaction.name}
																		style={{ color: reaction.color }}
																	></wa-icon>
																</wa-dropdown-item>
															);
														}}
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
