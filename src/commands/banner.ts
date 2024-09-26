import { escapeMarkdown } from "@discordjs/formatters";
import {
	APIApplicationCommandInteractionDataUserOption,
	APIUser,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
	Routes,
} from "discord-api-types/v10";
import { Command, rest } from "../util";

export const banner = new Command({
	data: [
		{
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
		},
	],
	run: async (reply, { interaction }) => {
		const userId = interaction.data.options?.find(
			(o): o is APIApplicationCommandInteractionDataUserOption =>
				o.name === "user" && o.type === ApplicationCommandOptionType.User,
		)?.value;
		const user =
			userId == null
				? (interaction.user ?? interaction.member?.user)
				: interaction.data.resolved?.users?.[userId];

		if (!user) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { flags: MessageFlags.Ephemeral, content: "Utente non trovato!" },
			});
			return;
		}
		const bannerHash =
			user.banner === undefined
				? ((await rest.get(Routes.user(user.id))) as APIUser).banner
				: user.banner;

		if (bannerHash == null) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "L'utente non ha un banner!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const url = rest.cdn.banner(user.id, bannerHash, {
			size: 4096,
			extension: "png",
		});

		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Banner di **[${escapeMarkdown(user.username)}](${url} )**:`,
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
