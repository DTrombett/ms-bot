import { config } from "dotenv";
import { defineConfig } from "tsup";

export default defineConfig(({ watch }) => ({
	clean: !watch,
	entry: ["src/registerCommands.ts"],
	format: "esm",
	platform: "node",
	target: "esnext",
	sourcemap: true,
	env: config({ path: ".dev.vars" }).parsed,
}));
