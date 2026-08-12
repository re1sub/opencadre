import { Router } from "@solidjs/router";
import { Suspense } from "solid-js";
import { routes } from "#/routes";
import LoadingSpinner from "./features/ui/LoadingSpinner";

function App() {
	return (
		<Suspense fallback={<LoadingSpinner fullscreen size="5rem" />}>
			<Router>{routes}</Router>
		</Suspense>
	);
}

export default App;
