import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	GuildPremiumTier,
} from "discord-api-types/v10";
import type { Attachment } from "discord.js";
import { escapeMarkdown } from "discord.js";
import {
	createCommand,
	CustomClient,
	normalizeError,
	sendError,
} from "../util";

const emojiLimit: Record<GuildPremiumTier, number> = {
	[GuildPremiumTier.None]: 50,
	[GuildPremiumTier.Tier1]: 100,
	[GuildPremiumTier.Tier2]: 150,
	[GuildPremiumTier.Tier3]: 250,
};

export const command = createCommand({
	data: [
		{
			type: ApplicationCommandType.ChatInput,
			name: "emoji",
			description: "Gestisci le emoji del server",
			options: [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "add",
					description: "Aggiungi un emoji",
					options: [
						{
							type: ApplicationCommandOptionType.Attachment,
							name: "emoji",
							description: "L'emoji da aggiungere",
							required: true,
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "name",
							description: "Il nome dell'emoji",
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "roles",
							description: "Lista di ruoli che possono usare l'emoji",
							autocomplete: true,
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "reason",
							description: "La motivazione per l'aggiunta, se presente",
						},
					],
				},
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "remove",
					description: "Rimuovi un emoji",
					options: [
						{
							type: ApplicationCommandOptionType.String,
							name: "emoji",
							description: "L'emoji da rimuovere",
							required: true,
							autocomplete: true,
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "reason",
							description: "La motivazione per la rimozione, se presente",
						},
					],
				},
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "edit",
					description: "Modifica un emoji",
					options: [
						{
							type: ApplicationCommandOptionType.String,
							name: "emoji",
							description: "L'emoji da modificare",
							required: true,
							autocomplete: true,
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "name",
							description: "Il nuovo nome dell'emoji",
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "roles",
							description: "Lista di ruoli che possono usare l'emoji",
							autocomplete: true,
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "reason",
							description: "La motivazione per la modifica, se presente",
						},
					],
				},
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "info",
					description: "Mostra le informazioni di un emoji",
					options: [
						{
							type: ApplicationCommandOptionType.String,
							name: "emoji",
							description: "L'emoji da cercare",
							required: true,
							autocomplete: true,
						},
					],
				},
			],
		},
	],
	async run(interaction) {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content: "Questo comando può essere solo usato in un server!",
				ephemeral: true,
			});
			return;
		}
		const [{ options: data, name: subcommand }] = interaction.options.data;

		if (!data) {
			await interaction.reply({
				content: "Questo comando non è attualmente disponibile!",
				ephemeral: true,
			});
			return;
		}
		const { guild } = interaction;
		if (subcommand === "add") {
			if (
				interaction.user.id !== guild.ownerId &&
				!interaction.memberPermissions.has("ManageEmojisAndStickers")
			) {
				await interaction.reply({
					content: "Hai bisogno del permesso **Gestire emoji e adesivi**",
					ephemeral: true,
				});
				return;
			}
			let emoji: Attachment | undefined,
				name: string | undefined,
				reason: string | undefined,
				roles: string[] | undefined;

			for (const option of data)
				if (option.name === "emoji") emoji = option.attachment;
				else if (option.name === "name")
					name = typeof option.value === "string" ? option.value : undefined;
				else if (option.name === "roles")
					roles = (typeof option.value === "string" ? option.value : undefined)
						?.split(/\s*,\s*/)
						.map((r) => {
							r = r.toLowerCase();
							return /^\d{17,20}$/.test(r)
								? r
								: /^<@&\d{17,20}>$/.test(r)
								? r.slice(3, -1)
								: guild.roles.cache.find((role) =>
										role.name.toLowerCase().startsWith(r)
								  )?.id;
						})
						.filter((r): r is string => r !== undefined);
				else if (option.name === "reason")
					reason = typeof option.value === "string" ? option.value : undefined;
			if (
				!emoji ||
				!["image/png", "image/jpeg", "image/jpg", "image/gif"].includes(
					emoji.contentType!
				)
			) {
				await interaction.reply({
					content: "Emoji non valida!",
					ephemeral: true,
				});
				return;
			}
			name ||= emoji.name?.split(".")[0];
			if (!name!) {
				await interaction.reply({
					content:
						"Non hai specificato un nome per l'emoji e l'immagine non ha un nome valido!",
					ephemeral: true,
				});
				return;
			}
			if (name.length < 2 || name.length > 32) {
				await interaction.reply({
					content:
						"Il nome dell'emoji deve essere compreso tra 2 e 32 caratteri!",
					ephemeral: true,
				});
				return;
			}
			if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
				await interaction.reply({
					content: "Il nome dell'emoji contiene caratteri non validi!",
					ephemeral: true,
				});
				return;
			}
			if (emoji.size >= 256 * 1024) {
				await interaction.reply({
					content: "L'emoji deve essere più piccola di 256kb!",
					ephemeral: true,
				});
				return;
			}
			if (guild.emojis.cache.size >= emojiLimit[guild.premiumTier]) {
				await interaction.reply({
					content: `Hai raggiunto il limite di emoji per questo server! (${
						emojiLimit[guild.premiumTier]
					})!`,
					ephemeral: true,
				});
				return;
			}
			if (interaction.appPermissions?.has("ManageEmojisAndStickers") !== true) {
				await interaction.reply({
					content: "Ho bisogno del permesso **Gestire emoji e adesivi**!",
					ephemeral: true,
				});
				return;
			}
			const [result] = await Promise.all([
				guild.emojis
					.create({
						attachment: emoji.url,
						name,
						reason: reason! || undefined,
						roles,
					})
					.catch(normalizeError),
				interaction.deferReply().catch(CustomClient.printToStderr),
			]);

			if (result instanceof Error) {
				await sendError(interaction, result);
				return;
			}
			const createdTimestamp = Math.round(result.createdTimestamp / 1000);

			await interaction.editReply({
				content: `${result.toString()} Emoji [${result.name!}](${
					result.url
				}) (${result.id}) aggiunta con successo!\n\nAnimata: **${
					result.animated ?? false ? "Sì" : "No"
				}**\nCreata <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)${
					roles && roles.length > 0
						? `\nRuoli consentiti: ${roles.map((r) => `<@&${r}>`).join(", ")}`
						: ""
				}`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `emoji-${result.id}-r`,
								style: ButtonStyle.Danger,
								label: "Rimuovi",
							},
						],
					},
				],
			});
			return;
		}
		if (subcommand === "remove") {
			if (
				interaction.user.id !== guild.ownerId &&
				!interaction.memberPermissions.has("ManageEmojisAndStickers")
			) {
				await interaction.reply({
					content: "Hai bisogno del permesso **Gestire emoji e adesivi**",
					ephemeral: true,
				});
				return;
			}
			let emoji: string | undefined, reason: string | undefined;

			for (const option of data)
				if (option.name === "emoji") {
					if (typeof option.value !== "string") continue;
					const v = option.value.trim().toLowerCase();

					emoji = /^\d{17,20}$/.test(v)
						? v
						: /^<a?:[a-zA-Z0-9-_]+:\d{17,20}>$/.test(v)
						? v.replace(/^<:[a-zA-Z0-9-_]+:/, "").replace(/>$/, "")
						: guild.emojis.cache.find(
								(e) => e.deletable && e.name?.toLowerCase() === v
						  )?.id;
				} else if (option.name === "reason")
					reason = typeof option.value === "string" ? option.value : undefined;
			if (!emoji!) {
				await interaction.reply({
					content: "Non hai specificato un'emoji valida!",
					ephemeral: true,
				});
				return;
			}
			if (interaction.appPermissions?.has("ManageEmojisAndStickers") !== true) {
				await interaction.reply({
					content: "Ho bisogno del permesso **Gestire emoji e adesivi**!",
					ephemeral: true,
				});
				return;
			}
			const result = await guild.emojis
				.delete(emoji, reason! || undefined)
				.catch(normalizeError);

			if (result instanceof Error) {
				await sendError(interaction, result);
				return;
			}
			await interaction.reply({
				content: "Emoji rimossa con successo!",
			});
		}
		if (subcommand === "edit") {
			if (
				interaction.user.id !== guild.ownerId &&
				!interaction.memberPermissions.has("ManageEmojisAndStickers")
			) {
				await interaction.reply({
					content: "Hai bisogno del permesso **Gestire emoji e adesivi**",
					ephemeral: true,
				});
				return;
			}
			let emoji: string | undefined,
				name: string | undefined,
				reason: string | undefined,
				roles: string[] | undefined;

			for (const option of data)
				if (option.name === "emoji") {
					if (typeof option.value !== "string") continue;
					const v = option.value.trim().toLowerCase();

					emoji = /^\d{17,20}$/.test(v)
						? v
						: /^<a?:[a-zA-Z0-9-_]+:\d{17,20}>$/.test(v)
						? v.replace(/^<:[a-zA-Z0-9-_]+:/, "").replace(/>$/, "")
						: guild.emojis.cache.find(
								(e) => e.deletable && e.name?.toLowerCase() === v
						  )?.id;
				} else if (option.name === "name")
					name = typeof option.value === "string" ? option.value : undefined;
				else if (option.name === "roles")
					roles = (typeof option.value === "string" ? option.value : undefined)
						?.split(/\s*,\s*/)
						.map((r) => {
							r = r.toLowerCase();
							return /^\d{17,20}$/.test(r)
								? r
								: /^<@&\d{17,20}>$/.test(r)
								? r.slice(3, -1)
								: guild.roles.cache.find((role) =>
										role.name.toLowerCase().startsWith(r)
								  )?.id;
						})
						.filter((r): r is string => r !== undefined);
				else if (option.name === "reason")
					reason = typeof option.value === "string" ? option.value : undefined;
			if (!emoji!) {
				await interaction.reply({
					content: "Non hai specificato un'emoji valida!",
					ephemeral: true,
				});
				return;
			}
			if (name!) {
				if (name.length < 2 || name.length > 32) {
					await interaction.reply({
						content:
							"Il nome dell'emoji deve essere compreso tra 2 e 32 caratteri!",
						ephemeral: true,
					});
					return;
				}
				if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
					await interaction.reply({
						content: "Il nome dell'emoji contiene caratteri non validi!",
						ephemeral: true,
					});
					return;
				}
			}
			if (interaction.appPermissions?.has("ManageEmojisAndStickers") !== true) {
				await interaction.reply({
					content: "Ho bisogno del permesso **Gestire emoji e adesivi**!",
					ephemeral: true,
				});
				return;
			}
			const result = await guild.emojis
				.edit(emoji, {
					name,
					reason: reason! || undefined,
					roles,
				})
				.catch(normalizeError);

			if (result instanceof Error) {
				await sendError(interaction, result);
				return;
			}
			const createdTimestamp = Math.round(result.createdTimestamp / 1000);

			await interaction.reply({
				content: `${result.toString()} Emoji [${result.name!}](${
					result.url
				}) (${result.id}) modificata con successo!\n\nAnimata: **${
					result.animated ?? false ? "Sì" : "No"
				}**\nCreata <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)${
					roles && roles.length > 0
						? `\nRuoli consentiti: ${roles.map((r) => `<@&${r}>`).join(", ")}`
						: ""
				}`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `emoji-${result.id}-r`,
								style: ButtonStyle.Danger,
								label: "Rimuovi",
							},
						],
					},
				],
			});
			return;
		}
		if (subcommand === "info") {
			let value = data.find((option) => option.name === "emoji")?.value;

			if (typeof value !== "string") {
				await interaction.reply({
					content: "Non hai specificato un'emoji valida!",
					ephemeral: true,
				});
				return;
			}
			value = value.trim().toLowerCase();
			const emoji = await (/^\d{17,20}$/.test(value)
				? guild.emojis.fetch(value)
				: /^<a?:[a-zA-Z0-9-_]+:\d{17,20}>$/.test(value)
				? guild.emojis.fetch(
						value.replace(/^<:[a-zA-Z0-9-_]+:/, "").replace(/>$/, "")
				  )
				: guild.emojis.cache.find((e) => e.name?.toLowerCase() === value));

			if (!emoji) {
				await interaction.reply({
					content: "Non hai specificato un'emoji valida!",
					ephemeral: true,
				});
				return;
			}
			const createdTimestamp = Math.round(emoji.createdTimestamp / 1000);
			const { roles } = emoji;

			await interaction.reply({
				content: `${emoji.toString()} [${emoji.name ?? "emoji"}](${
					emoji.url
				}) (${emoji.id})\n\nAnimata: **${
					emoji.animated ?? false ? "Sì" : "No"
				}**\nCreata <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)\nGestita da un integrazione: **${
					emoji.managed === true ? "Sì" : "No"
				}**${
					emoji.author
						? `\nAutore: <@${emoji.author.id}> (**${escapeMarkdown(
								emoji.author.tag
						  )}**)`
						: ""
				}${
					roles.cache.size > 0
						? `\nRuoli consentiti: ${roles.cache
								.map((r) => `<@&${r.id}>`)
								.join(", ")}`
						: ""
				}`,
			});
		}
	},
	async component(interaction) {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content: "Questo comando può essere solo usato in un server!",
				ephemeral: true,
			});
			return;
		}
	},
});
