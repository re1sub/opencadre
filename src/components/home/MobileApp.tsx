import {
	comingSoon,
	cta,
	description,
	downloadButton,
	inner,
	mobileApp,
	screenshotWrapper,
	textBlock,
	title,
	titleColumn,
} from "./mobileApp.css";
import { Motion } from "solid-motionone";

export function MobileApp() {
	return (
		<section class={mobileApp}>
			<div class={inner}>
				<Motion.div
					class={titleColumn}
					initial={{ opacity: 0, x: "-100%" }}
					inView={{ opacity: 1, x: 0 }}
					inViewOptions={{ once: true }}
					transition={{ duration: 0.5 }}
				>
					<div class={textBlock}>
						<h2 class={title}>Take your boards with you</h2>
						<p class={description}>
							OpenCadre runs on mobile with the same features you get on
							desktop.
							<br />
							Grab the latest build directly from GitHub.
						</p>
					</div>
					<div class={cta}>
						<wa-button
							href="https://github.com/opencadre"
							variant="neutral"
							class={downloadButton}
						>
							<wa-icon slot="start" name="download"></wa-icon>
							Download
						</wa-button>
						<span class={comingSoon}>* iOS version coming soon.</span>
					</div>
				</Motion.div>
				<Motion.div
					initial={{ opacity: 0, x: "100%" }}
					inView={{ opacity: 1, x: 0 }}
					inViewOptions={{ once: true }}
					transition={{ duration: 0.5 }}
					class={screenshotWrapper}
				>
					<img src="/img/home/mobile.png" alt="OpenCadre mobile app" />
				</Motion.div>
			</div>
		</section>
	);
}
