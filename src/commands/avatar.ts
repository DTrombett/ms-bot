import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	GuildMember,
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
		const { guild } = interaction;
		const option =
			interaction.options.data.find(
				(o) => o.type === ApplicationCommandOptionType.User,
			) ?? interaction;
		const user = option.user ?? interaction.user;
		const member = option.member
			? option.member
			: guild
			? await guild.members.fetch(user.id).catch(() => user)
			: user;
		const url =
			"client" in member
				? member.displayAvatarURL({
						extension: "png",
						size: 4096,
				  })
				: member.avatar != null
				? this.client.rest.cdn.guildMemberAvatar(
						guild!.id,
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
				member instanceof GuildMember
					? member.displayName
					: "nick" in member && member.nick != null
					? member.nick
					: user.username,
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
