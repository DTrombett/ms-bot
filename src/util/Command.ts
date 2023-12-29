import { REST } from "@discordjs/rest";
import {
	APIInteraction,
	APIInteractionResponse,
	InteractionType,
	RESTPutAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type {
	Awaitable,
	CommandOptions,
	Env,
	ExecutorContext,
	InteractionByType,
} from ".";

/**
 * A class representing a Discord slash command
 */
export class Command {
	/**
	 * The rest for discord requests
	 */
	readonly api: REST;

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
	constructor(api: REST, options: CommandOptions<any>) {
		this.api = api;
		this.patch(options);
	}

	/**
	 * Autocomplete this command.
	 * @param interaction - The interaction received
	 */
	async autocomplete(
		interaction: InteractionByType<InteractionType.ApplicationCommandAutocomplete>,
		env: Env,
		context: ExecutionContext,
	) {
		if (!this._autocomplete) return undefined;
		return this.execute(
			interaction,
			env,
			context,
			this._autocomplete.bind(this, interaction),
		);
	}

	/**
	 * Run this command for a message component.
	 * @param interaction - The interaction received
	 */
	async component(
		interaction: InteractionByType<InteractionType.MessageComponent>,
		env: Env,
		context: ExecutionContext,
	) {
		if (!this._component) return undefined;
		return this.execute(
			interaction,
			env,
			context,
			this._component.bind(this, interaction),
		);
	}

	/**
	 * Run this command for a submitted modal.
	 * @param interaction - The interaction received
	 */
	async modalSubmit(
		interaction: InteractionByType<InteractionType.ModalSubmit>,
		env: Env,
		context: ExecutionContext,
	) {
		if (!this._modalSubmit) return undefined;
		return this.execute(
			interaction,
			env,
			context,
			this._modalSubmit.bind(this, interaction),
		);
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
		env: Env,
		context: ExecutionContext,
	) {
		return this.execute(
			interaction,
			env,
			context,
			this._execute.bind(this, interaction),
		);
	}

	private async execute(
		interaction: APIInteraction,
		env: Env,
		context: ExecutionContext,
		executor: (context: ExecutorContext) => Awaitable<void>,
	) {
		if (
			this.isPrivate &&
			!env.OWNER_ID.includes(
				(interaction.user ?? interaction.member?.user)?.id ?? "--",
			)
		)
			return undefined;
		return new Promise<APIInteractionResponse>((resolve, reject) => {
			let done = false;
			const promise = executor({
				env,
				context,
				reply: (value) => {
					if (done) return;
					resolve(value);
					done = true;
				},
			})?.catch((err) => {
				if (done) console.error(err);
				else reject(err);
			});

			if (promise) context.waitUntil(promise);
		}).catch(console.error);
	}
}

export default Command;
