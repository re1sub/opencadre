import { createResource, For, Show } from "solid-js";
import { Motion } from "solid-motionone";
import { dropdownItemValue } from "#/utils/misc";
import mobileAppImg from "#assets/img/home/mobile.png";
import {
	cta,
	description,
	inner,
	mobileApp,
	screenshotWrapper,
	textBlock,
	title,
	titleColumn,
} from "./downloadApp.css";

function detectPlatform(): "android" | "windows" | "linux" {
	const ua = navigator.userAgent;
	if (ua.includes("Android")) return "android";
	if (ua.includes("Win")) return "windows";
	if (ua.includes("Linux")) return "linux";
	return "windows";
}

async function fetchReleaseData() {
	const response = await fetch(
		"https://api.github.com/repos/re1sub/opencadre/releases",
	);

	if (!response.ok) {
		throw new Error("Failed to fetch releases");
	}

	const releases = await response.json();
	// Find the latest release that contains an APK, or fallback to the absolute latest
	const release =
		releases.find((r: { assets: { name: string }[] }) =>
			r.assets.some((a) => a.name.endsWith(".apk")),
		) || releases[0];

	if (!release) {
		throw new Error("No releases found");
	}

	const assets = release.assets;

	const downloads = [
		{
			id: "android",
			icon: (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 640 512"
					style="width: 1rem; height: 1rem;"
				>
					<title>Android</title>
					<path
						fill="currentColor"
						d="M131.2 61.9c5.3-.5 10.6.6 15.3 3s8.6 6.2 11.3 10.8c17 29.5 34.2 58.9 51.2 88.4q5.25-2.1 10.5-3.9c31.3-10.9 64.2-16.6 97.4-16.9h3.2c38.1 0 76.2 7 111.6 21.1L483 75.7c1.8-3.2 4.3-6 7.2-8.2s6.2-3.9 9.8-4.8c3.1-.8 6.4-1.1 9.6-.8 4.2.4 8.3 1.7 11.9 3.8 4 2.4 7.3 5.7 9.7 9.7 2 3.4 3.3 7.2 3.8 11.2s.1 8-1.2 11.7c-.6 1.9-1.4 3.7-2.4 5.5l-49.7 85.8c19.5 12.2 37.6 26.5 53.9 42.8 12.3 12.2 23.5 25.4 33.5 39.5 8.2 11.5 15.6 23.6 22.2 36.2 17.5 33.6 28.6 70.5 32.7 108.1H16c4.1-37.7 15.2-74.5 32.7-108.1 14.5-27.9 33.4-53.5 55.7-75.7 16.5-16.4 34.7-30.9 54.5-43.1l-49.5-85.4c-3.7-6.4-4.7-14.1-2.8-21.2s6.4-13.1 12.7-16.8c3.6-2.2 7.7-3.5 11.9-3.8zm67.3 215.8c-12.2-8.1-30.1-2.5-40.1 12.5s-8.2 33.8 3.9 41.9 30.1 2.5 40.1-12.5 8.2-33.8-3.9-41.9m283.6 12.5c-10-15-27.9-20.6-40.1-12.5s-13.9 26.9-3.9 41.9 27.9 20.6 40.1 12.5 13.9-26.9 3.9-41.9"
					/>
				</svg>
			),
			label: "Android",
			url: assets.find((a: { name: string }) => a.name.endsWith(".apk"))
				?.browser_download_url,
		},
		{
			id: "windows",
			icon: (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 448 512"
					style="width: 1rem; height: 1rem;"
				>
					<title>Windows</title>
					<path
						fill="currentColor"
						d="m0 93.7 183.6-25.3v177.4H0zm0 324.6 183.6 25.3V268.4H0zm203.8 28L448 480V268.4H203.8zm0-380.6v180.1H448V32z"
					/>
				</svg>
			),
			label: "Windows",
			url: assets.find((a: { name: string }) => a.name.endsWith(".exe"))
				?.browser_download_url,
		},
		{
			id: "linux",
			icon: (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 448 512"
					style="width: 1rem; height: 1rem;"
				>
					<title>Linux</title>
					<path
						fill="currentColor"
						d="M220.9 123.3c1 .5 1.8 1.7 3 1.7 1.1 0 2.8-.4 2.9-1.5.2-1.4-1.9-2.3-3.2-2.9-1.7-.7-3.9-1-5.5-.1-.4.2-.8.7-.6 1.1.3 1.3 2.3 1.1 3.4 1.7M199 125c1.2 0 2-1.2 3-1.7 1.1-.6 3.1-.4 3.5-1.6.2-.4-.2-.9-.6-1.1-1.6-.9-3.8-.6-5.5.1-1.3.6-3.4 1.5-3.2 2.9.1 1 1.8 1.5 2.8 1.4m221 278.8c-3.6-4-5.3-11.6-7.2-19.7-1.8-8.1-3.9-16.8-10.5-22.4-1.3-1.1-2.6-2.1-4-2.9-1.3-.8-2.7-1.5-4.1-2 9.2-27.3 5.6-54.5-3.7-79.1-11.4-30.1-31.3-56.4-46.5-74.4-17.1-21.5-33.7-41.9-33.4-72C311.1 85.4 315.7.1 234.8 0 132.4-.2 158 103.4 156.9 135.2c-1.7 23.4-6.4 41.8-22.5 64.7-18.9 22.5-45.5 58.8-58.1 96.7-6 17.9-8.8 36.1-6.2 53.3-6.5 5.8-11.4 14.7-16.6 20.2-4.2 4.3-10.3 5.9-17 8.3s-14 6-18.5 14.5c-2.1 3.9-2.8 8.1-2.8 12.4 0 3.9.6 7.9 1.2 11.8 1.2 8.1 2.5 15.7.8 20.8-5.2 14.4-5.9 24.4-2.2 31.7 3.8 7.3 11.4 10.5 20.1 12.3 17.3 3.6 40.8 2.7 59.3 12.5 19.8 10.4 39.9 14.1 55.9 10.4 11.6-2.6 21.1-9.6 25.9-20.2 12.5-.1 26.3-5.4 48.3-6.6 14.9-1.2 33.6 5.3 55.1 4.1.6 2.3 1.4 4.6 2.5 6.7v.1c8.3 16.7 23.8 24.3 40.3 23 16.6-1.3 34.1-11 48.3-27.9 13.6-16.4 36-23.2 50.9-32.2 7.4-4.5 13.4-10.1 13.9-18.3.4-8.2-4.4-17.3-15.5-29.7M223.8 87.3c9.8-22.2 34.2-21.8 44-.4 6.5 14.2 3.6 30.9-4.3 40.4-1.6-.8-5.9-2.6-12.6-4.9 1.1-1.2 3.1-2.7 3.9-4.6 4.8-11.8-.2-27-9.1-27.3-7.3-.5-13.9 10.8-11.8 23-4.1-2-9.4-3.5-13-4.4-1-6.9-.3-14.6 2.9-21.8m-40.7-11.5c10.1 0 20.8 14.2 19.1 33.5-3.5 1-7.1 2.5-10.2 4.6 1.2-8.9-3.3-20.1-9.6-19.6-8.4.7-9.8 21.2-1.8 28.1 1 .8 1.9-.2-5.9 5.5-15.6-14.6-10.5-52.1 8.4-52.1m-13.6 60.7c6.2-4.6 13.6-10 14.1-10.5 4.7-4.4 13.5-14.2 27.9-14.2 7.1 0 15.6 2.3 25.9 8.9 6.3 4.1 11.3 4.4 22.6 9.3 8.4 3.5 13.7 9.7 10.5 18.2-2.6 7.1-11 14.4-22.7 18.1-11.1 3.6-19.8 16-38.2 14.9-3.9-.2-7-1-9.6-2.1-8-3.5-12.2-10.4-20-15-8.6-4.8-13.2-10.4-14.7-15.3q-2.1-7.35 4.2-12.3m3.3 334c-2.7 35.1-43.9 34.4-75.3 18-29.9-15.8-68.6-6.5-76.5-21.9-2.4-4.7-2.4-12.7 2.6-26.4v-.2c2.4-7.6.6-16-.6-23.9-1.2-7.8-1.8-15 .9-20 3.5-6.7 8.5-9.1 14.8-11.3 10.3-3.7 11.8-3.4 19.6-9.9 5.5-5.7 9.5-12.9 14.3-18 5.1-5.5 10-8.1 17.7-6.9 8.1 1.2 15.1 6.8 21.9 16l19.6 35.6c9.5 19.9 43.1 48.4 41 68.9m-1.4-25.9c-4.1-6.6-9.6-13.6-14.4-19.6 7.1 0 14.2-2.2 16.7-8.9 2.3-6.2 0-14.9-7.4-24.9-13.5-18.2-38.3-32.5-38.3-32.5-13.5-8.4-21.1-18.7-24.6-29.9s-3-23.3-.3-35.2c5.2-22.9 18.6-45.2 27.2-59.2 2.3-1.7.8 3.2-8.7 20.8-8.5 16.1-24.4 53.3-2.6 82.4.6-20.7 5.5-41.8 13.8-61.5 12-27.4 37.3-74.9 39.3-112.7 1.1.8 4.6 3.2 6.2 4.1 4.6 2.7 8.1 6.7 12.6 10.3 12.4 10 28.5 9.2 42.4 1.2 6.2-3.5 11.2-7.5 15.9-9 9.9-3.1 17.8-8.6 22.3-15 7.7 30.4 25.7 74.3 37.2 95.7 6.1 11.4 18.3 35.5 23.6 64.6 3.3-.1 7 .4 10.9 1.4 13.8-35.7-11.7-74.2-23.3-84.9-4.7-4.6-4.9-6.6-2.6-6.5 12.6 11.2 29.2 33.7 35.2 59 2.8 11.6 3.3 23.7.4 35.7 16.4 6.8 35.9 17.9 30.7 34.8-2.2-.1-3.2 0-4.2 0 3.2-10.1-3.9-17.6-22.8-26.1-19.6-8.6-36-8.6-38.3 12.5-12.1 4.2-18.3 14.7-21.4 27.3-2.8 11.2-3.6 24.7-4.4 39.9-.5 7.7-3.6 18-6.8 29-32.1 22.9-76.7 32.9-114.3 7.2m257.4-11.5c-.9 16.8-41.2 19.9-63.2 46.5-13.2 15.7-29.4 24.4-43.6 25.5s-26.5-4.8-33.7-19.3c-4.7-11.1-2.4-23.1 1.1-36.3 3.7-14.2 9.2-28.8 9.9-40.6.8-15.2 1.7-28.5 4.2-38.7 2.6-10.3 6.6-17.2 13.7-21.1.3-.2.7-.3 1-.5.8 13.2 7.3 26.6 18.8 29.5 12.6 3.3 30.7-7.5 38.4-16.3 9-.3 15.7-.9 22.6 5.1 9.9 8.5 7.1 30.3 17.1 41.6 10.6 11.6 14 19.5 13.7 24.6M173.4 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5"
					/>
				</svg>
			),
			label: "Linux",
			url: assets.find((a: { name: string }) => a.name.endsWith(".AppImage"))
				?.browser_download_url,
		},
	].filter((d) => d.url);

	return {
		downloads,
		version: release.tag_name,
	};
}

