import { Navigate, type RouteDefinition } from "@solidjs/router";
import { Auth } from "#/features/auth/Auth";
import { RequireAuth } from "#/features/auth/RequireAuth";
import { Home } from "#/features/home/Home";
import { Workspace } from "#/features/workspace/Workspace";

export const routes: RouteDefinition[] = [
	{ path: "/", component: Home },
	{ path: "/auth", component: Auth },
	{ path: "/auth/forgot-password", component: () => <Auth view="forgot" /> },
	{ path: "/auth/reset-password", component: () => <Auth view="reset" /> },
	{
		path: "/workspace",
		component: () => (
			<RequireAuth>
				<Workspace />
			</RequireAuth>
		),
	},
	{ path: "**", component: () => <Navigate href="/" /> },
];
