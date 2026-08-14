export const colorMix = (color: string, opacity: number = 30) =>
	`color-mix(in srgb, ${color} ${opacity}%, transparent)`;
