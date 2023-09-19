import type {
	APIEmbedField,
	GuildMember,
	GuildMemberEditOptions,
	RoleManager,
	User,
	VoiceChannel,
} from "discord.js";
import {
	ActivityType,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	ThreadAutoArchiveDuration,
	VideoQualityMode,
	escapeMarkdown,
} from "discord.js";
import type { ReceivedInteraction } from "../util";
import {
	capitalize,
	createCommand,
	normalizeError,
	printToStderr,
	sendError,
} from "../util";

const normalizeRoles = (value: string, roles: RoleManager) =>
	value
		.split(/\s*,\s*/)
		.map((r) => {
			r = r.toLowerCase();
			return /^\d{17,20}$/.test(r)
				? r
				: /^<@&\d{17,20}>$/.test(r)
				? r.slice(3, -1)
				: roles.cache.find((role) => role.name.toLowerCase().startsWith(r))?.id;
		})
		.filter((r): r is string => r !== undefined);
const userInfo = async (
	interaction: ReceivedInteraction,
	user: User,
	ephemeral?: boolean,
) => {
	const createdAt = Math.round(user.createdTimestamp / 1000);
	const accentColor = user.accentColor?.toString(16).padStart(6, "0");
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
							16,
					  )}, ${parseInt(accentColor.slice(2, 4), 16)}, ${parseInt(
							accentColor.slice(4, 6),
							16,
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
				.map(
					(a) =>
						`${
							a.type === ActivityType.Custom
								? `${a.emoji ? `${a.emoji.toString()} ` : ""}${a.state ?? ""}`
								: `${ActivityType[a.type]} **${a.name}**${
										a.details == null ? "" : `: ${a.details}`
								  }${a.state == null ? "" : ` (${a.state})`}`
						} (aggiornato <t:${Math.round(a.createdTimestamp / 1000)}:R>)`,
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
				name: "Potenziando il server",
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
			},
		);
	}
	const thumbnailUrl = user.bannerURL({
		extension: "png",
		size: 4096,
	});

	await interaction.reply({
		embeds: [
			{
				author: {
					name: user.tag,
					icon_url: (member ?? user).displayAvatarURL({
						extension: "png",
						size: 4096,
					}),
					url: `https://discord.com/users/${user.id}`,
				},
				color: user.accentColor ?? member?.roles.color?.color,
				footer: {
					text: "Ultimo aggiornamento",
				},
				timestamp: new Date().toISOString(),
				fields: fields.slice(0, 25),
				thumbnail: thumbnailUrl! ? { url: thumbnailUrl } : undefined,
			},
		],
		components: [
			{
				components: [
					{
						type: ComponentType.Button,
						style: ButtonStyle.Link,
						label: "Apri nell'app",
						url: `discord://-/users/${user.id}`,
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

for (const [name, value] of Object.entries(ThreadAutoArchiveDuration))
	if (typeof value === "number") autoArchiveChoices.push({ name, value });
for (const [name, value] of Object.entries(VideoQualityMode))
	if (typeof value === "number") videoQualityChoices.push({ name, value });

export const userCommand = createCommand({
	data: [
		{
			name: "user",
			description: "Gestisci i membri e gli utenti",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "edit",
					description: "Modifica un membro",
					options: [
						{
							type: ApplicationCommandOptionType.User,
							name: "member",
							description: "Il membro da modificare",
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "nick",
							description: "Il nuovo nickname",
							max_length: 32,
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "new-roles",
							description: "Lista di ruoli da aggiungere al membro",
							autocomplete: true,
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "remove-roles",
							description: "Lista di ruoli da rimuovere dal membro",
							autocomplete: true,
						},
						{
							type: ApplicationCommandOptionType.Boolean,
							name: "mute",
							description: "Se il membro deve essere mutato nei canali vocali",
						},
						{
							type: ApplicationCommandOptionType.Boolean,
							name: "deaf",
							description: "Se il membro non può ascoltare nei canali vocali",
						},
						{
							type: ApplicationCommandOptionType.Channel,
							name: "voice-channel",
							description: "Il canale vocale da assegnare al membro",
							channel_types: [ChannelType.GuildVoice],
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "reason",
							description: "La motivazione della modifica",
							max_length: 512,
						},
					],
				},
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
		{
			name: "Info Utente",
			type: ApplicationCommandType.User,
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
		if (interaction.options.data[0].name === "edit") {
			const [{ options }] = interaction.options.data;

			if (!options) {
				await interaction.reply({
					content: "Questo comando non è attualmente disponibile!",
					ephemeral: true,
				});
				return;
			}
			const { guild } = interaction;
			const editOptions: GuildMemberEditOptions = {};
			let { member } = interaction as { member?: GuildMember },
				newRoles: string[] | undefined,
				removeRoles: string[] | undefined;

			for (const option of options)
				if (option.name === "nick") {
					if (typeof option.value === "string") editOptions.nick = option.value;
				} else if (option.name === "new-roles") {
					if (typeof option.value === "string")
						newRoles = normalizeRoles(option.value, guild.roles);
				} else if (option.name === "remove-roles") {
					if (typeof option.value === "string")
						removeRoles = normalizeRoles(option.value, guild.roles);
				} else if (option.name === "mute") {
					if (typeof option.value === "boolean")
						editOptions.mute = option.value;
				} else if (option.name === "deaf") {
					if (typeof option.value === "boolean")
						editOptions.deaf = option.value;
				} else if (option.name === "voice-channel") {
					if (option.channel?.type === ChannelType.GuildVoice)
						editOptions.channel =
							"client" in option.channel
								? option.channel
								: // eslint-disable-next-line no-await-in-loop
								  ((await guild.channels
										.fetch(option.channel.id)
										.catch(() => undefined)) as VoiceChannel);
				} else if (option.name === "reason") {
					if (typeof option.value === "string")
						editOptions.reason = option.value;
				} else if (option.name === "member" && typeof option.value === "string")
					member =
						option.member && "client" in option.member
							? option.member
							: // eslint-disable-next-line no-await-in-loop
							  await guild.members.fetch(option.value).catch(() => undefined);
			if (member === undefined) {
				await interaction.reply({
					content: "Membro non trovato!",
					ephemeral: true,
				});
				return;
			}
			if (newRoles || removeRoles) {
				editOptions.roles = member.roles.cache.map((r) => r.id);
				if (newRoles) editOptions.roles = editOptions.roles.concat(newRoles);
				if (removeRoles)
					editOptions.roles = editOptions.roles.filter(
						(r) => !removeRoles!.includes(r as string),
					);
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
			if (interaction.user.id !== guild.ownerId) {
				const self = member.id === interaction.user.id;

				if (
					!self &&
					member.roles.highest.comparePositionTo(
						interaction.member.roles.highest,
					) >= 0
				) {
					await interaction.reply({
						content:
							"Non puoi modificare un membro con un ruolo superiore o uguale a quello del tuo!",
						ephemeral: true,
					});
					return;
				}
				if (editOptions.nick !== undefined)
					if (self) {
						if (!interaction.memberPermissions.has("ChangeNickname")) {
							await interaction.reply({
								content:
									"Hai bisogno del permesso **Cambia nickname** per modificare il tuo nickname!",
								ephemeral: true,
							});
							return;
						}
					} else if (!interaction.memberPermissions.has("ManageNicknames")) {
						await interaction.reply({
							content:
								"Hai bisogno del permesso **Gestisci nickname** per modificare i nickname degli altri membri!",
							ephemeral: true,
						});
						return;
					}
				if (editOptions.roles !== undefined) {
					if (self) {
						await interaction.reply({
							content: "Non puoi modificare i tuoi ruoli!",
							ephemeral: true,
						});
						return;
					}
					if (!interaction.memberPermissions.has("ManageRoles")) {
						await interaction.reply({
							content:
								"Hai bisogno del permesso **Gestisci ruoli** per modificare i ruoli degli altri membri!",
							ephemeral: true,
						});
						return;
					}
				}
				if (editOptions.mute !== undefined) {
					if (self) {
						await interaction.reply({
							content: "Non puoi modificare il tuo stato vocale!",
							ephemeral: true,
						});
						return;
					}
					if (!interaction.memberPermissions.has("MuteMembers")) {
						await interaction.reply({
							content:
								"Hai bisogno del permesso **Silenzia membri** per eseguire questa azione!",
							ephemeral: true,
						});
						return;
					}
				}
				if (editOptions.deaf !== undefined) {
					if (self) {
						await interaction.reply({
							content: "Non puoi modificare il tuo stato vocale!",
							ephemeral: true,
						});
						return;
					}
					if (!interaction.memberPermissions.has("DeafenMembers")) {
						await interaction.reply({
							content:
								"Hai bisogno del permesso **Silenzia l'audio degli altri** per eseguire questa azione!",
							ephemeral: true,
						});
						return;
					}
				}
				if (editOptions.channel !== undefined)
					if (self) {
						if (
							!(editOptions.channel as VoiceChannel)
								.permissionsFor(member)
								.has("Connect")
						) {
							await interaction.reply({
								content:
									"Non puoi hai abbastanza permessi per connetterti a questo canale!",
								ephemeral: true,
							});
							return;
						}
					} else if (!interaction.memberPermissions.has("MoveMembers")) {
						await interaction.reply({
							content:
								"Hai bisogno del permesso **Sposta membri** per eseguire questa azione!",
							ephemeral: true,
						});
						return;
					}
			}
			if (member.id !== interaction.client.user.id && !member.manageable) {
				await interaction.reply({
					content: "Non ho abbastanza permessi per gestire questo membro!",
					ephemeral: true,
				});
				return;
			}
			const result = await guild.members
				.edit(member, editOptions)
				.catch(normalizeError);

			if (result instanceof Error) {
				await sendError(interaction, result);
				return;
			}
			await interaction.reply({
				content: `Membro modificato con successo!\n\nMotivo: ${
					editOptions.reason ?? "*Nessun motivo*"
				}`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `user-i-${member.id}`,
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
		await userInfo(
			interaction,
			await (interaction.options.getUser("user") ?? interaction.user).fetch(),
		);
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
			let user =
				(await interaction.client.users.fetch(args[0]).catch(printToStderr)) ||
				interaction.user;

			if (user.banner === undefined) user = await user.fetch();
			await userInfo(interaction, user, true);
		}
	},
	async autocomplete(interaction) {
		if (!interaction.inCachedGuild()) return;
		const { guild } = interaction;
		const option = interaction.options.getFocused(true);

		if (typeof option.value !== "string") return;
		const oldRoles = guild.members.cache.get(
			interaction.options.get("member")?.value as string,
		)?.roles.cache;
		const { cache } = guild.roles;
		const startRoles =
			option.name === "new-roles"
				? oldRoles
					? cache.difference(oldRoles)
					: cache
				: oldRoles ?? cache;
		const split = option.value.split(/\s*,\s*/);
		const old = split.slice(0, -1);
		const value = split.at(-1)!.toLowerCase();
		const roles = option.value
			? /^\d{2,20}$/.test(value)
				? startRoles.filter(
						(r) => r.id.startsWith(value) && !old.includes(r.name),
				  )
				: startRoles.filter(
						(r) =>
							r.name.toLowerCase().startsWith(value) && !old.includes(r.name),
				  )
			: startRoles;

		await interaction.respond(
			roles.map((r) => {
				const name = old.concat([r.name]).join(", ");

				return {
					name,
					value: name,
				};
			}),
		);
	},
});
