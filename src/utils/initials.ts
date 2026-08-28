export function getInitials(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return "";

	const parts = trimmed.split(/\s+/);
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}

	const firstInitial = parts[0].charAt(0);
	const lastInitial = parts[parts.length - 1].charAt(0);
	return `${firstInitial}${lastInitial}`.toUpperCase();
}
