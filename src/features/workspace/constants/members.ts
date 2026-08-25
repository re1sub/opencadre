import type { WorkspaceMember } from "../types";

export const CURRENT_MEMBER_ID = "member-you";

export const MEMBER_COLOR_POOL = [
	"#6366f1",
	"#ec4899",
	"#14b8a6",
	"#f59e0b",
	"#8b5cf6",
	"#10b981",
] as const;

export const SEED_MEMBERS: WorkspaceMember[] = [
	{
		id: CURRENT_MEMBER_ID,
		name: "You",
		email: "",
		role: "owner",
		color: MEMBER_COLOR_POOL[0],
	},
	{
		id: "member-alice",
		name: "Alice Martin",
		email: "alice@example.com",
		role: "admin",
		color: MEMBER_COLOR_POOL[1],
	},
	{
		id: "member-bob",
		name: "Bob Dupont",
		email: "bob@example.com",
		role: "member",
		color: MEMBER_COLOR_POOL[2],
	},
	{
		id: "member-carol",
		name: "Carol Bernard",
		email: "carol@example.com",
		role: "member",
		color: MEMBER_COLOR_POOL[3],
	},
	{
		id: "member-dave",
		name: "Dave Petit",
		email: "dave@example.com",
		role: "guest",
		color: MEMBER_COLOR_POOL[4],
	},
];
