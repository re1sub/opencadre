import { createSignal, For, Show } from "solid-js";
import ConfirmDialog from "#/features/ui/ConfirmDialog";
import { dropdownItemValue, getErrorMessage } from "#/utils/misc";
import { canDeleteWorkspace, canRenameWorkspace } from "../constants/roles";
import { useWorkspaceMembersAdapter } from "../hooks/useWorkspaceMembersAdapter";
import {
	PAGE_KIND_META,
	type Page,
	type PageKind,
	type Workspace,
} from "../types";
import { exportAllPages, importAllPages } from "../utils/transfer";
import {
	dangerZone,
	dialogBody,
	dialogLabel,
	memberEmail,
	memberMeta,
	memberName,
	settingsSection,
	settingsSectionTitle,
	workspaceDangerRow,
} from "./workspace.css";

interface SettingsWorkspaceSectionProps {
	workspaceId: string;
	workspace: () => Workspace | null;
	pages: () => Page[];
	onUpdateWorkspace: (
		id: string,
		fields: {
			name?: string;
			description?: string | null;
			defaultPageKind?: PageKind;
		},
	) => void;
	onAddPage: (
		kind: PageKind,
		opts?: { title?: string; content?: string },
	) => Promise<Page>;
	onDeleteWorkspace: (id: string) => void;
	onLeaveWorkspace: (id: string) => void;
}

