import { Router } from "@solidjs/router";
import ErrorBoundary from "#/features/ui/ErrorBoundary";
import { routes } from "#/routes";

function App() {
	return (
		<ErrorBoundary>
			<Router>{routes}</Router>
		</ErrorBoundary>
	);
}

export default App;
