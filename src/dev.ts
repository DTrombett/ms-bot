/* eslint-disable node/no-unpublished-import */
import { watch } from "node:fs/promises";
import { join } from "node:path";
import { cwd, memoryUsage } from "node:process";
import { setInterval } from "node:timers/promises";
import type { build as Build } from "tsup";
import { loadCommands, loadEvents } from "./util";
import Constants from "./util/Constants";
import CustomClient from "./util/CustomClient";

const commandsFolder = join(cwd(), `src/${Constants.commandsFolderName}`);
const eventsFolder = join(cwd(), `src/${Constants.eventsFolderName}`);
const watchCommands = async (client: CustomClient, build: typeof Build) => {
	for await (const { filename } of watch(commandsFolder)) {
		if (filename == null) continue;
		const now = performance.now();

		CustomClient.printToStdout(`File change detected: ${filename}`);
		if (
			await build({
				entry: [`src/${Constants.commandsFolderName}/index.ts`],
				outDir: `dist/${Constants.commandsFolderName}`,
				silent: true,
			}).catch((err) => {
				CustomClient.printToStderr("Failed to build new commands:");
				CustomClient.printToStderr(err);
				return true as const;
			})
		)
			continue;
		await loadCommands(client);
		CustomClient.printToStdout(
			`Fast reloaded commands in ${(performance.now() - now).toFixed(2)}ms!`,
		);
	}
};
const watchEvents = async (client: CustomClient, build: typeof Build) => {
	for await (const { filename } of watch(eventsFolder)) {
		if (filename == null) continue;
		const now = performance.now();

		CustomClient.printToStdout(`File change detected: ${filename}`);
		if (
			await build({
				entry: [`src/${Constants.eventsFolderName}/index.ts`],
				outDir: `dist/${Constants.eventsFolderName}`,
				silent: true,
			}).catch((err) => {
				CustomClient.printToStderr("Failed to build new events:");
				CustomClient.printToStderr(err);
				return true as const;
			})
		)
			continue;
		await loadEvents(client);
		CustomClient.printToStdout(
			`Fast reloaded events in ${(performance.now() - now).toFixed(2)}ms!`,
		);
	}
};
const logMemoryUsage = async () => {
	for await (const _ of setInterval(60_000)) {
		const memory = memoryUsage();

		CustomClient.printToStdout(
			`RSS: ${(memory.rss / 1000 / 1000).toFixed(2)}MB\nHeap Used: ${(
				memory.heapUsed /
				1000 /
				1000
			).toFixed(2)}MB\nHeap Total: ${(memory.heapTotal / 1000 / 1000).toFixed(2)}MB\nExternal: ${(
				memory.external /
				1000 /
				1000
			).toFixed(2)}MB`,
		);
	}
};

export const configureDev = async (client: CustomClient) => {
	const tsup = await import("tsup").catch(() => {
		CustomClient.printToStderr("Failed to load tsup, not watching for changes...");
	});

	Promise.all([
		tsup ? watchCommands(client, tsup.build) : undefined,
		tsup ? watchEvents(client, tsup.build) : undefined,
		logMemoryUsage(),
	]).catch(CustomClient.printToStderr);
};

export default configureDev;
