import { Motion } from "solid-motionone";
import heroDark from "#assets/img/home/hero-dark.png";
import heroLight from "#assets/img/home/hero-light.png";
import { useTheme } from "#theme/ThemeProvider";
import { hero, screenshot, screenshotImage, title } from "./hero.css";

export function Hero() {
	const { theme } = useTheme();

	return (
		<section class={hero}>
			<Motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7 }}
			>
				<h1 class={title}>
					Boards, notes, and tasks. Organized.
					<br />
					Real-time, collaborative, and{" "}
					<wa-icon
						name="sparkles"
						style={{ color: "var(--wa-color-brand)" }}
					></wa-icon>
					AI-powered. Free.
				</h1>
				<div class={screenshot}>
					<img
						src={theme() === "light" ? heroLight : heroDark}
						alt="OpenCadre board editor"
						class={screenshotImage}
					/>
				</div>
			</Motion.div>
		</section>
	);
}
