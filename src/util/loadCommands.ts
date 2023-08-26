import { ApplicationCommandType } from "discord-api-types/v10";
import type { CommandOptions, CustomClient } from ".";
import * as commands from "../commands";
import Command from "./Command";

/**
 * Loads all commands from the commands directory.
 * @param client - The client to load commands into
 */
export const loadCommands = async (client: CustomClient, clean = false) => {
	client.commands.clear();
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	for (const command of Object.values(
		clean ? await import(`./commands/index.js?${Date.now()}`) : commands,
	) as CommandOptions[])
		client.commands.set(
			command.data.find(({ type }) => type === ApplicationCommandType.ChatInput)?.name ??
				command.data[0].name,
			new Command(client, command),
		);
};

export default loadCommands;
