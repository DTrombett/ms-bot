import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { bann } from "../util";

enum SubCommands {
	user = "utente",
	deleteMessageDays = "elimina-messaggi",
	reason = "motivo",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("bann")
		.setDescription("Banna un membro dal server")
		.addUserOption((user) =>
			user
				.setName(SubCommands.user)
				.setDescription("L'utente da bannare")
				.setRequired(true)
		)
		.addIntegerOption((deleteMessageDays) =>
			deleteMessageDays
				.setName(SubCommands.deleteMessageDays)
				.setDescription(
					"Quanti giorni eliminare della sua cronologia dei messaggi recenti (0 - 7)"
				)
				.setMinValue(0)
				.setMaxValue(7)
		)
		.addStringOption((reason) =>
			reason
				.setName(SubCommands.reason)
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
				interaction.options.getUser(SubCommands.user, true),
				interaction.guild,
				interaction.member,
				interaction.options.getString(SubCommands.reason) ?? undefined,
				interaction.options.getInteger(SubCommands.deleteMessageDays) ??
					undefined
			),
			interaction.deferReply(),
		]);

		return void (await interaction.editReply(options));
	},
};
