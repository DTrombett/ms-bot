import type { APIEmbedField } from "discord-api-types/v10";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	GuildScheduledEventEntityType,
	PermissionFlagsBits,
} from "discord-api-types/v10";
import { escapeMarkdown } from "discord.js";
import ms from "ms";
import {
	createCommand,
	CustomClient,
	Emojis,
	normalizeError,
	sendError,
} from "../util";

export const command = createCommand({
	data: [
		{
			name: "invite",
			description:
				"Controlla i dettagli riguardo un invito al server o revocalo",
			type: ApplicationCommandType.ChatInput,
			default_member_permissions: String(PermissionFlagsBits.ManageGuild),
			options: [
				{
					name: "info",
					description: "Vedi i dettagli di un invito",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "invite",
							description: "L'invito da controllare (il codice o il link)",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
				{
					name: "revoke",
					description: "Revoca un invito",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "invite",
							description: "L'invito da revocare (il codice o il link)",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
			],
		},
	],
	async run(interaction) {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content:
					"Questo comando può essere usato solo all'interno di un server!",
				ephemeral: true,
			});
			return;
		}
		const { guild } = interaction;
		const invite = await guild.invites
			.fetch(interaction.options.getString("invite", true).split("/").at(-1)!)
			.catch(() => undefined);

		if (!invite) {
			await interaction.reply({
				content: "Invito non valido!",
			});
			return;
		}
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === "info") {
			const { inviter } = invite;
			const member = inviter ? guild.members.cache.get(inviter.id) : undefined;
			const fields: APIEmbedField[] = [
				{
					name: "Canale di arrivo",
					value:
						invite.channelId == null
							? "*Non specificato*"
							: `<#${invite.channelId}>`,
					inline: true,
				},
				{
					name: "Codice di invito",
					value: invite.code,
					inline: true,
				},
			];

			if (invite.uses != null)
				fields.push({
					name: "Utilizzi",
					value: `${invite.uses}`,
					inline: true,
				});
			if (invite.maxUses != null)
				fields.push({
					name: "Utilizzi massimi",
					value: `${invite.maxUses || "*Nessun limite*"}`,
					inline: true,
				});
			if (invite.createdTimestamp != null) {
				const createdAt = Math.round(invite.createdTimestamp / 1000);

				fields.push({
					name: "Creato",
					value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`,
					inline: true,
				});
			}
			if (invite.maxAge != null)
				fields.push({
					name: "Scadenza dopo",
					value: invite.maxAge ? ms(invite.maxAge * 1000) : "*Mai*",
					inline: true,
				});
			if (invite.guildScheduledEvent != null) {
				let value = `**${escapeMarkdown(
					invite.guildScheduledEvent.name
				)}** (<:location:${Emojis.location}> ${
					invite.guildScheduledEvent.entityType ===
					GuildScheduledEventEntityType.External
						? invite.guildScheduledEvent.entityMetadata?.location == null
							? "*Nessuna posizione*"
							: escapeMarkdown(
									invite.guildScheduledEvent.entityMetadata.location
							  )
						: invite.guildScheduledEvent.entityId == null
						? "*Nessun canale*"
						: `<#${invite.guildScheduledEvent.entityId}>`
				})`;

				if (invite.guildScheduledEvent.description != null) {
					const maxLength = 1023 - value.length;

					value += `\n${
						invite.guildScheduledEvent.description.length > maxLength
							? `${invite.guildScheduledEvent.description.slice(
									0,
									maxLength - 3
							  )}...`
							: invite.guildScheduledEvent.description
					}`;
				}
				fields.push({
					name: "Evento programmato",
					value,
					inline: true,
				});
			}
			if (invite.targetApplication?.name != null)
				fields.push({
					name: "Attività",
					value: `**${escapeMarkdown(invite.targetApplication.name)}**${
						invite.targetApplication.description == null
							? ""
							: `\n${invite.targetApplication.description.slice(0, 190)}`
					}`,
					inline: true,
				});
			if (invite.targetUser != null)
				fields.push({
					name: "Utente in streaming",
					value: `<@${invite.targetUser.id}> (${invite.targetUser.tag})`,
					inline: true,
				});
			if (invite.temporary != null)
				fields.push({
					name: "Unione temporanea",
					value: invite.temporary ? "Sì" : "No",
					inline: true,
				});
			await interaction.reply({
				embeds: [
					{
						author: inviter
							? {
									name: inviter.tag,
									icon_url: (member ?? inviter).displayAvatarURL({
										extension: "png",
										size: 4096,
									}),
									url: `https://discord.com/users/${inviter.id}`,
							  }
							: undefined,
						color: inviter?.accentColor ?? member?.roles.color?.color,
						footer: invite.expiresAt
							? {
									text: "Scadenza",
							  }
							: undefined,
						timestamp: invite.expiresAt?.toISOString(),
						thumbnail:
							guild.icon == null
								? undefined
								: {
										url: guild.iconURL({
											extension: "png",
											size: 4096,
										})!,
								  },
						image:
							guild.splash == null
								? undefined
								: {
										url: guild.splashURL({
											extension: "png",
											size: 4096,
										})!,
								  },
						url: invite.url,
						fields: fields.slice(0, 25),
					},
				],
				components: [
					{
						components: [
							{
								type: ComponentType.Button,
								style: ButtonStyle.Link,
								label: "Apri nell'app",
								url: `discord://-/invite/${invite.code}`,
							},
						],
						type: ComponentType.ActionRow,
					},
				],
			});
			return;
		}
		if (subcommand === "revoke") {
			if (!invite.deletable) {
				await interaction.reply({
					content: "Non ho abbastanza permessi per revocare questo invito!",
					ephemeral: true,
				});
				return;
			}
			const [error] = await Promise.all([
				invite
					.delete()
					.then(() => undefined)
					.catch(normalizeError),
				interaction.deferReply().catch(CustomClient.printToStderr),
			]);

			if (error) {
				await sendError(interaction, error);
				return;
			}
			await interaction.editReply({
				content: "Invito revocato con successo!",
			});
		}
	},
});
