/* eslint-disable node/no-unpublished-import */
import { watch } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import type { build as Build } from "tsup";
import { loadCommands, loadEvents, printToStderr, printToStdout } from "./util";
import Constants from "./util/Constants";
import CustomClient from "./util/CustomClient";

const commandsFolder = join(cwd(), `src/${Constants.commandsFolderName}`);
const eventsFolder = join(cwd(), `src/${Constants.eventsFolderName}`);
const watchCommands = async (client: CustomClient, build: typeof Build) => {
	for await (const { filename } of watch(commandsFolder)) {
		if (filename == null) continue;
		const now = performance.now();

		printToStdout(`File change detected: ${filename}`);
		if (
			(await build({
				entry: [`src/${Constants.commandsFolderName}/index.ts`],
				outDir: `dist/${Constants.commandsFolderName}`,
				silent: true,
			}).catch((err) => {
				printToStderr("Failed to build new commands:");
				printToStderr(err);
				return true as const;
			})) ||
			(await loadCommands(client).catch((err) => {
				printToStderr("Failed to load new commands:");
				printToStderr(err);
				return true as const;
			}))
		)
			continue;
		printToStdout(
			`Fast reloaded commands in ${(performance.now() - now).toFixed(2)}ms!`,
		);
	}
};
const watchEvents = async (client: CustomClient, build: typeof Build) => {
	for await (const { filename } of watch(eventsFolder)) {
		if (filename == null) continue;
		const now = performance.now();

		printToStdout(`File change detected: ${filename}`);
		if (
			(await build({
				entry: [`src/${Constants.eventsFolderName}/index.ts`],
				outDir: `dist/${Constants.eventsFolderName}`,
				silent: true,
			}).catch((err) => {
				printToStderr("Failed to build new events:");
				printToStderr(err);
				return true as const;
			})) ||
			(await loadEvents(client).catch((err) => {
				printToStderr("Failed to load new events:");
				printToStderr(err);
				return true as const;
			}))
		)
			continue;
		printToStdout(
			`Fast reloaded events in ${(performance.now() - now).toFixed(2)}ms!`,
		);
	}
};

export const configureDev = async (client: CustomClient) => {
	const tsup = await import("tsup").catch(() => {
		printToStderr("Failed to load tsup, not watching for changes...");
	});

	Promise.all([
		tsup ? watchCommands(client, tsup.build) : undefined,
		tsup ? watchEvents(client, tsup.build) : undefined,
	]).catch(printToStderr);
};

export default configureDev;
