const isEnabled = (value: string | undefined, fallback: boolean): boolean => {
	if (value === undefined || value.trim() === "") return fallback;
	return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

export const featureFlags = {
	googleSignIn: isEnabled(import.meta.env.VITE_ENABLE_GOOGLE_SIGNIN, true),
	ai: isEnabled(import.meta.env.VITE_ENABLE_AI, true),
	memberInvites: isEnabled(import.meta.env.VITE_ENABLE_MEMBER_INVITES, true),
	legalPages: isEnabled(import.meta.env.VITE_ENABLE_LEGAL_PAGES, true),
	githubReleaseCheck: isEnabled(
		import.meta.env.VITE_ENABLE_GITHUB_RELEASE_CHECK,
		true,
	),
	cdnIcons: isEnabled(import.meta.env.VITE_ENABLE_CDN_ICONS, true),
} as const;
