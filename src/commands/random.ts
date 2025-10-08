import {
	APIInteractionResponseCallbackData,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
	Command,
	randomNumber,
	type ChatInputArgs,
	type ChatInputReplies,
	type ComponentArgs,
	type ComponentReplies,
} from "../util";

export class Random extends Command {
	static override chatInputData = {
		name: "random",
		description:
			"Genera un numero casuale tra due numeri o, se non specificati, genera un numero decimale tra 0 e 1",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "min",
				description: "Il numero minimo",
				type: ApplicationCommandOptionType.Integer,
				min_value: 0,
				max_value: Number.MAX_SAFE_INTEGER - 1,
			},
			{
				name: "max",
				description: "Il numero massimo",
				type: ApplicationCommandOptionType.Integer,
				min_value: 0,
				max_value: Number.MAX_SAFE_INTEGER,
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override customId = "random";
	override chatInput(
		{ reply }: ChatInputReplies,
		{ options }: ChatInputArgs<typeof Random.chatInputData>,
	) {
		if (options.min! > options.max!)
			[options.min, options.max] = [options.max, options.min];
		reply(this.getRandom(options));
	}
	override component(
		{ reply }: ComponentReplies,
		{ args: [min, max] }: ComponentArgs,
	) {
		const options: { min?: number; max?: number } = {
			min: Number(min),
			max: Number(max),
		};

		if (isNaN(options.min!) || isNaN(options.max!))
			options.min = options.max = undefined;
		reply(this.getRandom(options, MessageFlags.Ephemeral));
	}
	getRandom(
		{ min, max }: { min?: number; max?: number },
		flags?: MessageFlags,
	): APIInteractionResponseCallbackData {
		if (typeof min !== typeof max)
			return {
				content:
					"Devi specificare sia il minimo che il massimo o nessuno dei due se vuoi un numero decimale tra 0 e 1",
				flags: MessageFlags.Ephemeral,
			};
		return {
			content: `🎲 ${randomNumber(min, max)}`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Genera un altro!",
							style: ButtonStyle.Primary,
							emoji: { name: "🎲" },
							custom_id: `random-${min}-${max}`,
						},
					],
				},
			],
			flags,
		};
	}
}
