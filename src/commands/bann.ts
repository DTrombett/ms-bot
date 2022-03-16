import { SlashCommandBuilder } from "@discordjs/builders";
import {
	ButtonStyle,
	ComponentType,
	OAuth2Scopes,
} from "discord-api-types/v10";
import { PermissionFlagsBits, Util } from "discord.js";
import type { CommandOptions } from "../util";
import { createActionButton, CustomClient } from "../util";

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
		if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
			return interaction.reply({
				content:
					"Non hai abbastanza permessi per usare questo comando!\nPermessi richiesti: Bannare i membri",
				ephemeral: true,
			});
		const { guild } = interaction;
		const user = interaction.options.getUser(SubCommands.user, true);
		const member = await guild.members.fetch(user.id).catch(() => null);

		if (member?.id === guild.ownerId)
			return interaction.reply({
				content: "Non puoi bannare il proprietario del server!",
				ephemeral: true,
			});
		const rawPosition = member?.roles.highest.rawPosition;

		if (
			member &&
			interaction.user.id !== guild.ownerId &&
			interaction.member.roles.highest.rawPosition <= rawPosition!
		)
			return interaction.reply({
				content:
					"Non puoi bannare un membro con un ruolo superiore o uguale al tuo!",
				ephemeral: true,
			});
		const [me] = await Promise.all([
			guild.me ?? guild.members.fetch(this.client.user.id),
			interaction.deferReply(),
		]);

		if (!me.permissions.has(PermissionFlagsBits.BanMembers))
			return void interaction.editReply({
				content:
					"Non ho i permessi per bannare membri!\nPer favore, autorizzami cliccando il pulsante qui sotto.",
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								url: `https://discord.com/api/oauth2/authorize?client_id=${
									this.client.application.id
								}&permissions=${
									PermissionFlagsBits.BanMembers | me.permissions.bitfield
								}&scope=${OAuth2Scopes.Bot}&guild_id=${guild.id}`,
								label: "Autorizza",
								style: ButtonStyle.Link,
							},
						],
					},
				],
			});
		if (member && me.roles.highest.rawPosition <= rawPosition!)
			return void interaction.editReply({
				content:
					"Non posso bannare un membro con un ruolo maggiore o uguale al mio!",
			});
		const reason = interaction.options.getString(SubCommands.reason);

		return guild.members
			.ban(user.id, {
				reason: `Bannato da ${interaction.user.tag} (${interaction.user.id})${
					reason == null ? "" : `: ${reason}`
				}`,
				deleteMessageDays:
					interaction.options.getInteger(SubCommands.deleteMessageDays) ??
					undefined,
			})
			.then(
				() =>
					void interaction.editReply({
						content: `<@!${user.id}> (${Util.escapeMarkdown(user.tag)} - ${
							user.id
						}) è stato bannato dal server!${
							reason == null
								? ""
								: `\n\nMotivo: ${
										reason.length > 1000
											? `${reason.slice(0, 1000)}...`
											: reason
								  }`
						}`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										label: "Revoca bann",
										style: ButtonStyle.Danger,
										custom_id: createActionButton(
											"unbann",
											user.id,
											guild.id,
											interaction.user.id
										),
									},
								],
							},
						],
					})
			)
			.catch((error: Error) => {
				void CustomClient.printToStderr(error);
				return interaction.reply({
					content: `Si è verificato un errore: \`${error.message}\``,
					ephemeral: true,
				});
			});
	},
};
