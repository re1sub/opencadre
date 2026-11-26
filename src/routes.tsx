import { Navigate, type RouteDefinition } from "@solidjs/router";
import { lazy } from "solid-js";
import RequireAuth from "#/features/auth/RequireAuth";
import VaultProvider from "#/features/crypto/VaultProvider";
import { featureFlags } from "#/utils/featureFlags";

const Auth = lazy(() => import("#/features/auth/Auth"));
const Home = lazy(() => import("#/features/home/Home"));
const Workspace = lazy(() => import("#/features/workspace/Workspace"));
const AcceptInvite = lazy(() => import("#/features/workspace/AcceptInvite"));
const PrivacyPage = lazy(() => import("#/features/legal/PrivacyPage"));
const TermsPage = lazy(() => import("#/features/legal/TermsPage"));

export const routes: RouteDefinition[] = [
	{
		path: "/",
		component: () => {
			// @ts-expect-error: window.__TAURI__ is only available in Tauri context
			if (typeof window !== "undefined" && window.__TAURI__) {
				return <Navigate href="/workspace" />;
			}
			return <Home />;
		},
	},
	{ path: "/auth", component: () => <Navigate href="/auth/signin" /> },
	{ path: "/auth/signin", component: () => <Auth view="signin" /> },
	{ path: "/auth/signup", component: () => <Auth view="signup" /> },
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
				<VaultProvider>
					<Workspace />
				</VaultProvider>
			</RequireAuth>
		),
	},
	{
		path: "/privacy",
		component: () =>
			featureFlags.legalPages ? <PrivacyPage /> : <Navigate href="/" />,
	},
	{
		path: "/terms",
		component: () =>
			featureFlags.legalPages ? <TermsPage /> : <Navigate href="/" />,
	},
	{ path: "**", component: () => <Navigate href="/" /> },
];
