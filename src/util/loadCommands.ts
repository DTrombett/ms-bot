import { promises } from "node:fs";
import { URL } from "node:url";
import type { CommandOptions } from ".";
import { CustomClient } from ".";
import Command from "./Command";
import Constants from "./Constants";

const folder = Constants.commandsFolderName();

/**
 * Loads all commands from the commands directory.
 * @param client - The client to load commands into
 */
export const loadCommands = async (client: CustomClient) => {
	if (!(client instanceof CustomClient))
		throw new TypeError("Argument 'client' must be a CustomClient");
	const fileNames = await promises.readdir(new URL(folder, import.meta.url));
	const files = await Promise.all(
		fileNames
			.filter((fileName) => fileName.endsWith(".js"))
			.map(
				(fileName) =>
					import(`./${folder}/${fileName}`) as Promise<{
						command: CommandOptions;
					}>
			)
	);
	const commands = files.map((file) => file.command);
	for (const command of commands)
		client.commands.set(command.data.name, new Command(client, command));
};

export default loadCommands;
