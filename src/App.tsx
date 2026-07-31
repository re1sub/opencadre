import { Route, Router } from "@solidjs/router";
import { Home } from "#/pages/Home";

function Auth() {
	return (
		<main style={{ padding: "2rem", "font-family": "sans-serif" }}>
			<h1>Auth</h1>
			<p>Sign in / sign up coming soon.</p>
			<br />
			<wa-button href="/" variant="brand">
				{" < "} Back
			</wa-button>
		</main>
	);
}

function Dashboard() {
	return (
		<main style={{ padding: "2rem", "font-family": "sans-serif" }}>
			<h1>Dashboard</h1>
			<p>Boards coming soon.</p>
		</main>
	);
}

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
