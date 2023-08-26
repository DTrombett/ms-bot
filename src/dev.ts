/* eslint-disable node/no-unpublished-import */
import { unlink, watch } from "node:fs/promises";
import { join } from "node:path";
import { cwd, memoryUsage } from "node:process";
import { setInterval } from "node:timers/promises";
import type { build as Build } from "tsup";
import { loadCommands, type EventOptions } from "./util";
import Constants from "./util/Constants";
import CustomClient from "./util/CustomClient";
import Event from "./util/Event";

const commandsFolder = join(cwd(), `src/${Constants.commandsFolderName}`);
const eventsFolder = join(cwd(), `src/${Constants.eventsFolderName}`);
const freshImport = <T>(path: string) =>
	(import(`${path.replace(/\.ts$/, ".js")}?${Date.now()}`) as Promise<T>).catch(() => undefined);
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
		await loadCommands(client, true);
		CustomClient.printToStdout(
			`Fast reloaded commands in ${(performance.now() - now).toFixed(2)}ms!`,
		);
	}
};
const watchEvents = async (client: CustomClient, build: typeof Build) => {
	for await (const event of watch(eventsFolder, {
		encoding: "utf8",
		persistent: false,
	})) {
		const { filename } = event;

		if (filename == null) continue;
		const oldEvent = (
			await freshImport<{
				event: EventOptions;
			}>(`./${Constants.eventsFolderName}/${filename}`)
		)?.event;

		if (event.eventType === "rename" && oldEvent) {
			client.events.get(oldEvent.name)?.removeListeners();
			const ok = client.events.delete(oldEvent.name);

			unlink(
				new URL(
					`${Constants.eventsFolderName}/${filename.replace(/\.ts/, ".js")}`,
					import.meta.url,
				),
			).catch(CustomClient.printToStderr);
			CustomClient.printToStdout(
				ok
					? `Deleted event ${oldEvent.name} (${filename})`
					: `Couldn't find event ${oldEvent.name} (${filename})`,
			);
			continue;
		}
		const failed = await build({
			config: false,
			entry: [`src/${Constants.eventsFolderName}/${filename}`],
			format: "esm",
			external: ["tsup"],
			minify: true,
			platform: "node",
			sourcemap: true,
			target: "esnext",
			outDir: join(cwd(), "dist/events"),
		}).catch(() => {
			CustomClient.printToStderr(`Failed to build event ${filename}`);
			return true as const;
		});

		if (failed) continue;
		const newEvent = (
			await freshImport<{
				event: EventOptions;
			}>(`./${Constants.eventsFolderName}/${filename}`)
		)?.event;

		if (newEvent) {
			if (oldEvent) {
				client.events.get(oldEvent.name)?.removeListeners();
				client.events.delete(oldEvent.name);
			}
			client.events.set(newEvent.name, new Event(client, newEvent));
			CustomClient.printToStdout(
				`${oldEvent ? "Reloaded" : "Added"} event ${newEvent.name} (${filename})`,
			);
		} else CustomClient.printToStderr(`Cannot find new event ${filename}`);
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
