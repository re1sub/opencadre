import { Navigate, type RouteDefinition } from "@solidjs/router";
import { RequireAuth } from "#/components/RequireAuth";
import { Home } from "#/pages/Home";
import { Auth } from "#/pages/Auth";
import { Workspace } from "#/pages/Workspace";

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
