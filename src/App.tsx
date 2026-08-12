import { Router } from "@solidjs/router";
import { Suspense } from "solid-js";
import { routes } from "#/routes";

function App() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Router>{routes}</Router>
		</Suspense>
	);
}

export default App;
