import { For, Show } from "solid-js";
import TagPopup from "#/features/tags/components/TagPopup";
import type { WorkspaceMember } from "#/features/workspace/types";
import { getInitials } from "#/utils/initials";

interface AssigneePickerProps {
	members: WorkspaceMember[];
	assigneeIds: string[];
	onToggle: (memberId: string) => void;
}

const AssigneePicker = (props: AssigneePickerProps) => {
	const assignable = () =>
		props.members.filter((member) => member.role !== "guest");

	return (
		<TagPopup
			minWidth="240px"
			trigger={({ toggle, triggerRef }) => (
				<wa-button
					ref={triggerRef}
					type="button"
					variant="neutral"
					appearance="plain"
					slot="anchor"
					onClick={toggle}
				>
					<wa-icon name="plus" label="Add assignees"></wa-icon>
				</wa-button>
			)}
			content={() => (
				<Show
					when={assignable().length}
					fallback={
						<div
							style={{
								padding: "var(--wa-space-xs)",
								color: "var(--wa-color-text-quiet)",
							}}
						>
							No members to assign
						</div>
					}
				>
					<For each={assignable()}>
						{(member) => {
							const assigned = () => props.assigneeIds.includes(member.id);
							return (
								<button
									type="button"
									onClick={() => props.onToggle(member.id)}
									style={{
										display: "flex",
										"align-items": "center",
										gap: "var(--wa-space-xs)",
										width: "100%",
										background: "transparent",
										border: "none",
										padding: "var(--wa-space-3xs) var(--wa-space-xs)",
										"border-radius": "var(--wa-border-radius-s)",
										cursor: "pointer",
										color: "inherit",
										font: "inherit",
										"text-align": "left",
									}}
								>
									<wa-avatar
										initials={getInitials(member.name)}
										label={member.name}
										style={{
											"--size": "24px",
											"background-color":
												member.color ?? "var(--wa-color-neutral-400)",
											color: "var(--wa-color-text-normal)",
										}}
									></wa-avatar>
									<span
										style={{
											"flex-grow": "1",
											"min-width": "0",
											"white-space": "nowrap",
											overflow: "hidden",
											"text-overflow": "ellipsis",
										}}
									>
										{member.name}
									</span>
									<Show when={assigned()}>
										<wa-icon
											name="check"
											label={`${member.name} assigned`}
										></wa-icon>
									</Show>
								</button>
							);
						}}
					</For>
				</Show>
			)}
		/>
	);
};

export default AssigneePicker;
