import type { Snowflake } from "discord-api-types/v9";
import type { Client, CommandInteraction } from "discord.js";
import type { CommandOptions } from ".";
import Constants from "./Constants";

const owners: Snowflake[] = [Constants.OwnerId1, Constants.OwnerId2];

/**
 * A class representing a Discord slash command
 */
export class Command {
	/**
	 * The client that instantiated this
	 */
	client: Client;

	/**
	 * The Discord data for this command
	 */
	data: CommandOptions["data"];

	/**
	 * If this command is private and can only be executed by the owners of the bot
	 */
	reserved: boolean;

	/**
	 * The function provided to handle the command received
	 */
	private _execute: OmitThisParameter<CommandOptions["run"]>;

	/**
	 * @param options - Options for this command
	 */
	constructor(client: Client, options: CommandOptions) {
		this._execute = options.run.bind(this);
		this.client = client;
		this.data = options.data;
		this.reserved = options.reserved ?? false;
	}

	/**
	 * The name of this command
	 */
	get name() {
		return this.data.name;
	}
	set name(name) {
		this.data.setName(name);
	}

	/**
	 * Run this command.
	 * @param interaction - The interaction received
	 */
	async run(interaction: CommandInteraction) {
		try {
			if (this.reserved && !owners.includes(interaction.user.id)) {
				await interaction.reply({
					content: "Questo comando è riservato ai proprietari del bot.",
				});
				return;
			}
			await this._execute(interaction);
		} catch (message) {
			console.error(message);
		}
	}
}

export default Command;
