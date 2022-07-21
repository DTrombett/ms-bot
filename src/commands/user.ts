import type { APIEmbedField } from "discord-api-types/v10";
import {
	ActivityType,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ThreadAutoArchiveDuration,
	VideoQualityMode,
} from "discord-api-types/v10";
import type { User } from "discord.js";
import { escapeMarkdown } from "discord.js";
import type { ReceivedInteraction } from "../util";
import { capitalize, createCommand, CustomClient } from "../util";

const userInfo = async (
	interaction: ReceivedInteraction,
	user: User,
	ephemeral?: boolean
) => {
	const createdAt = Math.round(user.createdTimestamp / 1000);
	const accentColor = user.accentColor?.toString(16);
	const fields: APIEmbedField[] = [
		{
			name: "ID",
			value: user.id,
			inline: true,
		},
		{
			name: "Bot",
			value: user.bot ? "Sì" : "No",
			inline: true,
		},
		{
			name: "Sistema",
			value: user.system ? "Sì" : "No",
			inline: true,
		},
		{
			name: "Colore del profilo",
			value:
				accentColor === undefined
					? "*Nessuno*"
					: `Hex: #${accentColor.toUpperCase()}\nRGB: ${parseInt(
							accentColor.slice(0, 2),
							16
					  )}, ${parseInt(accentColor.slice(2, 4), 16)}, ${parseInt(
							accentColor.slice(4, 6),
							16
					  )}\nDecimal: ${user.accentColor!}`,
			inline: true,
		},
		{
			name: "Badge",
			value: (user.flags?.toArray().join(", ") ?? "") || "*Nessuno*",
			inline: true,
		},
		{
			name: "Creato",
			value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`,
			inline: true,
		},
	];
	const member = interaction.guild?.members.cache.get(user.id);

	if (member) {
		const joinedTimestamp = Math.round(member.joinedTimestamp! / 1000);
		const boostTimestamp = Math.round(member.premiumSinceTimestamp! / 1000);
		const { presence } = member;
		const status = presence?.clientStatus
			? Object.keys(presence.clientStatus)
					.map((k) => `${capitalize(k)}`)
					.join(", ")
			: "";
		const activities =
			presence?.activities
				.map((a) =>
					a.type === ActivityType.Custom
						? `${a.emoji ? `${a.emoji.toString()} ` : ""}${a.state ?? ""}`
						: `${ActivityType[a.type]} **${a.name}**${
								a.details == null ? "" : `: ${a.details}`
						  }${a.state == null ? "" : ` (${a.state})`}`
				)
				.join("\n") ?? "";

		fields.push(
			{
				name: "Stato",
				value: presence
					? `**${capitalize(presence.status)}**${status && ` (${status})`}${
							activities && `\n${activities}`
					  }`
					: "**Offline**",
			},
			{
				name: "Entrato",
				value: joinedTimestamp
					? `<t:${joinedTimestamp}:F> (<t:${joinedTimestamp}:R>)`
					: "*Sconosciuto*",
				inline: true,
			},
			{
				name: "Nickname",
				value:
					member.nickname == null
						? "*Non presente*"
						: escapeMarkdown(member.nickname),
				inline: true,
			},
			{
				name: "Ha accettato le regole",
				value: member.pending ? "No" : "Sì",
				inline: true,
			},
			{
				name: "Boostando il server",
				value: boostTimestamp
					? `Da <t:${boostTimestamp}:F> (<t:${boostTimestamp}:R>)`
					: "No",
				inline: true,
			},
			{
				name: "Ruoli",
				value:
					member.roles.cache
						.map((r) => r.toString())
						.slice(0, -1)
						.join(", ") || "*Nessuno*",
				inline: true,
			},
			{
				name: "Canale vocale",
				value:
					member.voice.channelId == null
						? "*Nessuno*"
						: `<#${member.voice.channelId}>`,
				inline: true,
			}
		);
	}
	const url = (member ?? user).displayAvatarURL({
		extension: "png",
		size: 4096,
	});
	const thumbnailUrl = user.bannerURL({
		extension: "png",
		size: 4096,
	});

	await interaction.reply({
		embeds: [
			{
				author: {
					name: user.tag,
					icon_url: url,
					url,
				},
				color: member?.roles.color?.color ?? user.accentColor ?? undefined,
				footer: {
					text: "Ultimo aggiornamento",
				},
				timestamp: new Date().toISOString(),
				fields: fields.slice(0, 25),
				thumbnail: thumbnailUrl! ? { url: thumbnailUrl } : undefined,
			},
		],
		ephemeral,
	});
};

const autoArchiveChoices: { name: string; value: ThreadAutoArchiveDuration }[] =
	[];
const videoQualityChoices: { name: string; value: VideoQualityMode }[] = [];

for (const [name, value] of Object.entries(ThreadAutoArchiveDuration))
	if (typeof value === "number") autoArchiveChoices.push({ name, value });
for (const [name, value] of Object.entries(VideoQualityMode))
	if (typeof value === "number") videoQualityChoices.push({ name, value });

