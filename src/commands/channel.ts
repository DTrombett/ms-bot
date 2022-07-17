import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	VideoQualityMode,
} from "discord-api-types/v10";
import type {
	GuildBasedChannel,
	NewsChannel,
	PrivateThreadChannel,
	PublicThreadChannel,
	TextChannel,
} from "discord.js";
import ms from "ms";
import type { ReceivedInteraction } from "../util";
import {
	capitalize,
	createCommand,
	formatBytes,
	normalizeError,
	sendError,
} from "../util";

type CheckSlowmodeOptions = {
	channel: GuildBasedChannel | null | undefined;
	rateLimitPerUser: number;
	reason?: string;
};
type SlowmodeOptions = {
	channel:
		| NewsChannel
		| PrivateThreadChannel
		| PublicThreadChannel
		| TextChannel;
	rateLimitPerUser: number;
	reason?: string;
};

const checkPerms = async (interaction: ReceivedInteraction<"cached">) => {
	if (!interaction.memberPermissions.has("ManageChannels")) {
		await interaction.reply({
			content: "Non hai i permessi necessari per usare questo comando!",
			ephemeral: true,
		});
		return true;
	}
	return false;
};
const checkOptions = async (
	interaction: ReceivedInteraction<"cached">,
	options: CheckSlowmodeOptions
) => {
	if (!(options.channel && "setRateLimitPerUser" in options.channel)) {
		await interaction.reply({
			content: "Questa azione non può essere eseguita nel canale selezionato!",
			ephemeral: true,
		});
		return true;
	}
	if (!options.channel.manageable) {
		await interaction.reply({
			content: "Non ho i permessi necessari per gestire il canale selezionato!",
			ephemeral: true,
		});
		return true;
	}
	if (isNaN(options.rateLimitPerUser)) {
		await interaction.reply({
			content: "Hai inserito un valore non valido per lo slowmode!",
			ephemeral: true,
		});
		return true;
	}
	if (options.rateLimitPerUser < 0 || options.rateLimitPerUser > 21600) {
		await interaction.reply({
			content:
				"La durata dello slowmode deve essere compresa tra 0 secondi e 6 ore!",
			ephemeral: true,
		});
		return true;
	}
	if (options.rateLimitPerUser === options.channel.rateLimitPerUser) {
		await interaction.reply({
			content: "Lo slowmode è già impostata a questo valore!",
			ephemeral: true,
		});
		return true;
	}
	return false;
};
const slowmode = async (
	interaction: ReceivedInteraction<"cached">,
	options: SlowmodeOptions
) => {
	const oldSlowmode = options.channel.rateLimitPerUser;
	const result = await options.channel
		.setRateLimitPerUser(options.rateLimitPerUser, options.reason)
		.catch(normalizeError);

	if (result instanceof Error) {
		await sendError(interaction, result);
		return;
	}
	await interaction.reply({
		content: `Slowmode ${
			options.rateLimitPerUser
				? `impostato a **${ms(options.rateLimitPerUser * 1000)}**`
				: "disattivato"
		} in <#${options.channel.id}> con successo!`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						custom_id: `channel-s-${options.channel.id}-${
							options.rateLimitPerUser || oldSlowmode == null ? 0 : oldSlowmode
						}`,
						label:
							options.rateLimitPerUser || oldSlowmode == null
								? "Rimuovi"
								: "Annulla",
						style: ButtonStyle.Danger,
					},
				],
			},
		],
	});
};

export const command = createCommand({
	data: [
		{
			name: "channel",
			description: "Gestisci i canali",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "slowmode",
					description: "Imposta o mostra lo slowmode",
					options: [
						{
							name: "duration",
							description:
								"Il nuovo slowmode (0 per disattivarlo, vuoto per mostrare quella attuale)",
							type: ApplicationCommandOptionType.String,
						},
						{
							name: "reason",
							description: "Il motivo della modifica dello slowmode",
							type: ApplicationCommandOptionType.String,
							max_length: 512,
						},
						{
							name: "channel",
							description: "Il canale da gestire (default: questo canale)",
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
		if (interaction.options.data[0].name === "slowmode") {
			if (options.some((option) => option.name === "duration")) {
				if (await checkPerms(interaction)) return;
				const slowmodeOptions: CheckSlowmodeOptions = {
					channel: interaction.channel,
					rateLimitPerUser: 0,
				};

				for (const option of options)
					if (
						option.name === "channel" &&
						option.channel &&
						"client" in option.channel
					)
						slowmodeOptions.channel = option.channel;
					else if (option.name === "duration")
						slowmodeOptions.rateLimitPerUser =
							ms(typeof option.value === "string" ? option.value : "") || 0;
					else if (option.name === "reason" && typeof option.value === "string")
						slowmodeOptions.reason = option.value;
				slowmodeOptions.rateLimitPerUser = Math.round(
					slowmodeOptions.rateLimitPerUser / 1000
				);
				if (await checkOptions(interaction, slowmodeOptions)) return;
				await slowmode(interaction, slowmodeOptions as SlowmodeOptions);
				return;
			}
			const tempChannel = interaction.options.getChannel("channel");
			const channel = !(tempChannel && "setRateLimitPerUser" in tempChannel)
				? interaction.channel
				: tempChannel;

			if (!channel) {
				await interaction.reply({
					content: "Canale non valido!",
					ephemeral: true,
				});
				return;
			}
			await interaction.reply({
				content:
					channel.rateLimitPerUser ?? 0
						? `Slowmode attivo in <#${channel.id}> ogni **${ms(
								channel.rateLimitPerUser! * 1000
						  )}**.`
						: `Slowmode non attivo in <#${channel.id}>.`,
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
						channel.videoQualityMode === VideoQualityMode.Full
							? "720p"
							: "Auto",
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
						color: interaction.member.roles.color?.color,
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
			});
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
		if (!action || !["s"].includes(action)) {
			await interaction.reply({
				content: "Azione non valida!",
				ephemeral: true,
			});
			return;
		}
		if (action === "s") {
			if (await checkPerms(interaction)) return;
			const options: CheckSlowmodeOptions = {
				channel:
					interaction.guild.channels.cache.get(args[0]) ?? interaction.channel,
				rateLimitPerUser: Number(args[1]) || 0,
			};

			if (await checkOptions(interaction, options)) return;
			await slowmode(interaction, options as SlowmodeOptions);
		}
	},
});
