import { rm } from "node:fs/promises";
import { env } from "node:process";
import { log, outdir } from "./utils.ts";

export const clean = async () => {
	if (env.WRANGLER_COMMAND && env.WRANGLER_COMMAND !== "deploy") return;
	log("Cleaning output directory");
	await Promise.all([
		rm(outdir, { recursive: true, force: true }),
		rm("dist", { recursive: true, force: true }),
	]);
};
