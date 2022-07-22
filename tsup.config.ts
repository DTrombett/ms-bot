import { config } from "dotenv";
import { env } from "process";
import { defineConfig, Options } from "tsup";

if (!("DISCORD_TOKEN" in env)) config();
const options: Options = {
	clean: true,
	entry: [
		"src/index.ts",
		"src/registerCommands.ts",
		"src/commands/**/*.ts",
		"src/events/**/*.ts",
	],
	format: ["esm"],
	external: ["tsup"],
	platform: "node",
	target: "ESNext",
};

if (env.NODE_ENV === "production") {
	options.minify = true;
} else {
	options.sourcemap = true;
	(options.entry as string[]).push("src/dev.ts");
	options.minify = false;
}

export default defineConfig(options);
