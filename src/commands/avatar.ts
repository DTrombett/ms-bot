import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
} from "discord-api-types/v10";
import { createCommand, escapeMarkdown, rest } from "../util";

export const avatar = createCommand({
	chatInputData: {
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
	} as const,
	chatInput: ({ reply }, { interaction, options: { user: userId } }) => {
		const user =
			userId == null
				? (interaction.user ?? interaction.member?.user)
				: interaction.data.resolved?.users?.[userId];

		if (!user) {
			reply({ flags: MessageFlags.Ephemeral, content: "Utente non trovato!" });
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
		});
	},
});
