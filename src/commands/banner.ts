import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	MessageFlags,
	Routes,
	type APIGuildMember,
	type APIMediaGalleryItem,
	type APIUser,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";
import { rest } from "../util/globals";

export class Banner extends Command {
	static override chatInputData = {
		name: "banner",
		description: "Mostra il banner di un utente",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "user",
				description: "L'utente di cui mostrare il banner",
				type: ApplicationCommandOptionType.User,
			},
		],
	} as const satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	static override async chatInput(
		{ reply }: ChatInputReplies,
		{
			options: { user: userId },
			user,
			interaction,
		}: ChatInputArgs<typeof Banner.chatInputData>,
	) {
		const member =
			userId ?
				interaction.data.resolved?.members?.[userId]
			:	interaction.member;
		const items: APIMediaGalleryItem[] = [];
		const promises: Promise<any>[] = [];

		if (userId) user = interaction.data.resolved?.users?.[userId] ?? user;
		if (user.banner === undefined)
			promises.push(
				rest.get(Routes.user(user.id)).then((u) => (user = u as APIUser)),
			);
		if (member && member.banner === undefined)
			promises.push(
				rest
					.get(Routes.guildMember(interaction.guild_id!, user.id))
					.then((m) => (member.banner = (m as APIGuildMember).banner)),
			);
		await Promise.allSettled(promises);
		if (member?.banner)
			items.push({
				media: {
					url: rest.cdn.guildMemberBanner(
						interaction.guild_id!,
						user.id,
						member.banner,
						{ size: 4096, extension: "png" },
					),
				},
			});
		if (user.banner)
			items.push({
				media: {
					url: rest.cdn.banner(user.id, user.banner, {
						size: 4096,
						extension: "png",
					}),
				},
			});
		if (!items.length)
			return reply({
				content: "L'utente non ha un banner!",
				flags: MessageFlags.Ephemeral,
			});
		reply({
			flags: MessageFlags.IsComponentsV2,
			components: [
				{ type: ComponentType.TextDisplay, content: `Banner di <@${user.id}>` },
				{ type: ComponentType.MediaGallery, items },
			],
			allowed_mentions: { parse: [] },
		});
	}
}
