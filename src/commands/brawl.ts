import {
	ActionRowBuilder,
	bold,
	ButtonBuilder,
	EmbedBuilder,
} from "@discordjs/builders";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	InteractionResponseType,
	MessageFlags,
	Routes,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
} from "discord-api-types/v10";
import { resolveCommandOptions, rest, type CommandOptions } from "../util";
import type { Player } from "../util/brawlTypes";

const NOTIFICATION_TYPES = [
	"Brawler Tier Max",
	"Ranked Tier Up",
	"New Brawler",
	"Trophy Road Advancement",
	"All",
] as const;
const roboRumbleLevels = [
	"*None*",
	"Normale",
	"Difficile",
	"Esperto",
	"Master",
	"Smodata",
	"Smodata II",
	"Smodata III",
	"Smodata IV",
	"Smodata V",
	"Smodata VI",
	"Smodata VII",
	"Smodata VIII",
	"Smodata IX",
	"Smodata X",
	"Smodata XI",
	"Smodata XII",
	"Smodata XIII",
	"Smodata XIV",
	"Smodata XV",
	"Smodata XVI",
];

export const brawl = {
	data: [
		{
			name: "brawl",
			description: "Interagisci con Brawl Stars!",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "link",
					description: "Collega il tuo profilo di Brawl Stars",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "tag",
							description: "Il tuo tag giocatore di Brawl Stars (es. #8QJR0YC)",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
				{
					name: "notify",
					description: "Gestisci le notifiche per il tuo profilo Brawl Stars",
					type: ApplicationCommandOptionType.SubcommandGroup,
					options: [
						{
							name: "enable",
							description: "Abilita un tipo di notifica",
							type: ApplicationCommandOptionType.Subcommand,
							options: [
								{
									name: "type",
									description: "Tipo di notifica da abilitare",
									type: ApplicationCommandOptionType.String,
									required: true,
									choices: NOTIFICATION_TYPES.map((type) => ({
										name: type,
										value: type,
									})),
								},
							],
						},
						{
							name: "disable",
							description: "Disabilita un tipo di notifica",
							type: ApplicationCommandOptionType.Subcommand,
							options: [
								{
									name: "type",
									description: "Tipo di notifica da disabilitare",
									type: ApplicationCommandOptionType.String,
									required: true,
									choices: NOTIFICATION_TYPES.map((type) => ({
										name: type,
										value: type,
									})),
								},
							],
						},
						{
							name: "view",
							description: "Visualizza le impostazioni di notifica",
							type: ApplicationCommandOptionType.Subcommand,
						},
					],
				},
			],
		},
	],
	run: async (reply, { interaction, env }) => {
		const { options, subcommand } = resolveCommandOptions(
			brawl.data,
			interaction,
		);

		if (subcommand === "link") {
			let tag = options.tag.toUpperCase().replace(/O/g, "0");

			if (!tag.startsWith("#")) tag = `#${tag}`;
			if (!/^#[0289PYLQGRJCUV]{2,14}$/.test(tag)) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: MessageFlags.Ephemeral,
						content: "Tag giocatore non valido.",
					},
				});
				return;
			}
			reply({ type: InteractionResponseType.DeferredChannelMessageWithSource });
			const res = await fetch(
				`https://api.brawlstars.com/v1/players/${encodeURIComponent(tag)}`,
				{
					headers: {
						Authorization: `Bearer ${env.BRAWL_STARS_API_TOKEN}`,
					},
				},
			);
			if (res.status === 404) {
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content: "Tag giocatore non trovato.",
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
				return;
			}
			if (res.status !== 200) {
				console.log(res.status, res.statusText, await res.text());
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content:
								"Si è verificato un errore imprevisto! Riprova più tardi.",
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
				return;
			}
			const player = await res.json<Player>();
			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: "Vuoi collegare questo profilo?",
						embeds: [
							new EmbedBuilder()
								.setTitle(`${player.name} (${player.tag})`)
								.setThumbnail(
									`https://cdn.brawlify.com/profile-icons/regular/${player.icon.id}.png`,
								)
								.setColor(
									player.nameColor
										? parseInt(player.nameColor.slice(4), 16)
										: 0xffffff,
								)
								.setDescription(
									`Brawlers: **${player.brawlers.length}**\nClub: ${
										player.club.tag
											? `**${player.club.name}** (${player.club.tag})`
											: "*In nessun club*"
									}`,
								)
								.addFields(
									{
										name: "🏆 Trofei",
										value: `${bold("Attuali")}: ${player.trophies}\n${bold("Record")}: ${player.highestTrophies}`,
										inline: true,
									},
									{
										name: "🏅 Vittorie",
										value: `${bold("3v3")}: ${player["3vs3Victories"]}\n${bold("Solo")}: ${player.soloVictories}\n${bold("Duo")}: ${player.duoVictories}`,
										inline: true,
									},
									{
										name: "📊 Altre statistiche",
										value: `${bold("Robo Rumble")}: ${roboRumbleLevels[player.bestRoboRumbleTime]}\n${bold("Big Game")}: ${roboRumbleLevels[player.bestTimeAsBigBrawler]}`,
										inline: true,
									},
								)
								.toJSON(),
						],
						components: [
							new ActionRowBuilder<ButtonBuilder>()
								.addComponents(
									new ButtonBuilder()
										.setCustomId(
											`brawl-link-${player.tag}-${(interaction.member ?? interaction).user!.id}`,
										)
										.setLabel("Collega")
										.setEmoji({ name: "🔗" })
										.setStyle(ButtonStyle.Primary),
								)
								.toJSON(),
						],
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		}
	},
	component: async (reply, { interaction, env }) => {
		const [, action, tag, userId] = interaction.data.custom_id.split("-");

		if (action === "link") {
			if ((interaction.member ?? interaction).user!.id !== userId) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: MessageFlags.Ephemeral,
						content: "Questa azione non è per te!",
					},
				});
				return;
			}
			await env.DB.prepare(
				"INSERT INTO Users (id, brawlTag) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET brawlTag = excluded.brawlTag",
			)
				.bind(userId, tag)
				.run();
			reply({
				type: InteractionResponseType.UpdateMessage,
				data: {
					content: "Profilo collegato con successo!",
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setLabel("Collegato")
									.setCustomId(interaction.data.custom_id)
									.setEmoji({ name: "🔗" })
									.setDisabled(true)
									.setStyle(ButtonStyle.Success),
							)
							.toJSON(),
					],
				},
			});
		}
	},
} as const satisfies CommandOptions<ApplicationCommandType.ChatInput>;
