import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionType,
	MessageFlags,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { Command } from "../commandHandler/Command.ts";
import { ok } from "../util/node.ts";
import { randomArrayItem } from "../util/random.ts";

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
	play = (
		{ reply }: ComponentReplies,
		{
			args: [choiceArg] = [],
			options: { choice } = { choice: choiceArg as Choice },
			interaction: { type },
		}: Pick<
			Merge<ComponentArgs, ChatInputArgs<typeof RPS.chatInputData>>,
			"args" | "interaction"
		> & {
			options?: Partial<ChatInputArgs<typeof RPS.chatInputData>["options"]>;
		},
	) => {
		ok(choice);
		if (!RPS.choices.includes(choice))
			return reply({
				content: "La tua scelta non è valida!",
				flags: MessageFlags.Ephemeral,
			});
		const myChoice = randomArrayItem(RPS.choices);

		return reply({
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
			flags:
				type === InteractionType.MessageComponent
					? MessageFlags.Ephemeral
					: undefined,
		});
	};
	override component = this.play;
	override chatInput = this.play;
}
