import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { timeout } from "../util";

enum Options {
	member = "membro",
	reason = "motivo",
	duration = "durata",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("timeout")
		.setDescription("Applica il Time out ad un membro del server")
		.addUserOption((member) =>
			member
				.setName(Options.member)
				.setDescription("Il membro da mettere in Time out")
				.setRequired(true)
		)
		.addStringOption((duration) =>
			duration
				.setName(Options.duration)
				.setDescription(
					"La durata del Time out. Lascia vuoto per annullare il timeout"
				)
		)
		.addStringOption((reason) =>
			reason.setName(Options.reason).setDescription("Il motivo del Time out")
		),
	isPublic: true,
	async run(interaction) {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content: "Questo comando è disponibile solo all'interno dei server!",
				ephemeral: true,
			});
			return;
		}
		const [options] = await Promise.all([
			timeout(
				this.client,
				interaction.options.getUser(Options.member, true).id,
				interaction.guildId,
				interaction.options.getString(Options.duration),
				interaction.user.id,
				interaction.options.getString(Options.reason) ?? undefined
			),
			interaction.deferReply(),
		]);

		await interaction.editReply(options);
	},
};
