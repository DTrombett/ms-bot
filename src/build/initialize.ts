import { readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";

export const initialize = async () => {
	const [tsconfigRaw] = await Promise.all([
		readFile("tsconfig.json", "utf8"),
		Promise.try(loadEnvFile, ".dev.vars").catch(console.error),
	]);

	return { tsconfigRaw };
};
