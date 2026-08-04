import { createSignal, For, Show } from "solid-js";
import { MarkdownEditor } from "#/components/MarkdownEditor";
import { useAuth } from "#/contexts/AuthContext";
import {
	addPage,
	mainContent,
	navFooter,
	page,
	pageButton,
	pageList,
	sidebar,
	sidebarResizer,
	workspaceName,
	workspaceTrigger,
} from "./workspace.css";

interface Page {
	id: string;
	title: string;
}

const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_DEFAULT_WIDTH = 260;
const SIDEBAR_STORAGE_KEY = "workspace.sidebarWidth";

function getInitialSidebarWidth(): number {
	const saved = Number(localStorage.getItem(SIDEBAR_STORAGE_KEY));
	return saved >= SIDEBAR_MIN_WIDTH && saved <= SIDEBAR_MAX_WIDTH
		? saved
		: SIDEBAR_DEFAULT_WIDTH;
}

export function Workspace() {
	const { user, logout } = useAuth();
	const [error, setError] = createSignal<string | null>(null);
	const [pages] = createSignal<Page[]>([]);
	const [sidebarWidth, setSidebarWidth] = createSignal(
		getInitialSidebarWidth(),
	);

	let dragState: { startX: number; startWidth: number } | undefined;

	const onResizePointerDown = (event: PointerEvent) => {
		const target = event.currentTarget as HTMLElement;
		if (!target) return;

		target.setPointerCapture(event.pointerId);
		dragState = { startX: event.clientX, startWidth: sidebarWidth() };
		document.body.style.userSelect = "none";
		document.body.style.cursor = "col-resize";

		const onMove = (moveEvent: PointerEvent) => {
			if (!dragState) return;
			const next =
				dragState.startWidth + (moveEvent.clientX - dragState.startX);
			setSidebarWidth(
				Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, next)),
			);
		};

		const onEnd = () => {
			target.removeEventListener("pointermove", onMove);
			target.removeEventListener("pointerup", onEnd);
			target.removeEventListener("pointercancel", onEnd);
			document.body.style.userSelect = "";
			document.body.style.cursor = "";
			localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth()));
			dragState = undefined;
		};

		target.addEventListener("pointermove", onMove);
		target.addEventListener("pointerup", onEnd);
		target.addEventListener("pointercancel", onEnd);
	};

	const handleSignOut = async () => {
		setError(null);

		try {
			await logout();
		} catch (authError: unknown) {
			setError(
				authError instanceof Error
					? authError.message
					: "An unexpected error occurred. Please try again.",
			);
		}
	};

	const gettingStartedMarkdown = `
# # Welcome to the Demo Page!

This page serves as a demo of the markdown editor. You can use it to test out markdown formatting and see how it renders.

Your changes will not be saved, this is just a placeholder, for now.

### Text Formatting
* **Bold:** Select text and press \`Cmd/Ctrl + B\` or wrap with \`**bold**\`
* *Italic:* Select text and press \`Cmd/Ctrl + I\` or wrap with \`*italic*\`
* ~~Strikethrough:~~ Wrap text with \`~~strikethrough~~\`
* Inline Code: Wrap text with single backticks \`code\`

### Structure & Lists
To create headings, start a line with \`#\`, \`##\`, or \`###\`.

* **Bullet list:** Start a line with \`-\` or \`*\`
1. **Numbered list:** Start a line with \`1.\`

> **Pro Tip:** Highlight any text to bring up the floating formatting toolbar!
`;

	return (
		<wa-page
			navigation-placement="start"
			class={page}
			style={{ "--menu-width": `${sidebarWidth()}px` }}
		>
			<wa-button
				slot="navigation-toggle"
				size="s"
				appearance="plain"
				variant="neutral"
			>
				<wa-icon name="menu" label="Toggle navigation"></wa-icon>
			</wa-button>
			<nav slot="navigation" class={sidebar}>
				<wa-dropdown>
					<button type="button" slot="trigger" class={workspaceTrigger}>
						<wa-avatar initials="OC" label="Workspace"></wa-avatar>
						<span class={workspaceName}>My Workspace</span>
						<wa-icon name="chevron-down"></wa-icon>
					</button>
					<wa-dropdown-item value="my-workspace">My Workspace</wa-dropdown-item>
					<wa-dropdown-item value="second-workspace">
						Second Workspace
					</wa-dropdown-item>
				</wa-dropdown>
				<wa-divider></wa-divider>
				<Show
					when={pages().length > 0}
					fallback={
						<wa-button variant="neutral" class={addPage}>
							<wa-icon slot="start" name="plus"></wa-icon>
							Add Page
						</wa-button>
					}
				>
					<ul class={pageList}>
						<For each={pages()}>
							{(page) => (
								<li>
									<wa-button variant="neutral" class={pageButton}>
										{page.title}
									</wa-button>
								</li>
							)}
						</For>
					</ul>
				</Show>
			</nav>
			<nav slot="navigation-footer" class={navFooter}>
				<Show when={user()} fallback={null}>
					{(email) => (
						<>
							<p>Signed in as {email().email}</p>
							<Show when={error()}>
								<p style={{ color: "var(--wa-color-danger)" }}>{error()}</p>
							</Show>
							<wa-button variant="neutral" onClick={handleSignOut}>
								Sign out
							</wa-button>
						</>
					)}
				</Show>
			</nav>
			<main class={mainContent}>
				<div class={sidebarResizer} onPointerDown={onResizePointerDown}></div>
				<MarkdownEditor content={gettingStartedMarkdown} />
			</main>
		</wa-page>
	);
}
