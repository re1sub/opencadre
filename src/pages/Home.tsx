import { Features } from "../components/home/Features";
import { Footer } from "../components/home/Footer";
import { Hero } from "../components/home/Hero";
import { MobileApp } from "../components/home/MobileApp";
import { Navbar } from "../components/home/Navbar";

export function Home() {
	return (
		<>
			<Navbar />
			<Hero />
			<Features />
			<MobileApp />
			<Footer />
		</>
	);
}
