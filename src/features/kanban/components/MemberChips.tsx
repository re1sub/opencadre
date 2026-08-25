import { Index, Show } from "solid-js";
import type { WorkspaceMember } from "#/features/workspace/types";
import { memberChipsRow } from "./cardDialog.css";

interface MemberChipsProps {
	assigneeIds: string[];
	members: WorkspaceMember[];
	onRemove: (memberId: string) => void;
}

const initialsOf = (name: string) => name.slice(0, 2).toUpperCase();

const MemberChips = (props: MemberChipsProps) => {
	const assignedMembers = () =>
		props.assigneeIds
			.map((id) => props.members.find((member) => member.id === id))
			.filter((member): member is WorkspaceMember => !!member);

	return (
		<Show when={assignedMembers().length}>
			<div class={memberChipsRow}>
				<Index each={assignedMembers()}>
					{(member) => (
						<wa-tag
							with-remove
							aria-label={`Unassign ${member().name}`}
							on:wa-remove={() => props.onRemove(member().id)}
							pill
						>
							<wa-avatar
								initials={initialsOf(member().name)}
								label={`Avatar with initials: ${initialsOf(member().name)}`}
								style={{
									"--size": "20px",
									"background-color":
										member().color ?? "var(--wa-color-neutral-400)",
									color: "var(--wa-color-text-normal)",
								}}
							></wa-avatar>

							{member().name}
						</wa-tag>
					)}
				</Index>
			</div>
		</Show>
	);
};

export default MemberChips;
