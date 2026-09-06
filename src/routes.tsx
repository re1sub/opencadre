import { Navigate, type RouteDefinition } from "@solidjs/router";
import { lazy } from "solid-js";
import RequireAuth from "#/features/auth/RequireAuth";

const Auth = lazy(() => import("#/features/auth/Auth"));
const Home = lazy(() => import("#/features/home/Home"));
const Workspace = lazy(() => import("#/features/workspace/Workspace"));
const AcceptInvite = lazy(() => import("#/features/workspace/AcceptInvite"));

export const routes: RouteDefinition[] = [
	{ path: "/", component: Home },
	{ path: "/auth", component: Auth },
	{ path: "/auth/forgot-password", component: () => <Auth view="forgot" /> },
	{ path: "/auth/reset-password", component: () => <Auth view="reset" /> },
	{
		path: "/accept-invite",
		component: AcceptInvite,
	},
	{
		path: "/workspace/*rest",
		component: () => (
			<RequireAuth>
				<Workspace />
			</RequireAuth>
		),
	},
	{ path: "**", component: () => <Navigate href="/" /> },
];
