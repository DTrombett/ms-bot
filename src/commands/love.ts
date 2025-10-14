import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { Command } from "../commandHandler/Command.ts";

export class Love extends Command {
	static override chatInputData = {
		name: "love",
		description: "Calcola l'amore tra due utenti 💓",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "user1",
				description: "Il primo utente",
				type: ApplicationCommandOptionType.User,
				required: true,
			},
			{
				name: "user2",
				description: "Il secondo utente (default: tu)",
				type: ApplicationCommandOptionType.User,
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static emojis = [
		":broken_heart:",
		":mending_heart:",
		":heart:",
		":sparkling_heart:",
		":cupid:",
		":heartpulse:",
		":gift_heart:",
		":heartbeat:",
		":two_hearts:",
		":revolving_hearts:",
		":heart_on_fire:",
	];
	override chatInput(
		{ reply }: ChatInputReplies,
		{
			interaction,
			user: user2,
			options,
		}: ChatInputArgs<typeof Love.chatInputData>,
	) {
		if (options.user2)
			user2 = interaction.data.resolved!.users![options.user2]!;
		const user1 = interaction.data.resolved!.users![options.user1]!;
		const length = Math.max(
			Math.min(user1.username.length, user2.username.length),
			10,
		);
		const bigint1 =
			BigInt(user1.id) *
				[...user1.username.slice(0, length)].reduce(
					(sum, c) => sum + BigInt(c.charCodeAt(0)),
					BigInt(0),
				) +
			BigInt(10 ** Math.abs(user1.username.length - length));
		const bigint2 =
			BigInt(user2.id) *
				[...user2.username.slice(0, length)].reduce(
					(sum, c) => sum + BigInt(c.charCodeAt(0)),
					BigInt(0),
				) +
			BigInt(10 ** Math.abs(user2.username.length - length));
		const loveRate =
			bigint1 > bigint2
				? (bigint2 * 100n) / bigint1
				: (bigint1 * 100n) / bigint2;
		const emoji = Love.emojis[Math.floor(Number(loveRate) / 10)] ?? "❤️";

		reply({
			content: `${emoji} L'amore tra <@${user1.id}> e <@${user2.id}> è del **${loveRate}%** ${emoji}`,
			allowed_mentions: { parse: [] },
		});
	}
}
