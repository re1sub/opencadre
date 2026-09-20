import { createResource, Show } from "solid-js";
import { Motion } from "solid-motionone";
import mobileAppImg from "#assets/img/home/mobile.png";
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

async function fetchLatestRelease() {
	const response = await fetch(
		"https://api.github.com/repos/re1sub/opencadre/releases/latest",
	);

	if (!response.ok) {
		throw new Error("Failed to fetch latest release");
	}

	const data = await response.json();
	const apkAsset = data.assets.find((asset: { name: string }) =>
		asset.name.endsWith(".apk"),
	);

	return {
		url: apkAsset ? apkAsset.browser_download_url : null,
		version: data.tag_name,
	};
}

const MobileApp = () => {
	const [release] = createResource(fetchLatestRelease);

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
							href={
								release()?.url ||
								"https://github.com/re1sub/opencadre/releases/latest"
							}
							disabled={release.loading}
							variant="neutral"
							class={downloadButton}
						>
							<wa-icon slot="start" name="download"></wa-icon>
							{release.loading
								? "Loading..."
								: `Download APK (${release()?.version ?? ""})`}
						</wa-button>
						<span class={comingSoon}>Android version only*</span>
					</div>
				</Motion.div>
				<Motion.div
					initial={{ opacity: 0, x: "100%" }}
					inView={{ opacity: 1, x: 0 }}
					inViewOptions={{ once: true }}
					transition={{ duration: 0.5 }}
					class={screenshotWrapper}
				>
					<img src={mobileAppImg} alt="OpenCadre mobile app" />
				</Motion.div>
			</div>
		</section>
	);
};

export default MobileApp;
