import { Editor, posToDOMRect } from "@tiptap/core";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { createSignal, For, onCleanup, onMount, splitProps } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import { usePageComments } from "#/features/comments/hooks/usePageComments";
import {
  COMMENT_MARK_NAME,
  CommentMark,
} from "#/features/comments/mark/CommentMark";
import CommentPopup from "./components/CommentPopup";
import ToolbarButton from "./components/ToolbarButton";
import { bubbleMenu } from "./editorBubbleMenu.css";
import { editor } from "./markdownEditor.css";
import {
  blockButtons,
  createMarkdownActions,
  headingItems,
  inlineButtons,
  type MarkdownAction,
  type ToolbarButton as ToolbarButtonDef,
} from "./toolbar";
import "#assets/css/github-markdown.css";
import type WaAnimation from "@awesome.me/webawesome/dist/components/animation/animation.js";
import Document from "@tiptap/extension-document";
import { Placeholder } from "@tiptap/extension-placeholder";

interface MarkdownEditorProps {
  content: string;
  class?: string;
  editable?: boolean;
  pageId?: string;
  onUpdate?: (markdown: string) => void;
}

const bubbleBlockButtons: ToolbarButtonDef[] = [
  ...headingItems.slice(1),
  headingItems[0],
  ...blockButtons,
];

const commentButtons: ToolbarButtonDef[] = [
  { id: "comment", icon: "message-square-text", label: "Comment" },
];

