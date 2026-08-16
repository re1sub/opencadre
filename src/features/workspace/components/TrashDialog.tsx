import { For, Show } from "solid-js";
import DeleteButton from "#/features/ui/DeleteButton";
import { formatTimestamp } from "#/utils/date";
import { useDialog } from "#/utils/useDialog";
import type { TrashEntry } from "../types";
import {
	dialogBody,
	trashEmpty,
	trashRow,
	trashRowMeta,
	trashRowSub,
	trashRowTitle,
} from "./workspace.css";

interface TrashDialogProps {
	entries: TrashEntry[];
	onRestore: (entry: TrashEntry) => void;
	onPurge: (entry: TrashEntry) => void;
	onEmptyTrash: () => void;
	onClose: () => void;
}

const TrashDialog = (props: TrashDialogProps) => {
	const dialog = useDialog(props.onClose);

	return (
		<wa-dialog
			ref={dialog.ref}
			light-dismiss
			label="Trash"
			on:wa-after-hide={dialog.handleHide}
		>
			<div class={dialogBody}>
				<Show
					when={props.entries.length > 0}
					fallback={
						<div class={trashEmpty}>
							<wa-icon
								name="inbox"
								label="Trash is empty"
								style={{ "font-size": "2rem" }}
							></wa-icon>
							<p style={{ margin: 0 }}>Trash is empty</p>
						</div>
					}
				>
					<For each={props.entries}>
						{(entry) => {
							const name =
								entry.kind === "workspace"
									? entry.workspace.name
									: entry.page.title;
							const label = entry.kind === "workspace" ? "Workspace" : "Page";

							return (
								<div class={trashRow}>
									<wa-icon
										name={entry.kind === "workspace" ? "folder" : "file-text"}
										label={label}
										style={{ color: "var(--wa-color-text-quiet)" }}
									></wa-icon>

									<div class={trashRowMeta}>
										<p class={trashRowTitle}>{name}</p>
										<p class={trashRowSub}>
											{label} · {formatTimestamp(entry.deletedAt)}
										</p>
									</div>

									<wa-button
										type="button"
										variant="neutral"
										appearance="plain"
										aria-label={`Restore ${name}`}
										onClick={() => props.onRestore(entry)}
									>
										<wa-icon name="rotate-ccw" label="Restore"></wa-icon>
									</wa-button>

									<DeleteButton
										onDelete={() => props.onPurge(entry)}
										label={`Delete ${name} permanently`}
										iconOnly
									/>
								</div>
							);
						}}
					</For>
				</Show>
			</div>

			<Show when={props.entries.length > 0}>
				<div slot="footer">
					<DeleteButton onDelete={props.onEmptyTrash} label="Empty trash" />

					<wa-button variant="brand" onClick={dialog.close}>
						Close
					</wa-button>
				</div>
			</Show>
		</wa-dialog>
	);
};

export default TrashDialog;
