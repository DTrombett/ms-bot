import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionType,
	MessageFlags,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
	Command,
	randomNumber,
	type ChatInputArgs,
	type ComponentArgs,
	type ComponentReplies,
	type Merge,
} from "../util/index.ts";

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
	random = (
		{ reply }: Pick<ComponentReplies, "reply">,
		{
			args: [min, max] = [],
			options = { min: Number(min), max: Number(max) },
			interaction: { type },
		}: Pick<
			Merge<ComponentArgs, ChatInputArgs<typeof Random.chatInputData>>,
			"args" | "interaction"
		> & {
			options?: Partial<ChatInputArgs<typeof Random.chatInputData>["options"]>;
		},
	) => {
		if (isNaN(options.min!) || isNaN(options.max!))
			options.min = options.max = undefined;
		else if (options.min! > options.max!)
			[options.min, options.max] = [options.max, options.min];
		if (typeof min !== typeof max)
			return reply({
				content:
					"Devi specificare sia il minimo che il massimo o nessuno dei due se vuoi un numero decimale tra 0 e 1",
				flags: MessageFlags.Ephemeral,
			});
		reply({
			content: `🎲 ${randomNumber(options.min, options.max)}`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Genera un altro!",
							style: ButtonStyle.Primary,
							emoji: { name: "🎲" },
							custom_id: `random-${options.min ?? NaN}-${options.max ?? NaN}`,
						},
					],
				},
			],
			flags:
				type === InteractionType.MessageComponent
					? MessageFlags.Ephemeral
					: undefined,
		});
	};
	override chatInput = this.random;
	override component = this.random;
}
