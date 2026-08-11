import { createSignal, Show } from "solid-js";
import { ConfirmDialog } from "#/components/ui/ConfirmDialog";
import { GETTING_STARTED_MARKDOWN } from "#/components/workspace/gettingStarted";
import { PageView } from "#/components/workspace/PageView";
import type { Page, PageKind } from "#/components/workspace/types";
import { useSidebarResize } from "#/components/workspace/useSidebarResize";
import { WorkspaceFooter } from "#/components/workspace/WorkspaceFooter";
import { WorkspaceHeader } from "#/components/workspace/WorkspaceHeader";
import { WorkspaceSidebar } from "#/components/workspace/WorkspaceSidebar";
import {
	mainContent,
	page,
	sidebarResizer,
} from "#/components/workspace/workspace.css";
import { useAuth } from "#/contexts/AuthContext";

interface DeletePageTarget {
	id: string;
	title: string;
}

const createDefaultPages = (): Page[] => [
	{
		id: crypto.randomUUID(),
		title: "Getting Started",
		kind: "markdown",
		content: GETTING_STARTED_MARKDOWN,
	},
	{
		id: crypto.randomUUID(),
		title: "Kanban Board",
		kind: "kanban",
		content: "",
	},
];

export function Workspace() {
	const { user, logout } = useAuth();

	const [error, setError] = createSignal<string | null>(null);
	const defaults = createDefaultPages();
	const [pages, setPages] = createSignal<Page[]>(defaults);
	const [activePageId, setActivePageId] = createSignal<string | null>(
		defaults[0]?.id ?? null,
	);
	const [deleteTarget, setDeleteTarget] = createSignal<DeletePageTarget | null>(
		null,
	);

	const activePage = () =>
		pages().find((entry) => entry.id === activePageId()) ?? null;

	const addPage = (kind: PageKind) => {
		const newPage: Page = {
			id: crypto.randomUUID(),
			title: kind === "kanban" ? "Kanban Board" : "Untitled",
			kind,
			content: "",
		};

		setPages((current) => [...current, newPage]);
		setActivePageId(newPage.id);
	};

	const deletePage = (id: string) => {
		setPages((current) => current.filter((entry) => entry.id !== id));
		if (activePageId() === id) {
			const remaining = pages().filter((entry) => entry.id !== id);
			setActivePageId(remaining[0]?.id ?? null);
		}
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

	const {
		sidebarWidth,
		sidebarCollapsed,
		setSidebarCollapsed,
		sidebarHovered,
		setSidebarHovered,
		onResizePointerDown,
		inNav,
	} = useSidebarResize();

	return (
		<wa-page
			navigation-placement="start"
			class={`${page} ${sidebarCollapsed() ? "sidebar-collapsed" : ""}`}
			style={{
				"--menu-width":
					sidebarCollapsed() && !sidebarHovered()
						? "0px"
						: `${sidebarWidth()}px`,
			}}
			// @ts-expect-error: WA doesn't include onPointerOver/Out types
			onPointerOver={(e: PointerEvent) => {
				if (sidebarCollapsed() && inNav(e.target)) setSidebarHovered(true);
			}}
			onPointerOut={(e: PointerEvent) => {
				if (inNav(e.target) && !inNav(e.relatedTarget))
					setSidebarHovered(false);
			}}
		>
			<wa-button
				slot="navigation-toggle"
				onClick={() => {
					setSidebarHovered(false);
					setSidebarCollapsed(false);
				}}
				size="l"
				appearance="plain"
				variant="neutral"
			>
				<wa-icon name="menu" label="Toggle navigation"></wa-icon>
			</wa-button>

			<WorkspaceHeader
				collapsed={sidebarCollapsed}
				onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
			/>

			<WorkspaceSidebar
				pages={pages()}
				activePageId={activePageId}
				onAddPage={addPage}
				onSelectPage={(id) => setActivePageId(id)}
				onRequestDelete={(id) => {
					const page = pages().find((entry) => entry.id === id);
					if (!page) return;
					setDeleteTarget({ id: page.id, title: page.title });
				}}
			/>

			<WorkspaceFooter user={user} error={error} onSignOut={handleSignOut} />

			<main class={mainContent}>
				<div
					class={sidebarResizer}
					style={{
						"background-color":
							sidebarCollapsed() && !sidebarHovered()
								? "var(--wa-color-surface-border)"
								: "",
						height: sidebarCollapsed() ? "50vh" : "auto",
						top: sidebarCollapsed() ? "50%" : 0,
						width: sidebarCollapsed() ? "6px" : "3px",
						"border-radius": sidebarCollapsed() ? "0 5px 5px 0" : "",
						transform: sidebarCollapsed() ? "translateY(-50%)" : "",
						position: sidebarCollapsed() ? "fixed" : "absolute",
						cursor: sidebarCollapsed() ? "auto" : "col-resize",
					}}
					onPointerEnter={() => {
						if (sidebarCollapsed()) setSidebarHovered(true);
					}}
					onPointerDown={onResizePointerDown}
				/>

				<PageView page={activePage()} />
			</main>

			<Show when={deleteTarget()} keyed>
				{(target) => (
					<ConfirmDialog
						label="Delete page"
						message={`Are you sure you want to delete "${target.title}"? This action cannot be undone.`}
						onConfirm={() => deletePage(target.id)}
						onClose={() => setDeleteTarget(null)}
					/>
				)}
			</Show>
		</wa-page>
	);
}
