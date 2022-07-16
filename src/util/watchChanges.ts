import { ApplicationCommandType } from "discord-api-types/v10";
import { unlink, watch } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import type { CommandOptions } from ".";
import Command from "./Command";
import Constants from "./Constants";
import CustomClient from "./CustomClient";

const commandsFolder = join(cwd(), `src/${Constants.commandsFolderName}`);
const importCommand = (name: string, fresh = false) =>
	(
		import(
			`./${Constants.commandsFolderName}/${name.replace(/\.ts$/, ".js")}${
				fresh ? `?${Date.now()}` : ""
			}`
		) as Promise<{
			command: CommandOptions;
		}>
	)
		.then((c) => c.command)
		.catch(() => undefined);

export const watchChanges = async (client: CustomClient) => {
	// eslint-disable-next-line node/no-unpublished-import
	const tsup = await import("tsup").catch(() => {
		CustomClient.printToStderr(
			"Failed to load tsup, not watching for changes..."
		);
	});

	if (tsup)
		for await (const event of watch(commandsFolder, {
			encoding: "utf8",
			persistent: false,
		})) {
			const oldCommand = await importCommand(event.filename, true);

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
						? `Deleted ${event.filename}`
						: `Couldn't find command ${name} (${event.filename})`
				);
				continue;
			}
			const failed = await tsup
				.build({
					config: false,
					entry: [`src/${Constants.commandsFolderName}/${event.filename}`],
					format: "esm",
					external: ["tsup"],
					minify: true,
					platform: "node",
					sourcemap: true,
					target: "ESNext",
					outDir: join(cwd(), "dist/commands"),
				})
				.catch(() => {
					CustomClient.printToStderr(`Failed to build ${event.filename}`);
					return true as const;
				});

			if (failed) continue;
			const newCommand = await importCommand(event.filename, true);

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
			} else CustomClient.printToStderr(`Cannot find new ${event.filename}`);
		}
};

export default watchChanges;
