import { cp } from "node:fs/promises";
import { log, outdir } from "./utils.ts";

export const copyPublic = async () => {
	log("Copying public assets");
	await cp("public", outdir, { recursive: true, force: true });
};
