import {
	APIInteraction,
	APIInteractionResponse,
	ApplicationCommandType,
	InteractionType,
	RESTPutAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
	CommandInteractionByType,
	error,
	type Awaitable,
	type CommandOptions,
	type Env,
	type ExecutorContext,
	type InteractionByType,
} from ".";

/**
 * A class representing a Discord slash command
 */
export class Command<T extends ApplicationCommandType = any> {
	/**
	 * The Discord data for this command
	 */
	data: RESTPutAPIApplicationCommandsJSONBody;

	/**
	 * Whether this command is private
	 */
	isPrivate = false;

	/**
	 * The function to handle the autocomplete of this command
	 */
	private _autocomplete: OmitThisParameter<CommandOptions<T>["autocomplete"]>;

	/**
	 * The function to handle a message component received
	 */
	private _component: OmitThisParameter<CommandOptions<T>["component"]>;

	/**
	 * The function to handle a submitted modal
	 */
	private _modalSubmit: OmitThisParameter<CommandOptions<T>["modalSubmit"]>;

	/**
	 * The function provided to handle the command received
	 */
	private _execute: OmitThisParameter<CommandOptions<T>["run"]>;

	/**
	 * @param options - Options for this command
	 */
	constructor(options: CommandOptions<T>) {
		this.data = options.data;
		this._execute = options.run.bind(this);
		if (options.autocomplete !== undefined)
			this._autocomplete = options.autocomplete.bind(this);
		if (options.component !== undefined)
			this._component = options.component.bind(this);
		if (options.modalSubmit !== undefined)
			this._modalSubmit = options.modalSubmit.bind(this);
		if (options.isPrivate !== undefined) this.isPrivate = options.isPrivate;
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
	 * Run this command.
	 * @param interaction - The interaction received
	 */
	async run(
		interaction: CommandInteractionByType<T>,
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
			!env.OWNER_ID.includes((interaction.member ?? interaction).user!.id)
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
			})?.catch((err: Error) => {
				if (done) error(err);
				else reject(err);
			});

			if (promise) context.waitUntil(promise);
		}).catch(error);
	}
}

export default Command;
