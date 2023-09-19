/* eslint-disable @typescript-eslint/member-ordering */
import type {
	InteractionType,
	RESTPutAPIApplicationCommandsJSONBody,
} from "discord.js";
import { env } from "node:process";
import { printToStderr, type CommandOptions, type InteractionByType } from ".";
import CustomClient from "./CustomClient";

/**
 * A class representing a Discord slash command
 */
export class Command {
	/**
	 * The client that instantiated this
	 */
	readonly client: CustomClient<true>;

	/**
	 * The Discord data for this command
	 */
	data!: RESTPutAPIApplicationCommandsJSONBody;

	/**
	 * Whether this command is private
	 */
	isPrivate = false;

	/**
	 * The function to handle the autocomplete of this command
	 */
	private _autocomplete: OmitThisParameter<CommandOptions["autocomplete"]>;

	/**
	 * The function to handle a message component received
	 */
	private _component: OmitThisParameter<CommandOptions["component"]>;

	/**
	 * The function to handle a submitted modal
	 */
	private _modalSubmit: OmitThisParameter<CommandOptions["modalSubmit"]>;

	/**
	 * The function provided to handle the command received
	 */
	private _execute!: OmitThisParameter<CommandOptions["run"]>;

	/**
	 * @param options - Options for this command
	 */
	constructor(client: CustomClient, options: CommandOptions) {
		this.client = client;
		this.patch(options);
	}

	/**
	 * Autocomplete this command.
	 * @param interaction - The interaction received
	 */
	async autocomplete(
		interaction: InteractionByType<InteractionType.ApplicationCommandAutocomplete>,
	) {
		try {
			if (
				!this.isPrivate ||
				env.OWNER_IDS?.includes(interaction.user.id) === true
			)
				await this._autocomplete?.(interaction);
		} catch (message) {
			printToStderr(message);
		}
	}

	/**
	 * Run this command for a message component.
	 * @param interaction - The interaction received
	 */
	async component(
		interaction: InteractionByType<InteractionType.MessageComponent>,
	) {
		try {
			if (
				!this.isPrivate ||
				env.OWNER_IDS?.includes(interaction.user.id) === true
			)
				await this._component?.(interaction);
		} catch (message) {
			printToStderr(message);
		}
	}

	/**
	 * Run this command for a submitted modal.
	 * @param interaction - The interaction received
	 */
	async modalSubmit(
		interaction: InteractionByType<InteractionType.ModalSubmit>,
	) {
		try {
			if (
				!this.isPrivate ||
				env.OWNER_IDS?.includes(interaction.user.id) === true
			)
				await this._modalSubmit?.(interaction);
		} catch (message) {
			printToStderr(message);
		}
	}

	/**
	 * Patch this command.
	 * @param options - Options for this command
	 */
	patch(options: Partial<CommandOptions>) {
		if (options.data !== undefined) this.data = options.data;
		if (options.autocomplete !== undefined)
			this._autocomplete = options.autocomplete.bind(this);
		if (options.component !== undefined)
			this._component = options.component.bind(this);
		if (options.modalSubmit !== undefined)
			this._modalSubmit = options.modalSubmit.bind(this);
		if (options.isPrivate !== undefined) this.isPrivate = options.isPrivate;
		if (options.run !== undefined) this._execute = options.run.bind(this);
		return this;
	}

	/**
	 * Run this command.
	 * @param interaction - The interaction received
	 */
	async run(
		interaction: InteractionByType<InteractionType.ApplicationCommand>,
	) {
		try {
			if (
				!this.isPrivate ||
				env.OWNER_IDS?.includes(interaction.user.id) === true
			)
				await this._execute(interaction);
		} catch (message) {
			printToStderr(message);
		}
	}
}

export default Command;
