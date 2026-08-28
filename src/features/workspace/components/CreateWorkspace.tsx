import { createSignal, Show } from "solid-js";
import { workspaceNameSchema } from "../schemas";
import { card, linkButton, page } from "./createWorkspace.css";

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

	const form = () => (
		<form onSubmit={handleSubmit} class={card}>
			<h2 style={{ "font-size": "1.5rem" }}>
				{mode() === "first"
					? "Create your first workspace"
					: "Create a new workspace"}
			</h2>
			<p
				style={{
					"font-size": "0.875rem",
					color: "var(--wa-color-text-quiet)",
					margin: 0,
				}}
			>
				{mode() === "first"
					? "Get started by creating a workspace for your team or project."
					: "Workspaces group your pages, boards, and tables together."}
			</p>
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
				<p style={{ color: "var(--wa-color-danger)" }}>{error()}</p>
			</Show>
			<wa-button type="submit" variant="brand" disabled={pending()}>
				{pending() ? "Creating..." : "Create workspace"}
			</wa-button>
			{mode() === "first" ? (
				<span>
					<wa-button
						type="button"
						variant="neutral"
						appearance="plain"
						class={linkButton}
						onClick={props.onSignOut}
					>
						Sign out
					</wa-button>
				</span>
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

	return (
		<Show when={mode() === "first"} fallback={form()}>
			<main class={page}>{form()}</main>
		</Show>
	);
};

export default CreateWorkspace;
