/* eslint-disable node/no-unpublished-import */
import { ApplicationCommandType } from "discord.js";
import { unlink, watch } from "node:fs/promises";
import { join } from "node:path";
import { cwd, memoryUsage } from "node:process";
import { setInterval } from "node:timers/promises";
import type { build as Build } from "tsup";
import type { CommandOptions, EventOptions } from "./util";
import Command from "./util/Command";
import Constants from "./util/Constants";
import CustomClient from "./util/CustomClient";
import Event from "./util/Event";

const commandsFolder = join(cwd(), `src/${Constants.commandsFolderName}`);
const eventsFolder = join(cwd(), `src/${Constants.eventsFolderName}`);
const freshImport = <T>(path: string) =>
	(import(`${path.replace(/\.ts$/, ".js")}?${Date.now()}`) as Promise<T>).catch(
		() => undefined
	);
const watchCommands = async (client: CustomClient, build: typeof Build) => {
	for await (const event of watch(commandsFolder, {
		encoding: "utf8",
		persistent: false,
	})) {
		const oldCommand = (
			await freshImport<{
				command: CommandOptions;
			}>(`./${Constants.commandsFolderName}/${event.filename}`)
		)?.command;

		if (event.eventType === "rename" && oldCommand) {
			const { name } =
				oldCommand.data.find(
					({ type }) => type === ApplicationCommandType.ChatInput
				) ?? oldCommand.data[0];
			const ok = client.commands.delete(name);

			unlink(
				new URL(
					`${Constants.commandsFolderName}/${event.filename.replace(
						/\.ts/,
						".js"
					)}`,
					import.meta.url
				)
			).catch(CustomClient.printToStderr);
			CustomClient.printToStdout(
				ok
					? `Deleted command ${name} (${event.filename})`
					: `Couldn't find command ${name} (${event.filename})`
			);
			continue;
		}
		const failed = await build({
			config: false,
			entry: [`src/${Constants.commandsFolderName}/${event.filename}`],
			format: "esm",
			external: ["tsup"],
			platform: "node",
			sourcemap: true,
			target: "ESNext",
			outDir: join(cwd(), "dist/commands"),
		}).catch(() => {
			CustomClient.printToStderr(`Failed to build command ${event.filename}`);
			return true as const;
		});

		if (failed) continue;
		const newCommand = (
			await freshImport<{
				command: CommandOptions;
			}>(`./${Constants.commandsFolderName}/${event.filename}`)
		)?.command;

		if (newCommand) {
			if (oldCommand)
				client.commands.delete(
					oldCommand.data.find(
						({ type }) => type === ApplicationCommandType.ChatInput
					)?.name ?? oldCommand.data[0].name
				);
			const { name } =
				newCommand.data.find(
					({ type }) => type === ApplicationCommandType.ChatInput
				) ?? newCommand.data[0];

			client.commands.set(name, new Command(client, newCommand));
			CustomClient.printToStdout(
				`${oldCommand ? "Reloaded" : "Added"} command ${name} (${
					event.filename
				})`
			);
		} else
			CustomClient.printToStderr(`Cannot find new command ${event.filename}`);
	}
};
const watchEvents = async (client: CustomClient, build: typeof Build) => {
	for await (const event of watch(eventsFolder, {
		encoding: "utf8",
		persistent: false,
	})) {
		const oldEvent = (
			await freshImport<{
				event: EventOptions;
			}>(`./${Constants.eventsFolderName}/${event.filename}`)
		)?.event;

		if (event.eventType === "rename" && oldEvent) {
			client.events.get(oldEvent.name)?.removeListeners();
			const ok = client.events.delete(oldEvent.name);

			unlink(
				new URL(
					`${Constants.eventsFolderName}/${event.filename.replace(
						/\.ts/,
						".js"
					)}`,
					import.meta.url
				)
			).catch(CustomClient.printToStderr);
			CustomClient.printToStdout(
				ok
					? `Deleted event ${oldEvent.name} (${event.filename})`
					: `Couldn't find event ${oldEvent.name} (${event.filename})`
			);
			continue;
		}
		const failed = await build({
			config: false,
			entry: [`src/${Constants.eventsFolderName}/${event.filename}`],
			format: "esm",
			external: ["tsup"],
			minify: true,
			platform: "node",
			sourcemap: true,
			target: "ESNext",
			outDir: join(cwd(), "dist/events"),
		}).catch(() => {
			CustomClient.printToStderr(`Failed to build event ${event.filename}`);
			return true as const;
		});

		if (failed) continue;
		const newEvent = (
			await freshImport<{
				event: EventOptions;
			}>(`./${Constants.eventsFolderName}/${event.filename}`)
		)?.event;

		if (newEvent) {
			if (oldEvent) {
				client.events.get(oldEvent.name)?.removeListeners();
				client.events.delete(oldEvent.name);
			}
			client.events.set(newEvent.name, new Event(client, newEvent));
			CustomClient.printToStdout(
				`${oldEvent ? "Reloaded" : "Added"} event ${newEvent.name} (${
					event.filename
				})`
			);
		} else
			CustomClient.printToStderr(`Cannot find new event ${event.filename}`);
	}
};
const logMemoryUsage = async () => {
	for await (const _ of setInterval(60_000)) {
		const memory = memoryUsage();

		CustomClient.printToStdout(
			`RSS: ${(memory.rss / 1024 / 1024).toFixed(2)}MB\nHeap Used: ${(
				memory.heapUsed /
				1024 /
				1024
			).toFixed(2)}MB\nHeap Total: ${(memory.heapTotal / 1024 / 1024).toFixed(
				2
			)}MB\nExternal: ${(memory.external / 1024 / 1024).toFixed(2)}MB`
		);
	}
};

export const configureDev = async (client: CustomClient) => {
	const tsup = await import("tsup").catch(() => {
		CustomClient.printToStderr(
			"Failed to load tsup, not watching for changes..."
		);
	});

	Promise.all([
		tsup ? watchCommands(client, tsup.build) : undefined,
		tsup ? watchEvents(client, tsup.build) : undefined,
		logMemoryUsage(),
	]).catch(CustomClient.printToStderr);
};

export default configureDev;