const SettingsWorkspaceSection = (props: SettingsWorkspaceSectionProps) => {
	const { myRole } = useWorkspaceMembersAdapter(() => props.workspaceId);

	const [wsNameDraft, setWsNameDraft] = createSignal<string | null>(null);
	const [wsDescriptionDraft, setWsDescriptionDraft] = createSignal<
		string | null
	>(null);
	const [confirmAction, setConfirmAction] = createSignal<
		"delete" | "leave" | null
	>(null);
	const [importError, setImportError] = createSignal<string | null>(null);
	const [importedCount, setImportedCount] = createSignal<number | null>(null);
	let importInput!: HTMLInputElement;

	const handleExport = async () => {
		const ws = props.workspace();
		if (!ws) return;
		await exportAllPages(ws, props.pages());
	};

	const handleImportFile = async (e: Event) => {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		target.value = "";
		if (!file) return;

		const ws = props.workspace();
		if (!ws) return;
		setImportError(null);
		setImportedCount(null);

		try {
			const count = await importAllPages(file, {
				workspaceId: ws.id,
				addPage: props.onAddPage,
			});
			setImportedCount(count);
		} catch (err) {
			setImportError(getErrorMessage(err, "Import failed unexpectedly."));
		}
	};

	const wsNameValue = () => wsNameDraft() ?? props.workspace()?.name ?? "";

	const wsDescriptionValue = () =>
		wsDescriptionDraft() ?? props.workspace()?.description ?? "";

	const currentDefaultKind = () => {
		const kind = props.workspace()?.defaultPageKind ?? "markdown";
		return PAGE_KIND_META[kind];
	};

	const handleWsNameInput = (e: Event) => {
		setWsNameDraft((e.currentTarget as HTMLInputElement).value);
	};

	const handleWsNameCommit = () => {
		const ws = props.workspace();
		const next = (wsNameDraft() ?? "").trim();
		setWsNameDraft(null);
		if (ws && next && next !== ws.name)
			props.onUpdateWorkspace(ws.id, { name: next });
	};

	const handleWsDescriptionInput = (e: Event) => {
		setWsDescriptionDraft((e.currentTarget as HTMLInputElement).value);
	};

	const handleWsDescriptionCommit = () => {
		const ws = props.workspace();
		const next = (wsDescriptionDraft() ?? "").trim();
		setWsDescriptionDraft(null);
		if (ws && next !== (ws.description ?? "")) {
			props.onUpdateWorkspace(ws.id, { description: next || null });
		}
	};

	const handleDefaultKindSelect = (e: Event) => {
		const ws = props.workspace();
		const value = dropdownItemValue(e) as PageKind | undefined;
		if (ws && value && PAGE_KIND_META[value]) {
			props.onUpdateWorkspace(ws.id, { defaultPageKind: value });
		}
	};

	return (
		<Show
			when={props.workspace()}
			fallback={
				<div class={dialogBody}>
					<p class={dialogLabel}>Open a workspace to manage its settings.</p>
				</div>
			}
		>
			<div class={dialogBody}>
				<h3 class={settingsSectionTitle}>Workspace</h3>
				<wa-divider style={{ "--spacing": "0" }}></wa-divider>
				<div class={settingsSection}>
					<wa-input
						label="Workspace name"
						value={wsNameValue()}
						onInput={handleWsNameInput}
						onChange={handleWsNameCommit}
						disabled={!canRenameWorkspace(myRole())}
					></wa-input>
					<wa-input
						label="Description"
						placeholder="What is this workspace for?"
						value={wsDescriptionValue()}
						onInput={handleWsDescriptionInput}
						onChange={handleWsDescriptionCommit}
						disabled={!canRenameWorkspace(myRole())}
					></wa-input>
					<p class={dialogLabel}>
						Choose the page kind created by the "Add page" button in the
						sidebar.
					</p>
					<wa-dropdown
						placement="bottom-start"
						on:wa-after-hide={(e) => e.stopPropagation()}
						on:wa-select={handleDefaultKindSelect}
					>
						<wa-button
							type="button"
							slot="trigger"
							variant="neutral"
							appearance="outlined"
							with-caret
							style={{ width: "fit-content" }}
							disabled={!canRenameWorkspace(myRole())}
						>
							<wa-icon
								slot="start"
								name={currentDefaultKind().icon}
								label={currentDefaultKind().iconLabel}
							></wa-icon>
							{currentDefaultKind().label}
						</wa-button>
						<For each={Object.entries(PAGE_KIND_META)}>
							{([kind, meta]) => (
								<wa-dropdown-item value={kind}>
									<wa-icon
										slot="icon"
										name={meta.icon}
										label={meta.iconLabel}
									></wa-icon>
									{meta.label}
								</wa-dropdown-item>
							)}
						</For>
					</wa-dropdown>
				</div>

				<h3 class={settingsSectionTitle}>Export / Import</h3>
				<wa-divider style={{ "--spacing": "0" }}></wa-divider>
				<div class={settingsSection}>
					<p class={dialogLabel}>
						Download all pages in this workspace as a .zip file, or restore
						pages from a previously exported archive into this workspace.
					</p>
					<div
						style={{
							display: "flex",
							"flex-wrap": "wrap",
							gap: "var(--wa-space-s)",
							"align-items": "center",
						}}
					>
						<wa-button
							type="button"
							variant="neutral"
							appearance="outlined"
							onClick={handleExport}
						>
							<wa-icon slot="start" name="download" label="Export"></wa-icon>
							Export all pages
						</wa-button>
						<wa-button
							type="button"
							variant="neutral"
							appearance="outlined"
							onClick={() => importInput?.click()}
						>
							<wa-icon slot="start" name="upload" label="Import"></wa-icon>
							Import pages
						</wa-button>
						<input
							ref={importInput}
							type="file"
							accept=".zip,application/zip"
							style={{ display: "none" }}
							onChange={handleImportFile}
						/>
					</div>
					<Show when={importError()}>
						<p style={{ color: "var(--wa-color-danger)" }}>{importError()}</p>
					</Show>
					<Show when={importedCount() !== null}>
						<p
							style={{
								color: "var(--wa-color-success)",
								margin: "var(--wa-space-s) 0 0",
							}}
						>
							Imported {importedCount()} page
							{importedCount() === 1 ? "" : "s"}.
						</p>
					</Show>
				</div>

				<h3 class={settingsSectionTitle}>Danger zone</h3>
				<wa-divider style={{ "--spacing": "0" }}></wa-divider>
				<div class={`${settingsSection} ${dangerZone}`}>
					<div class={workspaceDangerRow}>
						<div class={memberMeta}>
							<span class={memberName}>Delete workspace</span>
							<span class={memberEmail}>
								Permanently delete
								{` ${props.workspace()?.name ?? "this workspace"}`} and all of
								its pages. This cannot be undone.
							</span>
						</div>
						<wa-button
							type="button"
							variant="danger"
							appearance="outlined"
							size="s"
							disabled={!canDeleteWorkspace(myRole())}
							onClick={() => setConfirmAction("delete")}
						>
							Delete
						</wa-button>
					</div>

					<wa-divider style={{ "--spacing": "0" }}></wa-divider>

					<div class={workspaceDangerRow}>
						<div class={memberMeta}>
							<span class={memberName}>Leave workspace</span>
							<span class={memberEmail}>
								{myRole() === "owner"
									? "You own this workspace. Transfer ownership to another member to leave."
									: "Remove yourself from this workspace and lose access to its pages."}
							</span>
						</div>
						<wa-button
							type="button"
							variant="neutral"
							appearance="outlined"
							size="s"
							disabled={myRole() === "owner"}
							onClick={() => setConfirmAction("leave")}
						>
							Leave
						</wa-button>
					</div>
				</div>

				<Show when={confirmAction() === "delete"}>
					<ConfirmDialog
						label="Delete workspace"
						message={`Permanently delete "${props.workspace()?.name ?? "this workspace"}" and all of its pages? This cannot be undone.`}
						confirmText={props.workspace()?.name ?? ""}
						onConfirm={() => {
							const ws = props.workspace();
							if (ws) props.onDeleteWorkspace(ws.id);
						}}
						onClose={() => setConfirmAction(null)}
					/>
				</Show>
				<Show when={confirmAction() === "leave"}>
					<ConfirmDialog
						label="Leave workspace"
						message={`Leave "${props.workspace()?.name ?? "this workspace"}"? You will lose access to its pages.`}
						onConfirm={() => {
							const ws = props.workspace();
							if (ws) props.onLeaveWorkspace(ws.id);
						}}
						onClose={() => setConfirmAction(null)}
					/>
				</Show>
			</div>
		</Show>
	);
};

export default SettingsWorkspaceSection;
