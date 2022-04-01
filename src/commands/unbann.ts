import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { unbann } from "../util";

enum Options {
	user = "utente",
	reason = "motivo",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("unbann")
		.setDescription("Revoca il bann di un utente")
		.addUserOption((user) =>
			user
				.setName(Options.user)
				.setDescription("L'utente bannato")
				.setRequired(true)
		)
		.addStringOption((reason) =>
			reason
				.setName(Options.reason)
				.setDescription("Il motivo per cui revocare il bann")
		),
	isPublic: true,
	async run(interaction) {
		if (!interaction.inCachedGuild())
			return interaction.reply({
				content: "Questo comando è disponibile solo all'interno dei server!",
				ephemeral: true,
			});
		const [options] = await Promise.all([
			unbann(
				this.client,
				interaction.options.getUser(Options.user, true).id,
				interaction.guildId,
				interaction.user.id,
				interaction.options.getString(Options.reason, true)
			),
			interaction.deferReply(),
		]);

		return void (await interaction.editReply(options));
	},
};
