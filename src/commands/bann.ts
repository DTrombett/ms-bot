import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { bann } from "../util";

enum Options {
	user = "utente",
	deleteMessageDays = "elimina-messaggi",
	reason = "motivo",
	duration = "durata",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("bann")
		.setDescription("Banna un membro dal server")
		.addUserOption((user) =>
			user
				.setName(Options.user)
				.setDescription("L'utente da bannare")
				.setRequired(true)
		)
		.addIntegerOption((deleteMessageDays) =>
			deleteMessageDays
				.setName(Options.deleteMessageDays)
				.setDescription(
					"Quanti giorni eliminare della sua cronologia dei messaggi recenti (0 - 7)"
				)
				.setMinValue(0)
				.setMaxValue(7)
		)
		.addStringOption((duration) =>
			duration
				.setName(Options.duration)
				.setDescription("Durata del bann. (Es: 1d)")
		)
		.addStringOption((reason) =>
			reason
				.setName(Options.reason)
				.setDescription("Il motivo per cui bannare l'utente")
		),
	isPublic: true,
	async run(interaction) {
		if (!interaction.inCachedGuild())
			return interaction.reply({
				content: "Questo comando è disponibile solo all'interno dei server!",
				ephemeral: true,
			});
		const [options] = await Promise.all([
			bann(
				this.client,
				interaction.options.getUser(Options.user, true).id,
				interaction.guildId,
				interaction.user.id,
				interaction.options.getString(Options.reason) ?? undefined,
				`${interaction.options.getInteger(Options.deleteMessageDays) ?? ""}` ||
					undefined,
				interaction.options.getString(Options.duration) ?? undefined
			),
			interaction.deferReply(),
		]);

		return void (await interaction.editReply(options));
	},
};
