import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
} from "discord-api-types/v10";
import type { User } from "discord.js";
import { createCommand } from "../util";

const emojis = [
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

export const command = createCommand({
	data: [
		{
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
		},
	],
	async run(interaction) {
		let user1: User | undefined, user2: User | undefined;

		for (const option of interaction.options.data)
			if (option.name === "user1") user1 = option.user;
			else user2 = option.user;
		user2 ??= interaction.user;
		if (!user1) {
			await interaction.reply({
				content: "Utente non trovato!",
				ephemeral: true,
			});
			return;
		}
		const bigint1 = BigInt(user1.id) * BigInt(user1.discriminator);
		const bigint2 = BigInt(user2.id) * BigInt(user2.discriminator);
		const loveRate =
			bigint1 > bigint2
				? (bigint2 * 100n) / bigint1
				: (bigint1 * 100n) / bigint2;
		const emoji = emojis[Math.floor(Number(loveRate) / 10)] ?? "❤️";

		await interaction.reply({
			content: `${emoji} L'amore tra <@${user1.id}> e <@${user2.id}> è del **${loveRate}%** ${emoji}`,
		});
	},
});
