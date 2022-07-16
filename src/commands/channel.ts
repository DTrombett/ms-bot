import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
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
import { createCommand, normalizeError, sendError } from "../util";

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
			content: "Hai inserito un valore non valido per la slowmode!",
			ephemeral: true,
		});
		return true;
	}
	if (options.rateLimitPerUser < 0 || options.rateLimitPerUser > 21600) {
		await interaction.reply({
			content:
				"La durata della slowmode deve essere compresa tra 0 secondi e 6 ore!",
			ephemeral: true,
		});
		return true;
	}
	if (options.rateLimitPerUser === options.channel.rateLimitPerUser) {
		await interaction.reply({
			content: "La slowmode è già impostata a questo valore!",
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
				? `impostata a **${ms(options.rateLimitPerUser * 1000)}**`
				: "disattivata"
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
					description: "Imposta o mostra la slowmode",
					options: [
						{
							name: "duration",
							description:
								"La nuova slowmode (0 per disattivarla, vuoto per mostrare quella attuale)",
							type: ApplicationCommandOptionType.String,
						},
						{
							name: "reason",
							description: "Il motivo della modifica della slowmode",
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
						? `Slowmode attiva in <#${channel.id}> ogni **${ms(
								channel.rateLimitPerUser! * 1000
						  )}**.`
						: `Slowmode non attiva in <#${channel.id}>.`,
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
