import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	escapeMarkdown,
} from "discord.js";
import { createCommand } from "../util";

export const avatarCommand = createCommand({
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
	async run(interaction) {
		const option = interaction.options.get("user");
		const { member, user } = option ?? interaction;

		if (!user) {
			await interaction.reply({
				ephemeral: true,
				content: "Utente non trovato!",
			});
			return;
		}
		const url =
			member && "displayAvatarURL" in member
				? member.displayAvatarURL({
						extension: "png",
						size: 4096,
				  })
				: member?.avatar != null
				? this.client.rest.cdn.guildMemberAvatar(
						interaction.guildId!,
						user.id,
						member.avatar,
						{
							size: 4096,
							extension: "png",
						},
				  )
				: user.displayAvatarURL({
						extension: "png",
						size: 4096,
				  });

		await interaction.reply({
			content: `Avatar di **[${escapeMarkdown(
				(member && "displayName" in member
					? member.displayName
					: member?.nick) ?? user.displayName,
			)}](${url} )**:`,
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
