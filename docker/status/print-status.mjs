const value = (name, fallback) => {
	const input = process.env[name];
	return input?.trim() ? input.trim() : fallback;
};

const appUrl = value(
	"SITE_URL",
	`http://localhost:${value("APP_PORT", "3000")}`,
);
const gatewayUrl = value(
	"SUPABASE_PUBLIC_URL",
	`http://localhost:${value("API_GW_HTTP_PORT", "8000")}`,
);
const studioUrl = `http://localhost:${value("STUDIO_PORT", "3001")}`;

console.log("");
console.log("OpenCadre stack is ready");
console.log("");
console.log(`App:              ${appUrl}`);
console.log(`Supabase gateway: ${gatewayUrl}`);
console.log(
	`Studio:           optional, enable with --profile studio, ${studioUrl}`,
);
console.log("");
