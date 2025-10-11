import {
	APIInteractionResponseCallbackData,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
	Command,
	randomNumber,
	type ChatInputArgs,
	type ChatInputReplies,
	type ComponentArgs,
	type ComponentReplies,
} from "../util";

export class Dice extends Command {
	static override chatInputData = {
		name: "dice",
		description: "Tira il dado!",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "count",
				description: "Il numero di dadi da tirare (default: 1)",
				type: ApplicationCommandOptionType.Integer,
				min_value: 1,
				max_value: 100,
			},
		],
	} as const satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	static override customId = "dice";
	override chatInput(
		{ reply }: ChatInputReplies,
		{ options: { count } }: ChatInputArgs<typeof Dice.chatInputData>,
	) {
		reply(this.roll(count));
	}
	override component(
		{ reply }: ComponentReplies,
		{ args: [count] }: ComponentArgs,
	) {
		reply(this.roll(Number(count) || undefined, MessageFlags.Ephemeral));
	}
	roll(count = 1, flags?: MessageFlags): APIInteractionResponseCallbackData {
		if (count < 1 || count > 100)
			return {
				content: "Il numero dei dadi deve essere compreso tra 1 e 100.",
				flags: MessageFlags.Ephemeral,
			};
		const results: number[] = [];
		let result = 0;

		for (let i = 0; i < count; i++) {
			const n = randomNumber(1, 6);

			result += n;
			results.push(n);
		}
		return {
			content: `🎲 **${result}** con ${count} dad${count === 1 ? "o" : "i"}!\n${
				count > 1 ? `-# ${results.join(", ")}` : ""
			}`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `dice-${count}`,
							label: "Tira di nuovo!",
							style: ButtonStyle.Success,
							emoji: { name: "🎲" },
						},
					],
				},
			],
			flags,
		};
	}
}
