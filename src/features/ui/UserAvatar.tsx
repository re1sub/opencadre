import { getInitials } from "#/utils/misc";

interface UserAvatarProps {
	name: string;
	avatarUrl?: string | null;
	color?: string;
	size?: string;
	class?: string;
	slot?: string;
	label?: string;
}

const UserAvatar = (props: UserAvatarProps) => {
	const initials = () => getInitials(props.name) || "?";

	return (
		<wa-avatar
			image={props.avatarUrl ?? ""}
			initials={initials()}
			label={props.label ?? `Avatar of ${props.name}`}
			class={props.class}
			slot={props.slot}
			style={{
				"--size": props.size ?? "2rem",
				...(props.color
					? {
							"background-color": props.color,
							color: "#fff",
						}
					: {}),
			}}
		></wa-avatar>
	);
};

export default UserAvatar;
