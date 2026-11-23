import { render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

const h = vi.hoisted(() => ({
	getUser: vi.fn(),
	getSession: vi.fn(),
	signOut: vi.fn(),
	onAuthStateChange: vi.fn(),
	unsubscribe: vi.fn(),
}));

vi.mock("#/utils/supabase", () => ({
	supabase: {
		auth: {
			getUser: h.getUser,
			getSession: h.getSession,
			signOut: h.signOut,
			onAuthStateChange: h.onAuthStateChange,
		},
	},
}));

const user = (id: string) => ({ id, email: `${id}@example.com` });

const renderAuth = () => {
	let api: ReturnType<typeof useAuth> | undefined;
	const Probe = () => {
		api = useAuth();
		return null;
	};
	const view = render(() => (
		<AuthProvider>
			<Probe />
		</AuthProvider>
	));
	return { api: () => api!, view };
};

beforeEach(() => {
	vi.clearAllMocks();
	h.getUser.mockResolvedValue({ data: { user: user("remote") }, error: null });
	h.getSession.mockResolvedValue({ data: { session: null } });
	h.signOut.mockResolvedValue({ error: null });
	h.onAuthStateChange.mockReturnValue({
		data: { subscription: { unsubscribe: h.unsubscribe } },
	});
});

afterEach(() => vi.clearAllMocks());

describe("AuthProvider session validation", () => {
	it("uses the server-confirmed user on startup", async () => {
		const { api } = renderAuth();

		await waitFor(() => expect(api().user()?.id).toBe("remote"));
		expect(h.getUser).toHaveBeenCalled();
	});

	it("clears the local session when the account no longer exists", async () => {
		h.getUser.mockResolvedValue({
			data: { user: null },
			error: { name: "AuthApiError", message: "User not found" },
		});

		const { api } = renderAuth();

		await waitFor(() => expect(api().user()).toBeNull());
		expect(h.signOut).toHaveBeenCalledWith({ scope: "local" });
	});

	it("keeps the cached session on a retryable network error", async () => {
		h.getUser.mockResolvedValue({
			data: { user: null },
			error: { name: "AuthRetryableFetchError", message: "Failed to fetch" },
		});
		h.getSession.mockResolvedValue({
			data: { session: { user: user("cached") } },
		});

		const { api } = renderAuth();

		await waitFor(() => expect(api().user()?.id).toBe("cached"));
		expect(h.signOut).not.toHaveBeenCalled();
	});

	it("signs out other devices without ending the current session", async () => {
		const { api } = renderAuth();
		await waitFor(() => expect(api().user()?.id).toBe("remote"));

		await api().signOutOthers();

		expect(h.signOut).toHaveBeenCalledWith({ scope: "others" });
		expect(api().user()?.id).toBe("remote");
	});
});
