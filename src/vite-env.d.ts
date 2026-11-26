/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly SUPABASE_PUBLIC_URL: string;
	readonly SUPABASE_PUBLISHABLE_KEY: string;
	readonly VITE_ENABLE_GOOGLE_SIGNIN?: string;
	readonly VITE_ENABLE_AI?: string;
	readonly VITE_ENABLE_MEMBER_INVITES?: string;
	readonly VITE_ENABLE_LEGAL_PAGES?: string;
	readonly VITE_ENABLE_GITHUB_RELEASE_CHECK?: string;
	readonly VITE_ENABLE_CDN_ICONS?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
