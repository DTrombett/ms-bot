import { escapeMarkdown } from "@discordjs/formatters";
import {
	APIApplicationCommandInteractionDataUserOption,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { Command, rest } from "../util";

export const avatar = new Command({
	data: [
		{
			name: "avatar",
			description: "Mostra l'avatar di un utente",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "user",
					description: "L'utente di cui mostrare l'avatar",
					type: ApplicationCommandOptionType.User,
				},
			],
		},
	],
	run(interaction, { reply }) {
		const userId = interaction.data.options?.find(
			(o): o is APIApplicationCommandInteractionDataUserOption =>
				o.name === "user" && o.type === ApplicationCommandOptionType.User,
		)?.value;
		const user =
			userId == null
				? interaction.user ?? interaction.member?.user
				: interaction.data.resolved?.users?.[userId];

		if (!user) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { flags: MessageFlags.Ephemeral, content: "Utente non trovato!" },
			});
			return;
		}
		const member =
			userId == null
				? interaction.member
				: interaction.data.resolved?.members?.[userId];
		const url =
			member?.avatar == null
				? user.avatar == null
					? rest.cdn.defaultAvatar(
							user.discriminator === "0"
								? Number(BigInt(user.id) >> 22n) % 6
								: Number(user.discriminator) % 5,
						)
					: rest.cdn.avatar(user.id, user.avatar, {
							size: 4096,
							extension: "png",
						})
				: rest.cdn.guildMemberAvatar(
						interaction.guild_id!,
						user.id,
						member.avatar,
						{
							size: 4096,
							extension: "png",
						},
					);

		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Avatar di **[${escapeMarkdown(
					member?.nick ?? user.global_name ?? user.username,
				)}](${url} )**:`,
				allowed_mentions: { parse: [] },
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								url,
								style: ButtonStyle.Link,
								label: "Apri l'originale",
							},
						],
					},
				],
			},
		});
	},
});
