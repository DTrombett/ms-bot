import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	MessageFlags,
	type APIMediaGalleryItem,
} from "discord-api-types/v10";
import { createCommand, rest } from "../util";

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
	chatInput: ({ reply }, { interaction, options: { user: userId }, user }) => {
		const member = userId
			? interaction.data.resolved?.members?.[userId]
			: interaction.member;
		const items: APIMediaGalleryItem[] = [];

		if (userId) user = interaction.data.resolved?.users?.[userId] ?? user;
		if (member?.avatar)
			items.push({
				media: {
					url: rest.cdn.guildMemberAvatar(
						interaction.guild_id!,
						user.id,
						member.avatar,
						{
							size: 4096,
							extension: "png",
						},
					),
				},
			});
		if (user.avatar)
			items.push({
				media: {
					url: rest.cdn.avatar(user.id, user.avatar, {
						size: 4096,
						extension: "png",
					}),
				},
			});
		else
			items.push({
				media: {
					url: rest.cdn.defaultAvatar(
						user.discriminator === "0"
							? Number(BigInt(user.id) >> 22n) % 6
							: Number(user.discriminator) % 5,
					),
				},
			});
		reply({
			flags: MessageFlags.IsComponentsV2,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: `Avatar di <@${user.id}>`,
				},
				{
					type: ComponentType.MediaGallery,
					items,
				},
			],
			allowed_mentions: { parse: [] },
		});
	},
});
