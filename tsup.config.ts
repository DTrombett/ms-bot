import { config } from "dotenv";
import { env } from "process";
import { defineConfig, Options } from "tsup";

if (!("NODE_ENV" in env)) config();
const options: Options = {
	clean: true,
	entry: ["src/index.ts", "src/registerCommands.ts", "src/events/**/*.ts"],
	external: ["tsup"],
	format: ["esm"],
	minify: true,
	platform: "node",
	target: "es2022",
	treeshake: "smallest",
};

if (env.NODE_ENV === "development") {
	options.sourcemap = true;
	options.minify = false;
	(options.entry as string[]).push("src/commands/index.ts", "src/dev.ts");
}

export default defineConfig(options);
