import { useNavigate, useParams } from "@solidjs/router";
import { createEffect, createSignal, Show } from "solid-js";
import { useAuth } from "#/features/auth/AuthContext";
import ConfirmDialog from "#/features/ui/ConfirmDialog";
import EditableText from "#/features/ui/EditableText";
import PageView from "./components/PageView";
import WorkspaceFooter from "./components/WorkspaceFooter";
import WorkspaceHeader from "./components/WorkspaceHeader";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import {
	mainContent,
	page,
	pageTitleStyle,
	sidebarResizer,
} from "./components/workspace.css";
import { GETTING_STARTED_MARKDOWN } from "./constants/gettingStarted";
import { useSidebarResize } from "./hooks/useSidebarResize";
import type { Page, PageKind, Workspace as WorkspaceType } from "./types";

const createPage = (
	workspaceId: string,
	title: string,
	kind: PageKind,
): Page => ({
	id: crypto.randomUUID(),
	workspaceId,
	title,
	kind,
	content: kind === "markdown" ? GETTING_STARTED_MARKDOWN : "",
});

const createWorkspace = (name: string): WorkspaceType => ({
	id: crypto.randomUUID(),
	name,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
});

const createDefaultWorkspaces = (): {
	workspace: WorkspaceType;
	pages: Page[];
}[] => {
	const ws1 = createWorkspace("Personal");
	const ws2 = createWorkspace("Work");

	return [
		{
			workspace: ws1,
			pages: [
				createPage(ws1.id, "Getting Started", "markdown"),
				createPage(ws1.id, "Kanban Board", "kanban"),
				createPage(ws1.id, "Sample Table", "table"),
			],
		},
		{
			workspace: ws2,
			pages: [
				createPage(ws2.id, "Sprint Tasks", "kanban"),
				createPage(ws2.id, "Meeting Notes", "markdown"),
			],
		},
	];
};

