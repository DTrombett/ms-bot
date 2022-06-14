import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { kick } from "../util";

enum Options {
	member = "membro",
	reason = "motivo",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("kick")
		.setDescription("Espelli un membro dal server")
		.addUserOption((member) =>
			member
				.setName(Options.member)
				.setDescription("Il membro da espellere")
				.setRequired(true)
		)
		.addStringOption((reason) =>
			reason.setName(Options.reason).setDescription("Il motivo dell'espulsione")
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
			kick(
				this.client,
				interaction.options.getUser(Options.member, true).id,
				interaction.guildId,
				interaction.user.id,
				interaction.options.getString(Options.reason) ?? undefined
			),
			interaction.deferReply(),
		]);

		await interaction.editReply(options);
	},
};
