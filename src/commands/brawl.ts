import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	InteractionResponseType,
	MessageFlags,
	Routes,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	type RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import {
	calculateFlags,
	createBrawlersComponents,
	createPlayerEmbed,
	getProfile,
	NotificationType,
	resolveCommandOptions,
	rest,
	type CommandOptions,
} from "../util";

const NOTIFICATION_TYPES = [
	"Brawler Tier Max",
	"New Brawler",
	"Trophy Road Advancement",
	"All",
] as const;

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
				{
					name: "profile",
					description: "Visualizza un profilo Brawl Stars",
					type: ApplicationCommandOptionType.SubcommandGroup,
					options: [
						{
							name: "view",
							description: "Vedi i dettagli di un giocatore!",
							type: ApplicationCommandOptionType.Subcommand,
							options: [
								{
									name: "tag",
									description:
										"Il tag giocatore (es. #8QJR0YC). Di default viene usato quello salvato",
									type: ApplicationCommandOptionType.String,
								},
							],
						},
						{
							name: "brawlers",
							description: "Vedi i brawler posseduti da un giocatore",
							type: ApplicationCommandOptionType.Subcommand,
							options: [
								{
									name: "tag",
									description:
										"Il tag giocatore (es. #8QJR0YC). Di default viene usato quello salvato",
									type: ApplicationCommandOptionType.String,
								},
							],
						},
					],
				},
			],
		},
	],
	run: async (reply, { interaction, env, host }) => {
		const { options, subcommand } = resolveCommandOptions(
			brawl.data,
			interaction,
		);
		const { id } = (interaction.member ?? interaction).user!;

		if (subcommand === "link") {
			reply({
				type: InteractionResponseType.DeferredChannelMessageWithSource,
				data: { flags: MessageFlags.Ephemeral },
			});
			const player = await getProfile(options.tag, env).catch((err) =>
				err instanceof Error
					? err
					: new Error(
							"Si è verificato un errore imprevisto! Riprova più tardi.",
						),
			);
			if (player instanceof Error) {
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content: player.message,
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
				return;
			}
			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: "Vuoi collegare questo profilo?",
						embeds: [createPlayerEmbed(player)],
						components: [
							new ActionRowBuilder<ButtonBuilder>()
								.addComponents(
									new ButtonBuilder()
										.setCustomId(`brawl-link-${player.tag}-${id}`)
										.setLabel("Collega")
										.setEmoji({ name: "🔗" })
										.setStyle(ButtonStyle.Primary),
									new ButtonBuilder()
										.setCustomId(`brawl-undo-${player.tag}-${id}`)
										.setLabel("Annulla")
										.setEmoji({ name: "✖️" })
										.setStyle(ButtonStyle.Danger),
								)
								.toJSON(),
						],
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
			return;
		}
		if (subcommand === "notify enable") {
			const result = await env.DB.prepare(
				`INSERT INTO Users (id, brawlNotifications)
				VALUES (?1, ?2)
				ON CONFLICT(id) DO UPDATE
				SET brawlNotifications = Users.brawlNotifications | ?2
				RETURNING brawlNotifications, brawlTag`,
			)
				.bind(id, NotificationType[options.type])
				.first<{ brawlNotifications: number; brawlTag: string | null }>();

			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content: `Notifiche abilitate per il tipo **${options.type}**!\nAttualmente hai attivato le notifiche per ${calculateFlags(result?.brawlNotifications)}.${!result?.brawlTag ? `\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando \`/brawl link\` per iniziare a ricevere le notifiche.` : ""}`,
				},
			});
			return;
		}
		if (subcommand === "notify disable") {
			const result = await env.DB.prepare(
				`UPDATE Users
				SET brawlNotifications = Users.brawlNotifications & ~?1
				WHERE id = ?2
				RETURNING brawlNotifications, brawlTag`,
			)
				.bind(NotificationType[options.type], id)
				.first<{ brawlNotifications: number; brawlTag: string | null }>();

			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content: `Notifiche disabilitate per il tipo **${options.type}**!\nAttualmente hai attivato le notifiche per ${calculateFlags(result?.brawlNotifications)}.${!result?.brawlTag ? `\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando \`/brawl link\` per iniziare a ricevere le notifiche.` : ""}`,
				},
			});
			return;
		}
		if (subcommand === "notify view") {
			const result = await env.DB.prepare(
				"SELECT brawlNotifications, brawlTag FROM Users WHERE id = ?",
			)
				.bind(id)
				.first<{ brawlNotifications: number; brawlTag: string | null }>();

			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content: `Notifiche attive per i seguenti tipi: ${calculateFlags(result?.brawlNotifications)}.${!result?.brawlTag ? `\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando \`/brawl link\` per iniziare a ricevere le notifiche.` : ""}`,
				},
			});
			return;
		}
		options.tag ??= (await env.DB.prepare(
			"SELECT brawlTag FROM Users WHERE id = ?",
		)
			.bind(id)
			.first("brawlTag"))!;
		if (!options.tag) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content:
						"Non hai ancora collegato un profilo Brawl Stars! Usa il comando `/brawl link` o specifica il tag giocatore come parametro.",
				},
			});
			return;
		}
		reply({ type: InteractionResponseType.DeferredChannelMessageWithSource });
		const player = await getProfile(options.tag, env).catch((err) =>
			err instanceof Error
				? err
				: new Error("Si è verificato un errore imprevisto! Riprova più tardi."),
		);
		if (player instanceof Error) {
			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: player.message,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
			return;
		}
		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: (subcommand === "profile view"
					? { embeds: [createPlayerEmbed(player)] }
					: {
							components: createBrawlersComponents(player, host, id),
							flags: MessageFlags.IsComponentsV2,
						}) satisfies RESTPostAPIWebhookWithTokenJSONBody,
			},
		);
	},
	component: async (reply, { interaction, env, host }) => {
		const [, action, tag, userId, arg] = interaction.data.custom_id.split("-");

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
		if (action === "link") {
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
			return;
		}
		if (action === "undo") {
			reply({
				type: InteractionResponseType.UpdateMessage,
				data: {
					content: "Azione annullata.",
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(`brawl-link`)
									.setLabel("Collega")
									.setDisabled(true)
									.setEmoji({ name: "🔗" })
									.setStyle(ButtonStyle.Primary),
								new ButtonBuilder()
									.setCustomId(interaction.data.custom_id)
									.setLabel("Annullato")
									.setDisabled(true)
									.setEmoji({ name: "✖️" })
									.setStyle(ButtonStyle.Danger),
							)
							.toJSON(),
					],
				},
			});
			return;
		}
		if (action === "brawlers") {
			reply({ type: InteractionResponseType.DeferredMessageUpdate });
			const player = await getProfile(tag!, env);

			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						components: createBrawlersComponents(
							player,
							host,
							userId,
							Number(arg) || 0,
						),
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
			return;
		}
	},
} as const satisfies CommandOptions<ApplicationCommandType.ChatInput>;
