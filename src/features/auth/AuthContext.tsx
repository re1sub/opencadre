import type { AuthError, User } from "@supabase/supabase-js";
import {
	createContext,
	createSignal,
	type JSXElement,
	onCleanup,
	useContext,
} from "solid-js";
import { supabase } from "#/utils/supabase";

type AuthContextType = {
	user: () => User | null;
	loading: () => boolean;
	error: () => AuthError | null;
	login: (email: string, password: string) => Promise<User>;
	signUp: (
		email: string,
		password: string,
		displayName?: string,
	) => Promise<User | null>;
	sendPasswordReset: (email: string) => Promise<void>;
	updatePassword: (password: string) => Promise<void>;
	deleteAccount: () => Promise<void>;
	logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>();

export function AuthProvider(props: { children: JSXElement }) {
	const [user, setUser] = createSignal<User | null>(null);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<AuthError | null>(null);

	void supabase.auth.getSession().then(({ data }) => {
		setUser(data.session?.user ?? null);
		setLoading(false);
	});

	const {
		data: { subscription },
	} = supabase.auth.onAuthStateChange((_event, session) => {
		setUser(session?.user ?? null);
		setLoading(false);
	});

	onCleanup(() => subscription.unsubscribe());

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

	const signUp = async (
		email: string,
		password: string,
		displayName?: string,
	): Promise<User | null> => {
		setError(null);

		const { data, error: authError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${window.location.origin}/workspace`,
				...(displayName ? { data: { display_name: displayName } } : {}),
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

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				error,
				login,
				signUp,
				sendPasswordReset,
				updatePassword,
				deleteAccount,
				logout,
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
