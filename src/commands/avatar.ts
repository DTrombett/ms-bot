import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
	type APIMediaGalleryItem,
} from "discord-api-types/v10";
import { exampleUser } from "../util/commandHandler/testData.ts";
import {
	Command,
	rest,
	type ChatInputArgs,
	type ChatInputReplies,
	type CommandTests,
} from "../util/index.ts";

export class Avatar extends Command {
	static override chatInputData = {
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
	} as const;
	static override tests: CommandTests = [
		{
			name: "Default avatar",
			interaction: {
				type: InteractionType.ApplicationCommand,
				data: this.createChatInputData(),
				user: { ...exampleUser, id: "566777938289098760" },
			},
			response: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.IsComponentsV2,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: "Avatar di <@566777938289098760>",
						},
						{
							type: ComponentType.MediaGallery,
							items: [
								{
									media: {
										url: "https://cdn.discordapp.com/embed/avatars/3.png",
									},
								},
							],
						},
					],
					allowed_mentions: { parse: [] },
				},
			},
		},
		{
			name: "Custom avatar",
			interaction: {
				type: InteractionType.ApplicationCommand,
				data: this.createChatInputData(),
				user: { ...exampleUser, avatar: "ad2ebc8f7abc838f21d2c286986b5ef1" },
			},
			response: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.IsComponentsV2,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: `Avatar di <@${exampleUser.id}>`,
						},
						{
							type: ComponentType.MediaGallery,
							items: [
								{
									media: {
										url: `https://cdn.discordapp.com/avatars/${exampleUser.id}/ad2ebc8f7abc838f21d2c286986b5ef1.png?size=4096`,
									},
								},
							],
						},
					],
					allowed_mentions: { parse: [] },
				},
			},
		},
		{
			name: "Animated avatar",
			interaction: {
				type: InteractionType.ApplicationCommand,
				data: this.createChatInputData(),
				user: { ...exampleUser, avatar: "a_ad2ebc8f7abc838f21d2c286986b5ef1" },
			},
			response: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.IsComponentsV2,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: `Avatar di <@${exampleUser.id}>`,
						},
						{
							type: ComponentType.MediaGallery,
							items: [
								{
									media: {
										url: `https://cdn.discordapp.com/avatars/${exampleUser.id}/a_ad2ebc8f7abc838f21d2c286986b5ef1.gif?size=4096`,
									},
								},
							],
						},
					],
					allowed_mentions: { parse: [] },
				},
			},
		},
		{
			name: "Custom avatar with option",
			interaction: {
				type: InteractionType.ApplicationCommand,
				data: {
					...this.createChatInputData(),
					options: [
						{
							name: "user",
							type: ApplicationCommandOptionType.User,
							value: "597505862449496065",
						},
					],
					resolved: {
						users: {
							"597505862449496065": {
								...exampleUser,
								avatar: "ad2ebc8f7abc838f21d2c286986b5ef1",
							},
						},
					},
				},
				user: exampleUser,
			},
			response: {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.IsComponentsV2,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: `Avatar di <@597505862449496065>`,
						},
						{
							type: ComponentType.MediaGallery,
							items: [
								{
									media: {
										url: `https://cdn.discordapp.com/avatars/597505862449496065/ad2ebc8f7abc838f21d2c286986b5ef1.png?size=4096`,
									},
								},
							],
						},
					],
					allowed_mentions: { parse: [] },
				},
			},
		},
	];
	override chatInput(
		{ reply }: ChatInputReplies,
		{
			interaction,
			options: { user: userId },
			user,
		}: ChatInputArgs<typeof Avatar.chatInputData>,
	) {
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
	}
}