const DownloadApp = () => {
	const [release] = createResource(fetchReleaseData);

	const platform = detectPlatform();

	const primaryDownload = () => {
		const downloads = release()?.downloads;
		if (!downloads) return null;
		return downloads.find((d) => d.id === platform) || downloads[0];
	};

	const secondaryDownloads = () => {
		const downloads = release()?.downloads;
		const primary = primaryDownload();
		if (!downloads || !primary) return [];
		return downloads.filter((d) => d.id !== primary.id);
	};

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
							OpenCadre runs on desktop and mobile with the same features.
							<br />
							Grab the latest build directly from GitHub.
						</p>
					</div>
					<div class={cta}>
						<Show when={!release.loading} fallback={<div>Loading...</div>}>
							<Show when={primaryDownload()}>
								{(primary) => (
									<div style={{ display: "flex" }}>
										<wa-button
											href={primary().url}
											style={{
												"--_button-start-end-radius": "0",
												"--_button-end-end-radius": "0",
											}}
										>
											<span
												slot="start"
												style={{
													color: "inherit",
													"line-height": "0",
												}}
											>
												{primary().icon}
											</span>
											{primary().label} {release()?.version ?? ""}
										</wa-button>

										<wa-dropdown
											on:wa-select={(e: Event) => {
												const value = dropdownItemValue(e) ?? "";
												window.location.href = value;
											}}
										>
											<wa-button
												slot="trigger"
												aria-label="More download options"
												style={{
													"border-left":
														"var(--wa-border-width-s) solid var(--wa-color-surface-border)",
													"--_button-start-start-radius": "0",
													"--_button-end-start-radius": "0",
												}}
											>
												<wa-icon name="chevron-down"></wa-icon>
											</wa-button>

											<For each={secondaryDownloads()}>
												{(d) => (
													<wa-dropdown-item value={d.url}>
														<span
															slot="icon"
															style={{
																color: "inherit",
																"line-height": "0",
															}}
														>
															{d.icon}
														</span>
														{d.label} {release()?.version ?? ""}
													</wa-dropdown-item>
												)}
											</For>
										</wa-dropdown>
									</div>
								)}
							</Show>
						</Show>
						<small style={{ "text-transform": "capitalize" }}>
							<b>Detected OS:</b> {platform}
						</small>
					</div>
				</Motion.div>
				<Motion.div
					initial={{ opacity: 0, x: "100%" }}
					inView={{ opacity: 1, x: 0 }}
					inViewOptions={{ once: true }}
					transition={{ duration: 0.5 }}
					class={screenshotWrapper}
				>
					<img src={mobileAppImg} alt="OpenCadre app" />
				</Motion.div>
			</div>
		</section>
	);
};

export default DownloadApp;
