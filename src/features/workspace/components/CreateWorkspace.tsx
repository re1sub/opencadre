import { createSignal, Show } from "solid-js";
import { workspaceNameSchema } from "../schemas";
import { linkButton } from "./createWorkspace.css";

interface CreateWorkspaceProps {
	onCreate: (name: string) => Promise<void>;
	onSignOut?: () => void;
	onCancel?: () => void;
	mode?: "first" | "new";
}

const CreateWorkspace = (props: CreateWorkspaceProps) => {
	const [name, setName] = createSignal("");
	const [error, setError] = createSignal<string | null>(null);
	const [pending, setPending] = createSignal(false);

	const mode = () => props.mode ?? "first";

	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		setError(null);

		const result = workspaceNameSchema.safeParse({ name: name() });
		if (!result.success) {
			setError(result.error.issues[0].message);
			return;
		}

		setPending(true);

		try {
			await props.onCreate(result.data.name);
		} catch (createError: unknown) {
			setError(
				createError instanceof Error
					? createError.message
					: "An unexpected error occurred. Please try again.",
			);
		} finally {
			setPending(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			style={{ display: "flex", "flex-direction": "column", gap: "1rem" }}
		>
			<wa-input
				type="text"
				label="Workspace name"
				placeholder="My Workspace"
				autocomplete="off"
				required
				maxlength={50}
				value={name()}
				onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
			></wa-input>
			<Show when={error()}>
				<p style={{ color: "var(--wa-color-danger)", margin: 0 }}>{error()}</p>
			</Show>
			<wa-button type="submit" variant="brand" disabled={pending()}>
				{pending() ? "Creating..." : "Create workspace"}
			</wa-button>
			{mode() === "first" ? (
				<wa-button
					type="button"
					variant="neutral"
					appearance="plain"
					class={linkButton}
					onClick={props.onSignOut}
				>
					Sign out
				</wa-button>
			) : (
				<wa-button
					type="button"
					variant="neutral"
					appearance="plain"
					class={linkButton}
					onClick={props.onCancel}
				>
					Cancel
				</wa-button>
			)}
		</form>
	);
};

export default CreateWorkspace;