export const command = createCommand({
	data: [
		{
			name: "user",
			description: "Gestisci i membri e gli utenti",
			type: ApplicationCommandType.ChatInput,
			options: [
				// TODO
				// {
				// 	type: ApplicationCommandOptionType.Subcommand,
				// 	name: "edit",
				// 	description: "Modifica un membro",
				// 	options: [
				// 	],
				// },
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "info",
					description: "Mostra le informazioni su un utente",
					options: [
						{
							name: "user",
							description: "Il membro da mostrare (default: tu)",
							type: ApplicationCommandOptionType.User,
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
		if (interaction.options.data[0].name === "edit")
			// 			const { guild } = interaction;
			//
			// 			if (
			// 				guild.ownerId !== interaction.user.id &&
			// 				!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)
			// 			) {
			// 				await interaction.reply({
			// 					content:
			// 						"Hai bisogno del permesso **Gestisci canali** per usare questo comando!",
			// 					ephemeral: true,
			// 				});
			// 				return;
			// 			}
			// 			const editOptions: GuildChannelEditOptions = {};
			// 			let channel = interaction.channelId;
			//
			// 			for (const option of options)
			// 				if (option.name === "name") {
			// 					if (typeof option.value === "string") editOptions.name = option.value;
			// 				} else if (option.name === "type") {
			// 					if (typeof option.value === "number") editOptions.type = option.value;
			// 				} else if (option.name === "position") {
			// 					if (typeof option.value === "number")
			// 						editOptions.position = option.value - 1;
			// 				} else if (option.name === "topic") {
			// 					if (typeof option.value === "string")
			// 						editOptions.topic = option.value;
			// 				} else if (option.name === "nsfw") {
			// 					if (typeof option.value === "boolean")
			// 						editOptions.nsfw = option.value;
			// 				} else if (option.name === "bitrate") {
			// 					if (typeof option.value === "number")
			// 						editOptions.bitrate = option.value;
			// 				} else if (option.name === "user-limit") {
			// 					if (typeof option.value === "number")
			// 						editOptions.userLimit = option.value;
			// 				} else if (option.name === "parent") {
			// 					if (option.channel?.type === ChannelType.GuildCategory)
			// 						editOptions.parent = option.channel.id;
			// 				} else if (option.name === "slowmode") {
			// 					if (typeof option.value === "string")
			// 						editOptions.rateLimitPerUser = Math.round(ms(option.value) / 1000);
			// 				} else if (option.name === "lock-permissions") {
			// 					if (typeof option.value === "boolean")
			// 						editOptions.lockPermissions = option.value;
			// 				} else if (option.name === "autoarchive") {
			// 					if (typeof option.value === "number")
			// 						editOptions.defaultAutoArchiveDuration = option.value;
			// 				} else if (option.name === "rtc-region") {
			// 					if (typeof option.value === "string")
			// 						editOptions.rtcRegion =
			// 							option.value === "auto" ? null : option.value;
			// 				} else if (option.name === "video-quality") {
			// 					if (typeof option.value === "number")
			// 						editOptions.videoQualityMode = option.value;
			// 				} else if (option.name === "reason") {
			// 					if (typeof option.value === "string")
			// 						editOptions.reason = option.value;
			// 				} else if (
			// 					option.name === "channel" &&
			// 					typeof option.value === "string"
			// 				)
			// 					channel = option.value;
			// 			if (
			// 				Object.keys(editOptions).length - (editOptions.reason! ? 1 : 0) ===
			// 				0
			// 			) {
			// 				await interaction.reply({
			// 					content: "Non hai specificato alcuna modifica!",
			// 					ephemeral: true,
			// 				});
			// 				return;
			// 			}
			// 			if (
			// 				editOptions.rateLimitPerUser !== undefined &&
			// 				(isNaN(editOptions.rateLimitPerUser) ||
			// 					editOptions.rateLimitPerUser <= 0 ||
			// 					editOptions.rateLimitPerUser > 21_600)
			// 			) {
			// 				await interaction.reply({
			// 					content:
			// 						"Il valore della slowmode non è valido o non è compreso tra 1 secondo e 6 ore!",
			// 					ephemeral: true,
			// 				});
			// 				return;
			// 			}
			// 			const result = await guild.channels
			// 				.edit(channel, editOptions)
			// 				.catch(normalizeError);
			//
			// 			if (result instanceof Error) {
			// 				await sendError(interaction, result);
			// 				return;
			// 			}
			// 			await interaction.reply({
			// 				content: `Canale modificato con successo!\n\nMotivo: ${
			// 					editOptions.reason ?? "*Nessun motivo*"
			// 				}`,
			// 				components: [
			// 					{
			// 						type: ComponentType.ActionRow,
			// 						components: [
			// 							{
			// 								type: ComponentType.Button,
			// 								custom_id: `channel-i-${channel}`,
			// 								label: "Info",
			// 								style: ButtonStyle.Success,
			// 								emoji: { name: "ℹ️" },
			// 							},
			// 						],
			// 					},
			// 				],
			// 			});
			return;

		if (interaction.options.data[0].name === "info") {
			let user = interaction.options.getUser("user") ?? interaction.user;

			if (user.banner === undefined) user = await user.fetch();
			await userInfo(interaction, user);
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
		if (!action || !["i"].includes(action)) {
			await interaction.reply({
				content: "Azione non valida!",
				ephemeral: true,
			});
			return;
		}
		if (action === "i") {
			let user =
				(await interaction.client.users
					.fetch(args[0])
					.catch(CustomClient.printToStderr)) || interaction.user;

			if (user.banner === undefined) user = await user.fetch();
			await userInfo(interaction, user, true);
		}
	},
});
