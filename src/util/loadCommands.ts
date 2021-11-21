import Collection from "@discordjs/collection";
import type { Client } from "discord.js";
import { promises } from "node:fs";
import { join } from "node:path";
import type { CommandOptions } from ".";
import Command from "./Command";
import Constants from "./Constants";

export const commands = new Collection<string, Command>();

/**
 * Loads all commands from the commands directory.
 * @param client - The client to load commands into
 */
export const loadCommands = (client: Client) =>
	promises
		.readdir(join(__dirname, "..", Constants.Commands))
		.then((fileNames) =>
			Promise.all(
				fileNames
					.filter((fileName) => fileName.endsWith(".js"))
					.map(
						(fileName) =>
							import(
								join(__dirname, "..", Constants.Commands, fileName)
							) as Promise<{
								command: CommandOptions;
							}>
					)
			)
		)
		.then((files) => files.map((file) => file.command))
		.then((commandOptions) => {
			for (const command of commandOptions)
				commands.set(command.data.name, new Command(client, command));
		});

export default commands;
