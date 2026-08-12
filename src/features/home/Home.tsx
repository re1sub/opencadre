import Features from "#/features/home/components/Features";
import Footer from "#/features/home/components/Footer";
import Hero from "#/features/home/components/Hero";
import MobileApp from "#/features/home/components/MobileApp";
import Navbar from "#/features/home/components/Navbar";

const Home = () => (
	<>
		<Navbar />
		<Hero />
		<Features />
		<MobileApp />
		<Footer />
	</>
);

export default Home;
