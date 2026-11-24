import { useLocalStorage } from "#/utils/useLocalStorage";

const [open, setOpen] = useLocalStorage(
	"opencadre:ai-assistant-open",
	false,
	(raw) => raw === "true",
);

export function useAiAssistant() {
	return {
		open,
		setOpen,
		toggle: () => setOpen(!open()),
		close: () => setOpen(false),
	};
}
