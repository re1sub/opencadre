import { For } from "solid-js";
import {
	body,
	columnGroup,
	columnLinks,
	footer,
	link,
	logo,
} from "./footer.css";

const legalLinks = [
	{ label: "Legal Notice", href: "/legal" },
	{ label: "Privacy Policy", href: "/privacy" },
];
const resourceLinks = [
	{ label: "GitHub", href: "https://github.com/opencadre/opencadre" },
	{
		label: "Releases",
		href: "https://github.com/opencadre/opencadre/releases",
	},
	{
		label: "Report an issue",
		href: "https://github.com/opencadre/opencadre/issues",
	},
];

const Footer = () => {
	return (
		<footer class={footer}>
			<div class={body}>
				<a href="/" class={logo}>
					opencadre
				</a>
				<div class={columnGroup}>
					<div>
						<h4>Legal</h4>
						<div class={columnLinks}>
							<For each={legalLinks}>
								{(item) => (
									<a class={link} href={item.href}>
										{item.label}
									</a>
								)}
							</For>
						</div>
					</div>
					<div>
						<h4>Resources</h4>
						<div class={columnLinks}>
							<For each={resourceLinks}>
								{(item) => (
									<a class={link} href={item.href}>
										{item.label}
									</a>
								)}
							</For>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
