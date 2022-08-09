import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	ThreadAutoArchiveDuration,
	VideoQualityMode,
} from "discord-api-types/v10";
import type {
	GuildBasedChannel,
	GuildChannelCreateOptions,
	GuildChannelEditOptions,
} from "discord.js";
import { escapeMarkdown } from "discord.js";
import ms from "ms";
import type { ReceivedInteraction } from "../util";
import {
	capitalize,
	createCommand,
	formatBytes,
	normalizeError,
	sendError,
} from "../util";

const channelInfo = async (
	channel: GuildBasedChannel,
	interaction: ReceivedInteraction<"cached">,
	ephemeral?: boolean
) => {
	const createdAt =
		channel.createdTimestamp != null
			? Math.round(channel.createdTimestamp / 1000)
			: 0;
	const lastPinTimestamp =
		"lastPinTimestamp" in channel && channel.lastPinTimestamp != null
			? Math.round(channel.lastPinTimestamp / 1000)
			: 0;
	const archiveTimestamp =
		"archiveTimestamp" in channel && channel.archiveTimestamp != null
			? Math.round(channel.archiveTimestamp / 1000)
			: 0;
	const fields = [
		{
			name: "ID",
			value: channel.id,
			inline: true,
		},
		{
			name: "Tipo",
			value: ChannelType[channel.type],
			inline: true,
		},
		{
			name: "NSFW",
			value: "nsfw" in channel && channel.nsfw ? "Sì" : "No",
			inline: true,
		},
		{
			name: "Slowmode",
			value:
				"rateLimitPerUser" in channel && channel.rateLimitPerUser!
					? ms(channel.rateLimitPerUser * 1000)
					: "*Non attivo*",
			inline: true,
		},
		{
			name: "Ultimo messaggio attaccato",
			value: lastPinTimestamp
				? `<t:${lastPinTimestamp}:F> (<t:${lastPinTimestamp}:R>)`
				: "*Nessun messaggio attaccato*",
			inline: true,
		},
		{
			name: "Creato",
			value: createdAt
				? `<t:${createdAt}:F> (<t:${createdAt}:R>)`
				: "*Non disponibile*",
			inline: true,
		},
	];

	if ("position" in channel)
		fields.push({
			name: "Posizione",
			value: `${channel.position + 1}`,
			inline: true,
		});
	if ("bitrate" in channel)
		fields.push({
			name: "Bitrate",
			value: `${formatBytes(channel.bitrate, 1000, false).toLowerCase()}ps`,
			inline: true,
		});
	if ("userLimit" in channel)
		fields.push({
			name: "Limite utenti",
			value: `${channel.userLimit || "*Nessun limite*"}`,
			inline: true,
		});
	if ("parentId" in channel && channel.parentId != null)
		fields.push({
			name: "Categoria",
			value: `<#${channel.parentId}>`,
			inline: true,
		});
	if ("rtcRegion" in channel)
		fields.push({
			name: "Regione",
			value: capitalize(channel.rtcRegion ?? "*Automatica*"),
			inline: true,
		});
	if ("videoQualityMode" in channel)
		fields.push({
			name: "Qualità video",
			value:
				channel.videoQualityMode === VideoQualityMode.Full ? "720p" : "Auto",
			inline: true,
		});
	if ("messageCount" in channel && channel.messageCount != null)
		fields.push({
			name: "Messaggi",
			value: `${channel.messageCount >= 50 ? "50+" : channel.messageCount}`,
			inline: true,
		});
	if ("memberCount" in channel && channel.memberCount != null)
		fields.push({
			name: "Membri",
			value: `${channel.memberCount >= 50 ? "50+" : channel.memberCount}`,
			inline: true,
		});
	if ("defaultAutoArchiveDuration" in channel)
		fields.push({
			name: "Durata di autoarchiviazione dei thread predefinita",
			value:
				channel.defaultAutoArchiveDuration == null
					? "*Non attiva*"
					: ms(channel.defaultAutoArchiveDuration * 60 * 1000),
			inline: true,
		});
	if ("archived" in channel)
		fields.push({
			name: "Archiviato",
			value: channel.archived! ? "Sì" : "No",
			inline: true,
		});
	if ("autoArchiveDuration" in channel)
		fields.push({
			name: "Autoarchiviazione dopo",
			value:
				channel.autoArchiveDuration == null
					? "*Non attiva*"
					: ms(channel.autoArchiveDuration * 60 * 1000),
			inline: true,
		});
	if (archiveTimestamp)
		fields.push({
			name:
				"archived" in channel
					? channel.archived!
						? "Archiviato"
						: "Aperto"
					: "Archiviato/Aperto",
			value: `<t:${archiveTimestamp}:F> (<t:${archiveTimestamp}:R>)`,
			inline: true,
		});
	if ("locked" in channel)
		fields.push({
			name: "Bloccato",
			value: channel.locked! ? "Sì" : "No",
			inline: true,
		});
	if ("invitable" in channel && channel.invitable != null)
		fields.push({
			name: "Si può invitare",
			value: channel.invitable ? "Sì" : "No",
			inline: true,
		});
	await interaction.reply({
		embeds: [
			{
				url: channel.url,
				title: `#${channel.name}`,
				author: {
					name: channel.guild.name,
					icon_url:
						channel.guild.iconURL({ extension: "png", size: 4096 }) ??
						undefined,
					url: `https://discord.com/channels/${channel.guildId}`,
				},
				color:
					interaction.user.accentColor ?? interaction.member.roles.color?.color,
				description:
					"topic" in channel && channel.topic!
						? `>>> ${channel.topic}`
						: undefined,
				footer: {
					text: "Ultimo aggiornamento",
				},
				timestamp: new Date().toISOString(),
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
						url: `discord://-/channels/${channel.guildId}/${channel.id}`,
					},
				],
				type: ComponentType.ActionRow,
			},
		],
		ephemeral,
	});
};

