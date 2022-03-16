import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { unbann } from "../util";

enum SubCommands {
	user = "utente",
	reason = "motivo",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("unbann")
		.setDescription("Revoca il bann di un utente")
		.addUserOption((user) =>
			user
				.setName(SubCommands.user)
				.setDescription("L'utente bannato")
				.setRequired(true)
		)
		.addStringOption((reason) =>
			reason
				.setName(SubCommands.reason)
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
				interaction.options.getUser(SubCommands.user, true),
				interaction.guild,
				interaction.member,
				interaction.options.getString(SubCommands.reason, true)
			),
			interaction.deferReply(),
		]);

		return void (await interaction.editReply(options));
	},
};
