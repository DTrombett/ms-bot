import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	Routes,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	type RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import {
	BrawlerOrder,
	calculateFlags,
	createBrawlerComponents,
	createBrawlersComponents,
	createPlayerEmbed,
	getProfile,
	NotificationType,
} from "../util/brawl.ts";
import { rest } from "../util/rest.ts";

const NOTIFICATION_TYPES = [
	"Brawler Tier Max",
	"New Brawler",
	"Trophy Road Advancement",
	"All",
] as const;

export class Brawl extends Command {
	static override chatInputData = {
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
							{
								name: "order",
								description: "Come ordinare i brawler (default. Nome)",
								type: ApplicationCommandOptionType.Number,
								choices: [
									{ name: "Nome", value: BrawlerOrder.Name },
									{ name: "Più Trofei", value: BrawlerOrder.MostTrophies },
									{ name: "Meno Trofei", value: BrawlerOrder.LeastTrophies },
									{ name: "Livello", value: BrawlerOrder.PowerLevel },
								],
							},
						],
					},
				],
			},
		],
	} as const satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	static override async chatInput(
		{ reply, defer }: ChatInputReplies,
		{
			interaction,
			options,
			subcommand,
			user: { id },
			request,
		}: ChatInputArgs<typeof Brawl.chatInputData>,
	) {
		if (subcommand === "link") {
			defer({ flags: MessageFlags.Ephemeral });
			const player = await getProfile(options.tag).catch((err) =>
				err instanceof Error
					? err
					: new Error(
							"Si è verificato un errore imprevisto! Riprova più tardi.",
						),
			);

			if (player instanceof Error)
				return rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content: player.message,
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
			return rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: "Vuoi collegare questo profilo?",
						embeds: [createPlayerEmbed(player)],
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										custom_id: `brawl-link-${player.tag}-${id}`,
										label: "Collega",
										emoji: { name: "🔗" },
										style: ButtonStyle.Primary,
									},
									{
										type: ComponentType.Button,
										custom_id: `brawl-undo-${player.tag}-${id}`,
										label: "Annulla",
										emoji: { name: "✖️" },
										style: ButtonStyle.Danger,
									},
								],
							},
						],
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
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

			return reply({
				flags: MessageFlags.Ephemeral,
				content: `Notifiche abilitate per il tipo **${options.type}**!\nAttualmente hai attivato le notifiche per ${calculateFlags(result?.brawlNotifications)}.${!result?.brawlTag ? `\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando \`/brawl link\` per iniziare a ricevere le notifiche.` : ""}`,
			});
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

			return reply({
				flags: MessageFlags.Ephemeral,
				content: `Notifiche disabilitate per il tipo **${options.type}**!\nAttualmente hai attivato le notifiche per ${calculateFlags(result?.brawlNotifications)}.${!result?.brawlTag ? `\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando \`/brawl link\` per iniziare a ricevere le notifiche.` : ""}`,
			});
		}
		if (subcommand === "notify view") {
			const result = await env.DB.prepare(
				"SELECT brawlNotifications, brawlTag FROM Users WHERE id = ?",
			)
				.bind(id)
				.first<{ brawlNotifications: number; brawlTag: string | null }>();

			return reply({
				flags: MessageFlags.Ephemeral,
				content: `Notifiche attive per i seguenti tipi: ${calculateFlags(result?.brawlNotifications)}.${!result?.brawlTag ? `\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando \`/brawl link\` per iniziare a ricevere le notifiche.` : ""}`,
			});
		}
		options.tag ??= (await env.DB.prepare(
			"SELECT brawlTag FROM Users WHERE id = ?",
		)
			.bind(id)
			.first("brawlTag"))!;
		if (!options.tag)
			return reply({
				flags: MessageFlags.Ephemeral,
				content:
					"Non hai ancora collegato un profilo Brawl Stars! Usa il comando `/brawl link` o specifica il tag giocatore come parametro.",
			});
		defer();
		const player = await getProfile(options.tag).catch((err) =>
			err instanceof Error
				? err
				: new Error("Si è verificato un errore imprevisto! Riprova più tardi."),
		);
		if (player instanceof Error)
			return rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: player.message,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		return rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: (subcommand === "profile view"
					? {
							embeds: [createPlayerEmbed(player)],
							components: [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.Button,
											custom_id: `brawl-brawlers-${player.tag}-${id}---1`,
											label: "Brawlers",
											emoji: { name: "🔫" },
											style: ButtonStyle.Primary,
										},
									],
								},
							],
						}
					: {
							components: createBrawlersComponents(
								player,
								new URL(request.url).host,
								id,
								options.order,
							),
							flags: MessageFlags.IsComponentsV2,
						}) satisfies RESTPostAPIWebhookWithTokenJSONBody,
			},
		);
	}
	static override async component(
		{ reply, update, defer, deferUpdate }: ComponentReplies,
		{
			interaction,
			request,
			args: [action, tag, userId, arg1, arg2, arg3],
			user: { id },
		}: ComponentArgs,
	) {
		if (id !== userId)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "Questa azione non è per te!",
			});
		if (action === "link") {
			await env.DB.prepare(
				"INSERT INTO Users (id, brawlTag) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET brawlTag = excluded.brawlTag",
			)
				.bind(userId, tag)
				.run();
			return update({
				content: "Profilo collegato con successo!",
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: interaction.data.custom_id,
								label: "Collegato",
								emoji: { name: "🔗" },
								disabled: true,
								style: ButtonStyle.Success,
							},
						],
					},
				],
			});
		}
		if (action === "undo")
			return update({
				content: "Azione annullata.",
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `brawl-link`,
								label: "Collega",
								disabled: true,
								emoji: { name: "🔗" },
								style: ButtonStyle.Primary,
							},
							{
								type: ComponentType.Button,
								custom_id: interaction.data.custom_id,
								label: "Annullato",
								disabled: true,
								emoji: { name: "✖️" },
								style: ButtonStyle.Danger,
							},
						],
					},
				],
			});
		if (action === "brawlers") {
			if (arg3) defer();
			else deferUpdate();
			const player = await getProfile(tag!);

			return rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						components: createBrawlersComponents(
							player,
							new URL(request.url).host,
							userId,
							Number(
								interaction.data.component_type === ComponentType.StringSelect
									? interaction.data.values[0]
									: arg1,
							) || undefined,
							Number(arg2) || undefined,
						),
						flags: MessageFlags.IsComponentsV2,
					} satisfies RESTPostAPIWebhookWithTokenJSONBody,
				},
			);
		}
		if (action === "brawler") {
			deferUpdate();
			const player = await getProfile(tag!);
			const brawlerId = Number(arg1);

			return rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						components: createBrawlerComponents(
							player,
							userId,
							player.brawlers.find((b) => b.id === brawlerId)!,
							Number(arg2) || undefined,
							Number(arg3) || undefined,
						),
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		}
		return;
	}
}
