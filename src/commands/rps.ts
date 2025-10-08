import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	type APIInteractionResponseCallbackData,
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

type Choice = (typeof RPS.choices)[number];

export class RPS extends Command {
	static override chatInputData = {
		name: "rps",
		description: "Gioca a sasso, carta, forbici",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "choice",
				description: "La tua scelta",
				type: ApplicationCommandOptionType.String,
				required: true,
				choices: [
					{
						name: "Sasso",
						value: "rock",
					},
					{
						name: "Carta",
						value: "paper",
					},
					{
						name: "Forbici",
						value: "scissors",
					},
				],
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static choices = ["rock", "paper", "scissors"] as const;
	static emojis = {
		rock: ":fist:",
		paper: ":raised_hand:",
		scissors: ":v:",
	} as const;
	static unicodeEmojis = {
		rock: "✊",
		paper: "✋",
		scissors: "✌️",
	} as const;
	static winners = {
		rock: "paper",
		paper: "scissors",
		scissors: "rock",
	} as const;
	static override customId = "rps";
	override chatInput(
		{ reply }: ChatInputReplies,
		{ options: { choice } }: ChatInputArgs<typeof RPS.chatInputData>,
	) {
		reply(this.play(choice));
	}
	override component(
		{ reply }: ComponentReplies,
		{ args: [choice] }: ComponentArgs,
	) {
		reply(this.play(choice as Choice, MessageFlags.Ephemeral));
	}
	play(
		choice: Choice,
		flags?: MessageFlags,
	): APIInteractionResponseCallbackData {
		if (!RPS.choices.includes(choice))
			return {
				content: "La tua scelta non è valida!",
				flags: MessageFlags.Ephemeral,
			};
		const myChoice = RPS.choices[randomNumber(0, 2)]!;

		return {
			content: `### Tu: ${RPS.emojis[choice]}\n### Io: ${
				RPS.emojis[myChoice]
			}\n## ${
				myChoice === choice
					? "Pareggio"
					: RPS.winners[myChoice] === choice
						? "Hai vinto"
						: "Hai perso"
			}!\n-# Rivincita?`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: RPS.choices.map((choice) => ({
						custom_id: `rps-${choice}`,
						emoji: { name: RPS.unicodeEmojis[choice] },
						style: ButtonStyle.Secondary,
						type: ComponentType.Button,
					})),
				},
			],
			flags,
		};
	}
}
