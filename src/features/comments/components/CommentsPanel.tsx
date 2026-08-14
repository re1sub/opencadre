import { createSignal, For, onMount, Show } from "solid-js";
import MarkdownField from "#/features/markdown/components/MarkdownField";
import MarkdownView from "#/features/markdown/components/MarkdownView";
import { formatTimestamp } from "#/utils/date";
import { uid } from "#/utils/uid";
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

  return (
    <div
      class={styles.commentsPanel}
      style={{ "max-height": props.maxHeight ?? "420px" }}
    >
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
        <div class={styles.avatar}>
          {(props.author ?? "You").slice(0, 2).toUpperCase()}
        </div>
        <div class={styles.commentForm}>
          <MarkdownField
            value={commentDraft()}
            onChange={setCommentDraft}
            placeholder="Write a comment..."
            minHeight="5rem"
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
        <div class={styles.commentsFeed}>
          <For each={props.comments}>
            {(comment) => (
              <div style={{ display: "flex", gap: "var(--wa-space-s)" }}>
                <div class={styles.avatar}>
                  {comment.author.slice(0, 2).toUpperCase()}
                </div>
                <div class={styles.commentBubble}>
                  <div class={styles.commentMeta}>
                    <div style={{ display: "flex", gap: "var(--wa-space-s)" }}>
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
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default CommentsPanel;