const MarkdownEditor = (props: MarkdownEditorProps) => {
  const [local, rest] = splitProps(props, [
    "class",
    "content",
    "editable",
    "pageId",
    "onUpdate",
  ]);
  const { user } = useAuth();

  const [activeThreadId, setActiveThreadId] = createSignal<string | null>(null);
  const [popupRect, setPopupRect] = createSignal<DOMRect | null>(null);
  const [pendingComment, setPendingComment] = createSignal<{
    threadId: string;
    from: number;
    to: number;
  } | null>(null);
  const [toolbarVersion, setToolbarVersion] = createSignal(0);
  const bumpToolbar = () => setToolbarVersion((v) => v + 1);

  const pageComments = usePageComments(props.pageId ?? "");

  const author = () => user()?.email?.split("@")[0] ?? "You";

  const activeThread = () =>
    pageComments.threads().find((t) => t.id === activeThreadId()) ?? undefined;

  const openThreadPopup = (threadId: string, rect: DOMRect) => {
    setActiveThreadId(threadId);
    setPopupRect(rect);
  };

  const discardPending = () => {
    const pending = pendingComment();
    if (!pending) return;
    const thread = pageComments
      .threads()
      .find((t) => t.id === pending.threadId);
    if (thread && thread.comments.length === 0) {
      pageComments.deleteThread(pending.threadId);
    }
    setPendingComment(null);
  };

  const closeThreadPopup = () => {
    discardPending();
    setActiveThreadId(null);
    setPopupRect(null);
  };

  let editorRef!: HTMLDivElement;
  let menuRef!: HTMLDivElement;
  let instance!: Editor;
  let animRef!: WaAnimation;
  let actions: Record<string, MarkdownAction> = {};

  const isActive = (id: string) => {
    toolbarVersion();
    return actions[id]?.active() ?? false;
  };

  const CustomDocument = Document.extend({
    content: "heading block*",
  });

  onMount(() => {
    if (!editorRef || !menuRef) return;

    instance = new Editor({
      element: editorRef,
      extensions: [
        CustomDocument,
        StarterKit.configure({
          document: false,
          trailingNode: false,
        }),
        Placeholder.configure({
          placeholder: ({ node, pos }) => {
            if (node.type.name === "heading" && pos === 0) {
              return "Type a title...";
            }
            return "";
          },
          showOnlyCurrent: false,
        }),
        Markdown,
        CommentMark,
        BubbleMenu.configure({
          element: menuRef,
          pluginKey: "editorBubbleMenu",
          appendTo: () => document.body,

          options: {
            strategy: "fixed",
            placement: "top",
            offset: 8,
            flip: {
              boundary: editorRef,
              padding: -50,
            },
            shift: {
              boundary: editorRef,
            },
            onShow: () => {
              animRef.name = "zoomIn";
              animRef.play = true;
            },
            onHide: () => {
              animRef.play = false;
            },
          },
        }),
      ],
      content: props.content.trim() ? props.content : "#",
      contentType: "markdown",
      editable: props.editable ?? true,
      onUpdate: ({ editor: editorInstance }) => {
        props.onUpdate?.(editorInstance.getMarkdown());
        pruneOrphanThreads(editorInstance);
      },
    });

    const editorInstance = instance;

    const collectCommentIds = (from: number, to: number) => {
      const ids = new Set<string>();
      editorInstance.state.doc.nodesBetween(from, to, (node) => {
        node.marks.forEach((mark) => {
          if (mark.type.name === COMMENT_MARK_NAME && mark.attrs.commentId) {
            ids.add(mark.attrs.commentId as string);
          }
        });
      });
      return [...ids];
    };

    const hideBubbleMenu = () => {
      editorInstance.view.dispatch(
        editorInstance.state.tr.setMeta("editorBubbleMenu", "hide"),
      );
    };

    actions = {
      ...createMarkdownActions(editorInstance),
      comment: {
        active: () => editorInstance.isActive(COMMENT_MARK_NAME),
        run: () => {
          const { from, to, empty } = editorInstance.state.selection;
          if (empty) return;
          const rect = posToDOMRect(editorInstance.view, from, to);
          const existingIds = collectCommentIds(from, to);
          if (existingIds.length > 0) {
            discardPending();
            if (activeThreadId() === existingIds[0]) {
              closeThreadPopup();
            } else {
              openThreadPopup(existingIds[0], rect);
            }
            hideBubbleMenu();
            return;
          }
          const text = editorInstance.state.doc.textBetween(from, to, " ");
          const thread = pageComments.createThread(text.trim() || "…");
          setPendingComment({ threadId: thread.id, from, to });
          openThreadPopup(thread.id, rect);
          hideBubbleMenu();
        },
      },
    };

    editorRef.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const mark = target.closest?.("mark[data-comment-id]");
      if (!mark) return;
      const commentId = mark.getAttribute("data-comment-id");
      if (!commentId) return;
      const thread = pageComments.threads().find((t) => t.id === commentId);
      if (!thread) return;
      e.preventDefault();
      openThreadPopup(commentId, mark.getBoundingClientRect());
      hideBubbleMenu();
    });

    editorInstance.on("transaction", bumpToolbar);
    editorInstance.on("selectionUpdate", bumpToolbar);
    bumpToolbar();
  });

  const pruneOrphanThreads = (editorInstance: Editor) => {
    const ids = new Set<string>();
    editorInstance.state.doc.descendants((node) => {
      node.marks.forEach((mark) => {
        if (mark.type.name === COMMENT_MARK_NAME && mark.attrs.commentId) {
          ids.add(mark.attrs.commentId as string);
        }
      });
    });
    const valid = [...ids];
    const threads = pageComments.threads();
    const pending = pendingComment();
    const orphans = threads.filter(
      (t) =>
        !valid.includes(t.id) &&
        t.comments.length === 0 &&
        t.id !== pending?.threadId,
    );
    if (orphans.length > 0) {
      orphans.forEach((t) => {
        pageComments.deleteThread(t.id);
      });
    }
  };

  onCleanup(() => {
    instance?.destroy();
  });

  return (
    <>
      <div
        {...rest}
        ref={editorRef}
        class={editor}
        classList={{
          "markdown-body": true,
          [local.class ?? ""]: Boolean(local.class),
        }}
      />
      <wa-animation
        name="zoomIn"
        easing="ease-in-out"
        duration={20}
        iterations={1}
        ref={(el) => {
          animRef = el;
        }}
      >
        <div
          ref={menuRef}
          class={bubbleMenu}
          role="toolbar"
          aria-label="Text formatting"
        >
          <For each={inlineButtons}>
            {(button) => (
              <ToolbarButton
                button={button}
                id={button.id}
                onClick={() => actions[button.id]?.run()}
                activeClass="bubble-menu-is-active"
                active={() => isActive(button.id)}
              />
            )}
          </For>

          <wa-divider orientation="horizontal"></wa-divider>

          <For each={bubbleBlockButtons}>
            {(button) => (
              <ToolbarButton
                button={button}
                id={button.id}
                onClick={() => actions[button.id]?.run()}
                activeClass="bubble-menu-is-active"
                active={() => isActive(button.id)}
              />
            )}
          </For>

          <wa-divider orientation="horizontal"></wa-divider>

          <For each={commentButtons}>
            {(button) => (
              <ToolbarButton
                button={button}
                id={button.id}
                onClick={() => actions[button.id]?.run()}
                activeClass="bubble-menu-is-active"
                active={() => isActive(button.id)}
              />
            )}
          </For>
        </div>

      </wa-animation>
      <CommentPopup
        open={() => Boolean(activeThreadId())}
        anchorRect={popupRect}
        thread={activeThread}
        author={author()}
        isPopup={true}
        onReplaceComments={(comments) => {
          const id = activeThreadId();
          if (!id) return;
          const pending = pendingComment();
          if (pending && pending.threadId === id) {
            const wasEmpty =
              pageComments.threads().find((t) => t.id === id)?.comments
                .length === 0;
            if (wasEmpty && comments.length > 0) {
              instance
                ?.chain()
                .setTextSelection({ from: pending.from, to: pending.to })
                .setComment(id)
                .run();
              setPendingComment(null);
            }
          }
          pageComments.replaceThreadComments(id, comments);
        }}
        onDeleteComment={(commentId) => {
          const id = activeThreadId();
          if (id) pageComments.deleteComment(id, commentId);
        }}
        onClose={closeThreadPopup}
      />
    </>
  );
};

export default MarkdownEditor;
