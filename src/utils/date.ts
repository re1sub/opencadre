export type DueDateStatus = "overdue" | "today" | "soon" | "future";

const startOfDay = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const toIsoDate = (date: Date) => {
	const year = String(date.getFullYear()).padStart(4, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const parseDueDate = (iso: string) => {
	// Accept either YYYY-MM-DD or a full ISO timestamp (e.g. a timestamptz
	// value returned by Postgres). Reject everything else as invalid.
	if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
		const [year, month, day] = iso.split("-").map(Number);
		return new Date(year, (month ?? 1) - 1, day ?? 1);
	}
	const date = new Date(iso);
	return Number.isNaN(date.getTime())
		? new Date(NaN)
		: new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getDueDateStatus = (iso: string): DueDateStatus => {
	const due = startOfDay(parseDueDate(iso)).getTime();
	const today = startOfDay(new Date()).getTime();
	const diffDays = Math.round((due - today) / 86_400_000);
	if (diffDays < 0) return "overdue";
	if (diffDays === 0) return "today";
	if (diffDays <= 2) return "soon";
	return "future";
};

export const formatDueDate = (iso: string): string => {
	const due = parseDueDate(iso);
	const today = new Date();
	const diffDays = Math.round(
		(startOfDay(due).getTime() - startOfDay(today).getTime()) / 86_400_000,
	);
	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Tomorrow";
	if (diffDays === -1) return "Yesterday";
	const sameYear = due.getFullYear() === today.getFullYear();
	const formatter = new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		...(sameYear ? {} : { year: "numeric" }),
	});
	return formatter.format(due);
};

export const formatTimestamp = (iso: string) => {
	const date = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins} min ago`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};