const autoArchiveChoices: { name: string; value: ThreadAutoArchiveDuration }[] =
	[];
const videoQualityChoices: { name: string; value: VideoQualityMode }[] = [];
const channelTypeChoices: { name: string; value: ChannelType }[] = [];
const regions = [
	{ name: "Brazil", value: "brazil" },
	{ name: "Hong Kong", value: "hongkong" },
	{ name: "India", value: "india" },
	{ name: "Japan", value: "japan" },
	{ name: "Rotterdam", value: "rotterdam" },
	{ name: "Russia", value: "russia" },
	{ name: "Singapore", value: "singapore" },
	{ name: "South Korea", value: "south-korea" },
	{ name: "South Africa", value: "southafrica" },
	{ name: "Sydney", value: "sydney" },
	{ name: "US Central", value: "us-central" },
	{ name: "US East", value: "us-east" },
	{ name: "US South", value: "us-south" },
	{ name: "US West", value: "us-west" },
];

for (const [name, value] of Object.entries(ThreadAutoArchiveDuration))
	if (typeof value === "number") autoArchiveChoices.push({ name, value });
for (const [name, value] of Object.entries(VideoQualityMode))
	if (typeof value === "number") videoQualityChoices.push({ name, value });
for (const [name, value] of Object.entries(ChannelType))
	if (typeof value === "number" && [0, 2, 4, 5, 6, 13, 14, 15].includes(value))
		channelTypeChoices.push({ name: name.slice(5), value });

