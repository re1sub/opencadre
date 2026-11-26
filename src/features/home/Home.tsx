import { Show } from "solid-js";
import DownloadApp from "#/features/home/components/DownloadApp";
import Features from "#/features/home/components/Features";
import Footer from "#/features/home/components/Footer";
import Hero from "#/features/home/components/Hero";
import Navbar from "#/features/home/components/Navbar";
import { featureFlags } from "#/utils/featureFlags";

const Home = () => (
	<>
		<Navbar />
		<Hero />
		<Features />
		<Show when={featureFlags.githubReleaseCheck}>
			<DownloadApp />
		</Show>
		<Footer />
	</>
);

export default Home;
