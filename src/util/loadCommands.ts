import { ApplicationCommandType } from "discord-api-types/v10";
import { readdir } from "node:fs/promises";
import type { CommandOptions, CustomClient } from ".";
import Command from "./Command";
import Constants from "./Constants";

/**
 * Loads all commands from the commands directory.
 * @param client - The client to load commands into
 */
export const loadCommands = async (client: CustomClient) => {
	const fileNames = await readdir(new URL(Constants.commandsFolderName, import.meta.url));
	const files = await Promise.all(
		fileNames
			.filter((fileName) => fileName.endsWith(".js"))
			.map(
				(fileName) =>
					import(`./${Constants.commandsFolderName}/${fileName}`) as Promise<{
						command: CommandOptions;
					}>
			)
	);
	const commands = files.map((file) => file.command);
	for (const command of commands)
		client.commands.set(
			command.data.find(({ type }) => type === ApplicationCommandType.ChatInput)?.name ??
				command.data[0].name,
			new Command(client, command)
		);
};

export default loadCommands;
