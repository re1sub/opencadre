import { Route, Router } from "@solidjs/router";
import { Home } from "#/pages/Home";
import { Auth } from "#/pages/Auth";
import { Dashboard } from "#/pages/Dashboard";

function App() {
	return (
		<Router>
			<Route path="/" component={Home} />
			<Route path="/auth" component={Auth} />
			<Route path="/dashboard" component={Dashboard} />
		</Router>
	);
}

export default App;