export const command = createCommand({
	data: [
		{
			name: "channel",
			description: "Gestisci i canali",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "edit",
					description: "Modifica un canale",
					options: [
						{
							name: "name",
							description: "Il nuovo nome",
							type: ApplicationCommandOptionType.String,
							min_length: 1,
							max_length: 100,
						},
						{
							name: "type",
							description: "Il nuovo tipo",
							type: ApplicationCommandOptionType.Number,
							choices: [
								{
									name: "Canale di testo",
									value: ChannelType.GuildText,
								},
								{ name: "Canale annunci", value: ChannelType.GuildNews },
							],
						},
						{
							name: "position",
							description: "La nuova posizione",
							type: ApplicationCommandOptionType.Number,
							min_value: 1,
						},
						{
							name: "topic",
							description: "Il nuovo argomento canale",
							type: ApplicationCommandOptionType.String,
							min_length: 0,
							max_length: 1024,
						},
						{
							name: "nsfw",
							description: "Il nuovo stato NSFW",
							type: ApplicationCommandOptionType.Boolean,
						},
						{
							name: "bitrate",
							description:
								"Il nuovo bitrate in kbps (applicabile solo per i canali vocali)",
							type: ApplicationCommandOptionType.Number,
							min_value: 8,
							max_value: 96,
						},
						{
							name: "user-limit",
							description:
								"Il nuovo limite utenti (0 per rimuoverlo) (applicabile solo per i canali vocali)",
							type: ApplicationCommandOptionType.Number,
							min_value: 0,
							max_value: 99,
						},
						{
							name: "parent",
							description: "La nuova categoria",
							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildCategory],
						},
						{
							name: "slowmode",
							description: "Il nuovo slowmode (0 per disattivare)",
							type: ApplicationCommandOptionType.String,
						},
						{
							name: "lock-permissions",
							description: "Se sincronizzare i permessi con la categoria",
							type: ApplicationCommandOptionType.Boolean,
						},
						{
							name: "autoarchive",
							description:
								"Il tempo di inattività dopo il quale i nuovi thread saranno archiviati",
							type: ApplicationCommandOptionType.Number,
							choices: autoArchiveChoices,
						},
						{
							name: "rtc-region",
							description:
								"La nuova regione RTC (applicabile solo per i canali vocali)",
							type: ApplicationCommandOptionType.String,
							choices: [{ name: "Automatico", value: "auto" }, ...regions],
						},
						{
							name: "video-quality",
							description:
								"La nuova qualità video (applicabile solo per i canali vocali)",
							type: ApplicationCommandOptionType.Number,
							choices: videoQualityChoices,
						},
						{
							name: "reason",
							description: "Il motivo della modifica del canale",
							type: ApplicationCommandOptionType.String,
							max_length: 512,
						},
						{
							name: "channel",
							description: "Il canale da modificare (default: questo canale)",
							type: ApplicationCommandOptionType.Channel,
						},
					],
				},
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "info",
					description: "Mostra le informazioni sul canale",
					options: [
						{
							name: "channel",
							description: "Il canale da mostrare (default: questo canale)",
							type: ApplicationCommandOptionType.Channel,
						},
					],
				},
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "delete",
					description: "Elimina il canale",
					options: [
						{
							name: "channel",
							description: "Il canale da eliminare",
							type: ApplicationCommandOptionType.Channel,
							required: true,
						},
						{
							name: "reason",
							description: "Il motivo della cancellazione del canale",
							type: ApplicationCommandOptionType.String,
							max_length: 512,
						},
					],
				},
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "clone",
					description: "Clona un canale",
					options: [
						{
							name: "channel",
							description: "Il canale da clonare (default: questo canale)",
							type: ApplicationCommandOptionType.Channel,
						},
						{
							name: "reason",
							description: "Il motivo della clonazione del canale",
							type: ApplicationCommandOptionType.String,
							max_length: 512,
						},
					],
				},
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "create",
					description: "Crea un canale",
					options: [
						{
							name: "name",
							description: "Il nome del canale",
							type: ApplicationCommandOptionType.String,
							min_length: 1,
							max_length: 100,
							required: true,
						},
						{
							name: "type",
							description: "Il tipo",
							type: ApplicationCommandOptionType.Number,
							choices: channelTypeChoices,
						},
						{
							name: "position",
							description: "La posizione del canale",
							type: ApplicationCommandOptionType.Number,
							min_value: 1,
						},
						{
							name: "topic",
							description: "L'argomento canale",
							type: ApplicationCommandOptionType.String,
							min_length: 0,
							max_length: 1024,
						},
						{
							name: "nsfw",
							description: "Lo stato NSFW",
							type: ApplicationCommandOptionType.Boolean,
						},
						{
							name: "bitrate",
							description:
								"Il bitrate in kbps (applicabile solo per i canali vocali)",
							type: ApplicationCommandOptionType.Number,
							min_value: 8,
							max_value: 96,
						},
						{
							name: "user-limit",
							description:
								"Il limite utenti (applicabile solo per i canali vocali)",
							type: ApplicationCommandOptionType.Number,
							min_value: 0,
							max_value: 99,
						},
						{
							name: "parent",
							description: "La categoria",
							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildCategory],
						},
						{
							name: "slowmode",
							description: "Lo slowmode",
							type: ApplicationCommandOptionType.String,
						},
						{
							name: "autoarchive",
							description:
								"Il tempo di inattività dopo il quale i nuovi thread saranno archiviati",
							type: ApplicationCommandOptionType.Number,
							choices: autoArchiveChoices,
						},
						{
							name: "rtc-region",
							description:
								"La regione RTC (applicabile solo per i canali vocali)",
							type: ApplicationCommandOptionType.String,
							choices: regions,
						},
						{
							name: "video-quality",
							description:
								"La qualità video (applicabile solo per i canali vocali)",
							type: ApplicationCommandOptionType.Number,
							choices: videoQualityChoices,
						},
						{
							name: "reason",
							description: "Il motivo della creazione del canale",
							type: ApplicationCommandOptionType.String,
							max_length: 512,
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
		const [{ options }] = interaction.options.data;

		if (!options) {
			await interaction.reply({
				content: "Questo comando non è attualmente disponibile!",
				ephemeral: true,
			});
			return;
		}
		if (interaction.options.data[0].name === "edit") {
			const { guild } = interaction;
			const editOptions: GuildChannelEditOptions = {};
			let { channel }: { channel: GuildBasedChannel | null } = interaction;

			for (const option of options)
				if (option.name === "name") {
					if (typeof option.value === "string") editOptions.name = option.value;
				} else if (option.name === "type") {
					if (typeof option.value === "number") editOptions.type = option.value;
				} else if (option.name === "position") {
					if (typeof option.value === "number")
						editOptions.position = option.value - 1;
				} else if (option.name === "topic") {
					if (typeof option.value === "string")
						editOptions.topic = option.value;
				} else if (option.name === "nsfw") {
					if (typeof option.value === "boolean")
						editOptions.nsfw = option.value;
				} else if (option.name === "bitrate") {
					if (typeof option.value === "number")
						editOptions.bitrate = option.value;
				} else if (option.name === "user-limit") {
					if (typeof option.value === "number")
						editOptions.userLimit = option.value;
				} else if (option.name === "parent") {
					if (option.channel?.type === ChannelType.GuildCategory)
						editOptions.parent = option.channel.id;
				} else if (option.name === "slowmode") {
					if (typeof option.value === "string")
						editOptions.rateLimitPerUser = Math.round(ms(option.value) / 1000);
				} else if (option.name === "lock-permissions") {
					if (typeof option.value === "boolean")
						editOptions.lockPermissions = option.value;
				} else if (option.name === "autoarchive") {
					if (typeof option.value === "number")
						editOptions.defaultAutoArchiveDuration = option.value;
				} else if (option.name === "rtc-region") {
					if (typeof option.value === "string")
						editOptions.rtcRegion =
							option.value === "auto" ? null : option.value;
				} else if (option.name === "video-quality") {
					if (typeof option.value === "number")
						editOptions.videoQualityMode = option.value;
				} else if (option.name === "reason") {
					if (typeof option.value === "string")
						editOptions.reason = option.value;
				} else if (option.name === "channel" && option.channel)
					channel =
						"client" in option.channel
							? option.channel
							: guild.channels.cache.get(option.channel.id) ?? null;
			if (!channel) {
				await interaction.reply({
					content: "Canale non valido!",
					ephemeral: true,
				});
				return;
			}
			if (
				guild.ownerId !== interaction.user.id &&
				!(
					channel.id === interaction.channelId
						? interaction.memberPermissions
						: channel.permissionsFor(interaction.member)
				).has("ManageChannels")
			) {
				await interaction.reply({
					content:
						"Hai bisogno del permesso **Gestisci canali** per usare questo comando!",
					ephemeral: true,
				});
				return;
			}
			if (
				Object.keys(editOptions).length - (editOptions.reason! ? 1 : 0) ===
				0
			) {
				await interaction.reply({
					content: "Non hai specificato alcuna modifica!",
					ephemeral: true,
				});
				return;
			}
			if (
				editOptions.rateLimitPerUser !== undefined &&
				(isNaN(editOptions.rateLimitPerUser) ||
					editOptions.rateLimitPerUser < 0 ||
					editOptions.rateLimitPerUser > 21_600)
			) {
				await interaction.reply({
					content:
						"Il valore della slowmode non è valido o non è minore di 6 ore!",
					ephemeral: true,
				});
				return;
			}
			if (!channel.manageable) {
				await interaction.reply({
					content: "Non ho abbastanza permessi per gestire questo canale!",
					ephemeral: true,
				});
				return;
			}
			const result = await guild.channels
				.edit(channel, editOptions)
				.catch(normalizeError);

			if (result instanceof Error) {
				await sendError(interaction, result);
				return;
			}
			await interaction.reply({
				content: `Canale ${channel.toString()} modificato con successo!\n\nMotivo: ${
					editOptions.reason ?? "*Nessun motivo*"
				}`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `channel-i-${channel.id}`,
								label: "Info",
								style: ButtonStyle.Success,
								emoji: { name: "ℹ️" },
							},
						],
					},
				],
			});
			return;
		}
		if (interaction.options.data[0].name === "delete") {
			const { guild } = interaction;
			let channel: GuildBasedChannel | undefined;
			let reason: string | undefined;

			for (const option of options)
				if (option.name === "reason") {
					if (typeof option.value === "string") reason = option.value;
				} else if (option.name === "channel" && option.channel)
					channel =
						"client" in option.channel
							? option.channel
							: guild.channels.cache.get(option.channel.id);
			if (!channel) {
				await interaction.reply({
					content: "Canale non valido!",
					ephemeral: true,
				});
				return;
			}
			if (
				guild.ownerId !== interaction.user.id &&
				!channel.permissionsFor(interaction.member).has("ManageChannels")
			) {
				await interaction.reply({
					content:
						"Hai bisogno del permesso **Gestisci canali** per usare questo comando!",
					ephemeral: true,
				});
				return;
			}
			if (!channel.manageable) {
				await interaction.reply({
					content: "Non ho abbastanza permessi per eliminare questo canale!",
					ephemeral: true,
				});
				return;
			}
			const result = await guild.channels
				.delete(channel, reason)
				.catch(normalizeError);

			if (result instanceof Error) {
				await sendError(interaction, result);
				return;
			}
			await interaction.reply({
				content: `Canale **${escapeMarkdown(
					channel.name
				)}** eliminato con successo!\n\nMotivo: ${reason ?? "*Nessun motivo*"}`,
			});
			return;
		}
		if (interaction.options.data[0].name === "clone") {
			const { guild } = interaction;

			if (
				guild.ownerId !== interaction.user.id &&
				!interaction.member.permissions.has("ManageChannels")
			) {
				await interaction.reply({
					content:
						"Hai bisogno del permesso **Gestisci canali** per usare questo comando!",
					ephemeral: true,
				});
				return;
			}
			let { channel }: { channel: GuildBasedChannel | null } = interaction;
			let reason: string | undefined;

			for (const option of options)
				if (option.name === "reason") {
					if (typeof option.value === "string") reason = option.value;
				} else if (option.name === "channel" && option.channel)
					channel =
						"client" in option.channel
							? option.channel
							: guild.channels.cache.get(option.channel.id) ?? null;
			if (!channel) {
				await interaction.reply({
					content: "Canale non valido!",
					ephemeral: true,
				});
				return;
			}
			if (!("clone" in channel)) {
				await interaction.reply({
					content: "Questo canale non può essere clonato!",
					ephemeral: true,
				});
				return;
			}
			if (interaction.appPermissions?.has("ManageChannels") === false) {
				await interaction.reply({
					content: "Non ho abbastanza permessi per eliminare questo canale!",
					ephemeral: true,
				});
				return;
			}
			const result = await channel.clone({ reason }).catch(normalizeError);

			if (result instanceof Error) {
				await sendError(interaction, result);
				return;
			}
			await interaction.reply({
				content: `Canale ${result.toString()} clonato con successo!\n\nMotivo: ${
					reason ?? "*Nessun motivo*"
				}`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `channel-i-${result.id}`,
								label: "Info",
								style: ButtonStyle.Success,
								emoji: { name: "ℹ️" },
							},
						],
					},
				],
			});
			return;
		}
		if (interaction.options.data[0].name === "create") {
			const { guild } = interaction;

			if (
				guild.ownerId !== interaction.user.id &&
				!interaction.member.permissions.has("ManageChannels")
			) {
				await interaction.reply({
					content:
						"Hai bisogno del permesso **Gestisci canali** per usare questo comando!",
					ephemeral: true,
				});
				return;
			}
			const createOptions: GuildChannelCreateOptions = { name: "" };

			for (const option of options)
				if (option.name === "name") {
					if (typeof option.value === "string")
						createOptions.name = option.value;
				} else if (option.name === "type") {
					if (typeof option.value === "number")
						createOptions.type = option.value;
				} else if (option.name === "position") {
					if (typeof option.value === "number")
						createOptions.position = option.value - 1;
				} else if (option.name === "topic") {
					if (typeof option.value === "string")
						createOptions.topic = option.value;
				} else if (option.name === "nsfw") {
					if (typeof option.value === "boolean")
						createOptions.nsfw = option.value;
				} else if (option.name === "bitrate") {
					if (typeof option.value === "number")
						createOptions.bitrate = option.value;
				} else if (option.name === "user-limit") {
					if (typeof option.value === "number")
						createOptions.userLimit = option.value;
				} else if (option.name === "parent") {
					if (option.channel?.type === ChannelType.GuildCategory)
						createOptions.parent = option.channel.id;
				} else if (option.name === "slowmode") {
					if (typeof option.value === "string")
						createOptions.rateLimitPerUser = Math.round(
							ms(option.value) / 1000
						);
				} else if (option.name === "rtc-region") {
					if (typeof option.value === "string")
						createOptions.rtcRegion = option.value;
				} else if (option.name === "video-quality") {
					if (typeof option.value === "number")
						createOptions.videoQualityMode = option.value;
				} else if (option.name === "reason")
					if (typeof option.value === "string")
						createOptions.reason = option.value;
			if (!createOptions.name) {
				await interaction.reply({
					content: "Nome canale non valido!",
					ephemeral: true,
				});
				return;
			}
			if (
				createOptions.rateLimitPerUser !== undefined &&
				(isNaN(createOptions.rateLimitPerUser) ||
					createOptions.rateLimitPerUser < 0 ||
					createOptions.rateLimitPerUser > 21_600)
			) {
				await interaction.reply({
					content:
						"Il valore della slowmode non è valido o non è minore di 6 ore!",
					ephemeral: true,
				});
				return;
			}
			if (interaction.appPermissions?.has("ManageChannels") === false) {
				await interaction.reply({
					content: "Non ho abbastanza permessi per creare canali!",
					ephemeral: true,
				});
				return;
			}
			const result = await guild.channels
				.create(createOptions)
				.catch(normalizeError);

			if (result instanceof Error) {
				await sendError(interaction, result);
				return;
			}
			await interaction.reply({
				content: `Canale ${result.toString()} creato con successo!\n\nMotivo: ${
					createOptions.reason ?? "*Nessun motivo*"
				}`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `channel-i-${result.id}`,
								label: "Info",
								style: ButtonStyle.Success,
								emoji: { name: "ℹ️" },
							},
						],
					},
				],
			});
			return;
		}
		if (interaction.options.data[0].name === "info") {
			const channel =
				interaction.options.getChannel("channel") ?? interaction.channel;

			if (!(channel && "client" in channel)) {
				await interaction.reply({
					content: "Canale non valido!",
					ephemeral: true,
				});
				return;
			}
			await channelInfo(channel, interaction);
		}
	},
	async component(interaction) {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content:
					"Questo comando può essere usato solo all'interno di un server!",
				ephemeral: true,
			});
			return;
		}
		const [, action, ...args] = interaction.customId.split("-");
		if (!["i"].includes(action)) {
			await interaction.reply({
				content: "Azione non valida!",
				ephemeral: true,
			});
			return;
		}
		if (action === "i") {
			const channel =
				interaction.guild.channels.cache.get(args[0]) ?? interaction.channel;

			if (!channel) {
				await interaction.reply({
					content: "Canale non valido!",
					ephemeral: true,
				});
				return;
			}
			await channelInfo(channel, interaction, true);
		}
	},
});
