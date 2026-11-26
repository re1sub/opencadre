import type { AuthError, User } from "@supabase/supabase-js";
import {
	createContext,
	createSignal,
	type JSXElement,
	onCleanup,
	useContext,
} from "solid-js";
import { featureFlags } from "#/utils/featureFlags";
import { supabase } from "#/utils/supabase";

type AuthContextType = {
	user: () => User | null;
	loading: () => boolean;
	error: () => AuthError | null;
	login: (email: string, password: string) => Promise<User>;
	signInWithGoogle: (redirectTo?: string) => Promise<void>;
	signUp: (email: string, password: string) => Promise<User | null>;
	sendPasswordReset: (email: string) => Promise<void>;
	updatePassword: (password: string) => Promise<void>;
	deleteAccount: () => Promise<void>;
	logout: () => Promise<void>;
	signOutOthers: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>();

const isRetryableAuthError = (error: AuthError | null): boolean =>
	Boolean(
		error &&
			(error.name === "AuthRetryableFetchError" ||
				/fetch|network|timeout/i.test(error.message)),
	);

export function AuthProvider(props: { children: JSXElement }) {
	const [user, setUser] = createSignal<User | null>(null);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<AuthError | null>(null);

	let validation: Promise<void> | null = null;
	let revalidateTimer: ReturnType<typeof setTimeout> | undefined;

	const validateSession = (): Promise<void> => {
		if (validation) return validation;
		validation = (async () => {
			const { data, error: authError } = await supabase.auth.getUser();
			if (!authError && data.user) {
				setUser(data.user);
				setLoading(false);
				return;
			}
			if (authError && isRetryableAuthError(authError)) {
				const { data: cached } = await supabase.auth.getSession();
				setUser(cached.session?.user ?? null);
				setLoading(false);
				return;
			}
			await supabase.auth.signOut({ scope: "local" }).catch(() => {});
			setUser(null);
			setLoading(false);
		})().finally(() => {
			validation = null;
		});
		return validation;
	};

	void validateSession();

	const handleVisibility = () => {
		if (document.visibilityState !== "visible") return;
		if (revalidateTimer) clearTimeout(revalidateTimer);
		revalidateTimer = setTimeout(() => {
			revalidateTimer = undefined;
			void validateSession();
		}, 400);
	};

	document.addEventListener("visibilitychange", handleVisibility);
	window.addEventListener("focus", handleVisibility);

	const {
		data: { subscription },
	} = supabase.auth.onAuthStateChange((_event, session) => {
		setUser(session?.user ?? null);
		setLoading(false);
	});

	onCleanup(() => {
		subscription.unsubscribe();
		document.removeEventListener("visibilitychange", handleVisibility);
		window.removeEventListener("focus", handleVisibility);
		if (revalidateTimer) clearTimeout(revalidateTimer);
	});

	const login = async (email: string, password: string): Promise<User> => {
		setError(null);

		const { data, error: authError } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (authError) {
			setError(authError);
			setUser(null);
			throw authError;
		}

		setUser(data.user);

		return data.user;
	};

	const signInWithGoogle = async (redirectTo?: string): Promise<void> => {
		if (!featureFlags.googleSignIn) {
			throw new Error("Google sign-in is disabled.");
		}
		setError(null);

		const { error: authError } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: redirectTo ? { redirectTo } : undefined,
		});

		if (authError) {
			setError(authError);
			throw authError;
		}
	};

	const signUp = async (
		email: string,
		password: string,
	): Promise<User | null> => {
		setError(null);

		const { data, error: authError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${window.location.origin}/workspace`,
			},
		});

		if (authError) {
			setError(authError);
			throw authError;
		}

		if (!data.session) {
			return null;
		}

		setUser(data.user);

		return data.user;
	};

	const sendPasswordReset = async (email: string): Promise<void> => {
		setError(null);

		const { error: authError } = await supabase.auth.resetPasswordForEmail(
			email,
			{
				redirectTo: `${window.location.origin}/auth/reset-password`,
			},
		);

		if (authError) {
			setError(authError);
			throw authError;
		}
	};

	const updatePassword = async (password: string): Promise<void> => {
		setError(null);

		const { error: authError } = await supabase.auth.updateUser({ password });

		if (authError) {
			setError(authError);
			throw authError;
		}
	};

	const deleteAccount = async (): Promise<void> => {
		setError(null);

		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session?.access_token) {
			throw new Error("Not authenticated");
		}

		const { data, error: functionError } = await supabase.functions.invoke(
			"delete-account",
			{
				body: {},
			},
		);

		if (functionError) {
			setError(functionError);
			throw functionError;
		}

		if (data?.error) {
			const err = new Error(data.error);
			setError(err as AuthError);
			throw err;
		}

		try {
			await supabase.auth.signOut();
		} catch {
			// ignore: tokens may already be invalid after the server-side delete
		}

		setUser(null);
	};

	const logout = async (): Promise<void> => {
		setError(null);

		const { error: authError } = await supabase.auth.signOut();

		if (authError) {
			setError(authError);
			throw authError;
		}

		setUser(null);
	};

	const signOutOthers = async (): Promise<void> => {
		setError(null);

		const { error: authError } = await supabase.auth.signOut({
			scope: "others",
		});

		if (authError) {
			setError(authError);
			throw authError;
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				error,
				login,
				signInWithGoogle,
				signUp,
				sendPasswordReset,
				updatePassword,
				deleteAccount,
				logout,
				signOutOthers,
			}}
		>
			{props.children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within an AuthProvider");
	return context;
}
