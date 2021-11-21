import {
	codeBlock,
	Embed,
	inlineCode,
	SlashCommandBuilder,
} from "@discordjs/builders";
import { exec as nativeExec } from "child_process";
import { Constants, Util } from "discord.js";
import { inspect, promisify } from "util";
import type { CommandOptions } from "../util";

const enum SubCommands {
	shell = "shell",
	eval = "eval",
}

const enum SubCommandOptions {
	command = "cmd",
}

const exec = promisify(nativeExec);

export const command: CommandOptions = {
	reserved: true,
	data: new SlashCommandBuilder()
		.setName("dev")
		.setDescription("Comandi privati disponibili solo ai sviluppatori")
		.addSubcommand((shell) =>
			shell
				.setName(SubCommands.shell)
				.setDescription("Esegue un comando nel terminal")
				.addStringOption((cmd) =>
					cmd
						.setName(SubCommandOptions.command)
						.setDescription("Comando da eseguire")
						.setRequired(true)
				)
		)
		.addSubcommand((evalCmd) =>
			evalCmd
				.setName(SubCommands.eval)
				.setDescription("Esegue del codice")
				.addStringOption((cmd) =>
					cmd
						.setName(SubCommandOptions.command)
						.setDescription("Codice da eseguire")
						.setRequired(true)
				)
		),
	async run(interaction) {
		await interaction.deferReply({ ephemeral: true });

		switch (interaction.options.getSubcommand()) {
			case SubCommands.shell:
				const cmd = interaction.options.getString(
					SubCommandOptions.command,
					true
				);
				const result = await exec(cmd);
				const embeds: Embed[] = [];

				if (result.stdout)
					embeds.push(
						new Embed()
							.setTitle("Stdout")
							.setDescription(
								codeBlock(
									Util.escapeCodeBlock(result.stdout.slice(0, 4096 - 7))
								)
							)
							.setAuthor({
								name: interaction.user.tag,
								iconURL: interaction.user.displayAvatarURL(),
							})
							.setColor(Constants.Colors.GREEN)
							.setTimestamp()
					);
				if (result.stderr)
					embeds.push(
						new Embed()
							.setTitle("Stderr")
							.setDescription(
								codeBlock(
									Util.escapeCodeBlock(result.stderr.slice(0, 4096 - 7))
								)
							)
							.setAuthor({
								name: interaction.user.tag,
								iconURL: interaction.user.displayAvatarURL(),
							})
							.setColor(Constants.Colors.RED)
							.setTimestamp()
					);
				await interaction.editReply({
					content: inlineCode(`${__dirname}> ${Util.escapeInlineCode(cmd)}`),
					embeds: embeds.map((e) => e.toJSON()),
				});
				break;
			case SubCommands.eval:
				const code = interaction.options.getString(
					SubCommandOptions.command,
					true
				);
				let object;
				try {
					object = (await eval(code)) as unknown;
				} catch (e) {
					object = e;
				}
				const embed = new Embed()
					.setTitle("Eval")
					.setDescription(
						codeBlock(
							"js",
							Util.escapeCodeBlock(inspect(object)).slice(0, 4096 - 9)
						)
					)
					.addField({
						name: "Code",
						value: codeBlock(
							"js",
							Util.escapeCodeBlock(code).slice(0, 4096 - 9)
						),
					})
					.setAuthor({
						name: interaction.user.tag,
						iconURL: interaction.user.displayAvatarURL(),
					})
					.setColor(Constants.Colors.BLURPLE)
					.setTimestamp();
				await interaction.editReply({
					embeds: [embed.toJSON()],
				});
				break;
			default:
				await interaction.editReply("Comando non riconosciuto");
		}
	},
};
