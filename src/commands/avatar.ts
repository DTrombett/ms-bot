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
import { createCommand } from "../util";

export const avatar = createCommand({
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
	async run({ interaction }, resolve) {
		const userId = interaction.data.options?.find(
			(o): o is APIApplicationCommandInteractionDataUserOption =>
				o.name === "user" && o.type === ApplicationCommandOptionType.User,
		)?.value;
		const user =
			userId == null
				? interaction.user ?? interaction.member?.user
				: interaction.data.resolved?.users?.[userId];

		if (!user) {
			resolve({
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
					? this.api.cdn.defaultAvatar(
							user.discriminator === "0"
								? Number(BigInt(user.id) >> 22n) % 6
								: Number(user.discriminator) % 5,
						)
					: this.api.cdn.avatar(user.id, user.avatar, {
							size: 4096,
							extension: "png",
						})
				: this.api.cdn.guildMemberAvatar(
						interaction.guild_id!,
						user.id,
						member.avatar,
						{
							size: 4096,
							extension: "png",
						},
					);

		resolve({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Avatar di **[${escapeMarkdown(
					member?.nick ?? user.global_name ?? user.username,
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
			},
		});
	},
});
