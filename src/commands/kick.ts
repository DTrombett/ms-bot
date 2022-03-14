import { SlashCommandBuilder } from "@discordjs/builders";
import { ButtonStyle, ComponentType, OAuth2Scopes } from "discord-api-types/v9";
import { PermissionFlagsBits, Util } from "discord.js";
import type { CommandOptions } from "../util";

enum SubCommands {
	member = "membro",
	reason = "motivo",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("kick")
		.setDescription("Espelli un membro dal server")
		.addUserOption((member) =>
			member
				.setName(SubCommands.member)
				.setDescription("Il membro da espellere")
				.setRequired(true)
		)
		.addStringOption((reason) =>
			reason
				.setName(SubCommands.reason)
				.setDescription("Il motivo dell'espulsione")
		),
	isPublic: true,
	async run(interaction) {
		// TODO: Add checks like in bann.ts
		if (!interaction.inCachedGuild())
			return interaction.reply({
				content: "Questo comando è disponibile solo all'interno dei server!",
				ephemeral: true,
			});
		const { guild } = interaction;
		const user = interaction.options.getUser(SubCommands.member, true);
		const reason = interaction.options.getString(SubCommands.reason);
		let { me } = guild;

		if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers))
			return interaction.reply({
				content:
					"Non hai abbastanza permessi per usare questo comando!\nPermessi richiesti: Espelli membri",
				ephemeral: true,
			});
		me ??= await guild.members.fetch(this.client.user.id);
		if (!me.permissions.has(PermissionFlagsBits.KickMembers))
			return interaction.reply({
				content:
					"Non ho i permessi per espellere membri!\nPer favore, autorizzami cliccando il pulsante qui sotto.",
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								url: `https://discord.com/api/oauth2/authorize?client_id=${
									this.client.application.id
								}&permissions=${
									PermissionFlagsBits.KickMembers | me.permissions.bitfield
								}&scope=${OAuth2Scopes.Bot}&guild_id=${guild.id}`,
								label: "Autorizza",
								style: ButtonStyle.Link,
							},
						],
					},
				],
				ephemeral: true,
			});
		return guild.members
			.kick(
				user.id,
				`Espulso da ${interaction.user.tag} (${interaction.user.id})${
					reason == null ? "" : `: ${reason}`
				}`
			)
			.then(() =>
				interaction.reply({
					content: `**${Util.escapeBold(
						user.tag
					)}** è stato espulso dal server!${
						reason == null
							? ""
							: `\n\nMotivo: ${
									reason.length > 1000 ? `${reason.slice(0, 1000)}...` : reason
							  }`
					}`,
				})
			)
			.catch((error: Error) =>
				interaction.reply({
					content: `Si è verificato un errore: \`${error.message}\``,
					ephemeral: true,
				})
			);
	},
};
