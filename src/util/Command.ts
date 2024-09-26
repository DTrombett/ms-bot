import {
	APIInteraction,
	APIInteractionResponse,
	ApplicationCommandType,
	InteractionType,
	RESTPutAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
	CommandInteractionByType,
	type Awaitable,
	type CommandOptions,
	type Env,
	type ExecutorContext,
	type InteractionByType,
	type ReplyFunction,
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
	isPrivate: boolean;

	/**
	 * The function to handle the autocomplete of this command
	 */
	private _autocomplete: CommandOptions<T>["autocomplete"];

	/**
	 * The function to handle a message component received
	 */
	private _component: CommandOptions<T>["component"];

	/**
	 * The function to handle a submitted modal
	 */
	private _modalSubmit: CommandOptions<T>["modalSubmit"];

	/**
	 * The function provided to handle the command received
	 */
	private _execute: CommandOptions<T>["run"];

	/**
	 * @param options - Options for this command
	 */
	constructor(options: CommandOptions<T>) {
		this.data = options.data;
		this._execute = options.run;
		this._autocomplete = options.autocomplete;
		this._component = options.component;
		this._modalSubmit = options.modalSubmit;
		this.isPrivate = options.isPrivate ?? false;
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
		return this.execute(interaction, env, context, this._autocomplete);
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
		return this.execute(interaction, env, context, this._component);
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
		return this.execute(interaction, env, context, this._modalSubmit);
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
		return this.execute(interaction, env, context, this._execute);
	}

	private async execute<I extends APIInteraction>(
		interaction: I,
		env: Env,
		context: ExecutionContext,
		executor?: (
			reply: ReplyFunction,
			context: ExecutorContext<I>,
		) => Awaitable<void>,
	) {
		const { user } = interaction.member ?? interaction;

		if (!executor || (this.isPrivate && !env.OWNER_ID.includes(user!.id)))
			return undefined;
		console.log(
			`${InteractionType[interaction.type]} interaction received in channel ${interaction.channel?.name ?? interaction.channel?.id} from user ${interaction.member?.nick ?? user?.username} (${user?.id})`,
		);
		return new Promise<APIInteractionResponse>((resolve, reject) => {
			let done = false;
			const promise = executor(
				(value) => {
					if (done) return;
					resolve(value);
					done = true;
				},
				{ env, context, interaction },
			)?.catch((err: Error) => {
				if (done) console.error(err);
				else reject(err);
			});

			if (promise) context.waitUntil(promise);
		});
	}
}

export default Command;