const Workspace = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	const [error, setError] = createSignal<string | null>(null);
	const seed = createDefaultWorkspaces();
	const [workspaces, setWorkspaces] = createSignal<WorkspaceType[]>(
		seed.map((s) => s.workspace),
	);
	const [allPages, setAllPages] = createSignal<Page[]>(
		seed.flatMap((s) => s.pages),
	);
	const [activeWorkspaceId, setActiveWorkspaceId] = createSignal<string>(
		workspaces()[0]?.id ?? "",
	);
	const firstWorkspacePages = seed[0]?.pages ?? [];
	const [activePageId, setActivePageId] = createSignal<string | null>(
		firstWorkspacePages[0]?.id ?? null,
	);
	const [deleteTarget, setDeleteTarget] = createSignal<
		| { kind: "page"; id: string; title: string }
		| { kind: "workspace"; id: string; title: string }
		| null
	>(null);

	const activeWorkspace = () =>
		workspaces().find((w) => w.id === activeWorkspaceId()) ?? null;

	const activePages = () =>
		allPages().filter((p) => p.workspaceId === activeWorkspaceId());

	const activePage = () =>
		activePages().find((entry) => entry.id === activePageId()) ?? null;

	const params = useParams<{ pageId?: string }>();

	createEffect(() => {
		const pageId = params.pageId;

		// Redirect to first page when visiting base /workspace route
		if (!pageId) {
			const firstPage = activePages()[0];
			if (firstPage) {
				navigate(`/workspace/p/${firstPage.id}`, { replace: true });
			}
			return;
		}

		const page = allPages().find((p) => p.id === pageId);

		if (page) {
			// If the page exists, switch to its workspace and page
			if (page.workspaceId !== activeWorkspaceId()) {
				setActiveWorkspaceId(page.workspaceId);
			}
			if (activePageId() !== page.id) {
				setActivePageId(page.id);
			}
		} else {
			// Fallback to first page of active workspace when page is not found
			const fallbackPage = activePages()[0];
			if (fallbackPage) {
				navigate(`/workspace/p/${fallbackPage.id}`, { replace: true });
			} else {
				setActivePageId(null);
				navigate("/workspace", { replace: true });
			}
		}
	});

	const selectWorkspace = (id: string) => {
		setActiveWorkspaceId(id);
		const firstPage = allPages().find((p) => p.workspaceId === id);
		if (firstPage) {
			navigate(`/workspace/p/${firstPage.id}`);
		} else {
			navigate("/workspace");
		}
	};

	const addWorkspace = () => {
		const workspace = createWorkspace("Untitled workspace");
		const page = createPage(workspace.id, "Getting Started", "markdown");
		setWorkspaces((current) => [...current, workspace]);
		setAllPages((current) => [...current, page]);
		setActiveWorkspaceId(workspace.id);
		navigate(`/workspace/p/${page.id}`);
	};

	const deleteWorkspace = (id: string) => {
		if (workspaces().length <= 1) return;

		const remaining = workspaces().filter((w) => w.id !== id);
		setWorkspaces(remaining);
		setAllPages((current) => current.filter((p) => p.workspaceId !== id));

		if (activeWorkspaceId() === id) {
			setActiveWorkspaceId(remaining[0]?.id ?? "");
			const firstPage = allPages().find(
				(p) => p.workspaceId === remaining[0]?.id,
			);
			if (firstPage) {
				navigate(`/workspace/p/${firstPage.id}`);
			} else {
				navigate("/workspace");
			}
		}
	};

	const renameWorkspace = (id: string, name: string) => {
		setWorkspaces((current) =>
			current.map((w) =>
				w.id === id ? { ...w, name, updatedAt: new Date().toISOString() } : w,
			),
		);
	};

	const addPage = (kind: PageKind) => {
		const newPage: Page = {
			id: crypto.randomUUID(),
			workspaceId: activeWorkspaceId(),
			title: kind === "kanban" ? "Kanban Board" : "Untitled",
			kind,
			content: "",
		};

		setAllPages((current) => [...current, newPage]);
		navigate(`/workspace/p/${newPage.id}`);
	};

	const deletePage = (id: string) => {
		setAllPages((current) => current.filter((entry) => entry.id !== id));
		if (activePageId() === id) {
			const remaining = activePages().filter((entry) => entry.id !== id);
			if (remaining[0]) {
				navigate(`/workspace/p/${remaining[0].id}`);
			} else {
				navigate("/workspace");
			}
		}
	};

	const renamePage = (id: string, title: string) => {
		setAllPages((current) =>
			current.map((entry) => (entry.id === id ? { ...entry, title } : entry)),
		);
	};

	const updatePageContent = (id: string, content: string) => {
		setAllPages((current) =>
			current.map((entry) => (entry.id === id ? { ...entry, content } : entry)),
		);
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
				activeWorkspace={activeWorkspace}
				onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
				onRename={(name) => {
					const active = activeWorkspace();
					if (active) renameWorkspace(active.id, name);
				}}
				onSelectWorkspace={selectWorkspace}
				workspaces={workspaces()}
				onAddWorkspace={addWorkspace}
			/>

			<WorkspaceSidebar
				pages={activePages()}
				activePageId={activePageId}
				onAddPage={addPage}
				onRequestDeletePage={(id) => {
					const page = activePages().find((entry) => entry.id === id);
					if (!page) return;
					setDeleteTarget({ kind: "page", id: page.id, title: page.title });
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
				<Show when={activePageId()} keyed>
					{(id) => {
						const active = activePages().find((entry) => entry.id === id);
						if (!active) return null;

						return (
							<div
								style={{
									"padding-bottom": "var(--wa-space-s)",
									"border-bottom":
										"var(--wa-border-width-s) var(--wa-border-style) var(--wa-color-surface-border)",
								}}
							>
								<EditableText
									value={active.title}
									onChange={(title) => renamePage(active.id, title)}
									class={pageTitleStyle}
									ariaLabel="Page title"
								/>
							</div>
						);
					}}
				</Show>
				<PageView page={activePage()} onChangeContent={updatePageContent} />
			</main>

			<Show when={deleteTarget()} keyed>
				{(target) => {
					if (target.kind === "workspace") {
						return (
							<ConfirmDialog
								label="Delete workspace"
								message={`Are you sure you want to delete "${target.title}" and all its pages? This action cannot be undone.`}
								onConfirm={() => deleteWorkspace(target.id)}
								onClose={() => setDeleteTarget(null)}
							/>
						);
					}

					return (
						<ConfirmDialog
							label="Delete page"
							message={`Are you sure you want to delete "${target.title}"? This action cannot be undone.`}
							onConfirm={() => deletePage(target.id)}
							onClose={() => setDeleteTarget(null)}
						/>
					);
				}}
			</Show>
		</wa-page>
	);
};

export default Workspace;
