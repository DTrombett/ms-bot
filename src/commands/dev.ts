import {
	bold,
	codeBlock,
	inlineCode,
	SlashCommandBuilder,
	time,
	TimestampStyles,
} from "@discordjs/builders";
import { ComponentType, TextInputStyle } from "discord-api-types/v10";
import { Colors, Util } from "discord.js";
import type { Buffer } from "node:buffer";
import type { ChildProcess } from "node:child_process";
import { exec, execFile } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import {
	argv,
	cwd,
	env,
	exit,
	memoryUsage,
	stderr,
	stdout,
	uptime,
} from "node:process";
import type { CommandOptions } from "../util";
import { CustomClient, restart } from "../util";

enum SubCommands {
	shell = "shell",
	evalCmd = "eval",
	test = "test",
	ram = "ram",
	restartCmd = "restart",
	shutdown = "shutdown",
	uptimeCmd = "uptime",
	pull = "pull",
	cpp = "cpp",
	logs = "logs",
}
enum SubCommandOptions {
	cmd = "cmd",
	ephemeral = "ephemeral",
	process = "process",
	rebuild = "rebuild",
	registerCommands = "synccommands",
	restartProcess = "restart",
	packages = "packages",
	code = "code",
	include = "include",
	namespaces = "namespaces",
	lines = "lines",
}

const bytesToMb = (memory: number) =>
		Math.round((memory / 1024 / 1024) * 100) / 100,
	commaRegex = /,\s{0,}/g;

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("dev")
		.setDescription("Comandi privati disponibili solo ai sviluppatori")
		.setDefaultPermission(false)
		.addSubcommand((shell) =>
			shell
				.setName(SubCommands.shell)
				.setDescription("Esegue un comando nel terminal")
				.addStringOption((cmd) =>
					cmd
						.setName(SubCommandOptions.cmd)
						.setDescription("Comando da eseguire")
						.setRequired(true)
				)
				.addBooleanOption((ephemeral) =>
					ephemeral
						.setName(SubCommandOptions.ephemeral)
						.setDescription(
							"Scegli se mostrare il risultato privatamente (default: true)"
						)
				)
		)
		.addSubcommand((evalCmd) =>
			evalCmd
				.setName(SubCommands.evalCmd)
				.setDescription("Esegue del codice")
				.addBooleanOption((ephemeral) =>
					ephemeral
						.setName(SubCommandOptions.ephemeral)
						.setDescription(
							"Scegli se mostrare il risultato privatamente (default: true)"
						)
				)
		)
		.addSubcommand((ram) =>
			ram
				.setName(SubCommands.ram)
				.setDescription("Mostra la RAM utilizzata")
				.addBooleanOption((ephemeral) =>
					ephemeral
						.setName(SubCommandOptions.ephemeral)
						.setDescription(
							"Scegli se mostrare il risultato privatamente (default: true)"
						)
				)
		)
		.addSubcommand((restartCmd) =>
			restartCmd
				.setName(SubCommands.restartCmd)
				.setDescription("Riavvia il bot")
				.addBooleanOption((process) =>
					process
						.setName(SubCommandOptions.process)
						.setDescription("Se riavviare il processo (default: true)")
				)
				.addBooleanOption((ephemeral) =>
					ephemeral
						.setName(SubCommandOptions.ephemeral)
						.setDescription(
							"Scegli se mostrare il risultato privatamente (default: true)"
						)
				)
		)
		.addSubcommand((shutdown) =>
			shutdown
				.setName(SubCommands.shutdown)
				.setDescription("Spegni il bot")
				.addBooleanOption((ephemeral) =>
					ephemeral
						.setName(SubCommandOptions.ephemeral)
						.setDescription(
							"Scegli se mostrare il risultato privatamente (default: true)"
						)
				)
		)
		.addSubcommand((uptimeCmd) =>
			uptimeCmd
				.setName(SubCommands.uptimeCmd)
				.setDescription("Mostra l'uptime del bot")
				.addBooleanOption((ephemeral) =>
					ephemeral
						.setName(SubCommandOptions.ephemeral)
						.setDescription(
							"Scegli se mostrare il risultato privatamente (default: true)"
						)
				)
		)
		.addSubcommand((pull) =>
			pull
				.setName(SubCommands.pull)
				.setDescription("Aggiorna il bot")
				.addBooleanOption((rebuild) =>
					rebuild
						.setName(SubCommandOptions.rebuild)
						.setDescription("Ricompila il progetto con i nuovi cambiamenti")
				)
				.addBooleanOption((registerCommands) =>
					registerCommands
						.setName(SubCommandOptions.registerCommands)
						.setDescription("Sincronizza i comandi con Discord")
				)
				.addBooleanOption((restartProcess) =>
					restartProcess
						.setName(SubCommandOptions.restartProcess)
						.setDescription("Riavvia il processo")
				)
				.addBooleanOption((packages) =>
					packages
						.setName(SubCommandOptions.packages)
						.setDescription("Aggiorna i pacchetti")
				)
				.addBooleanOption((ephemeral) =>
					ephemeral
						.setName(SubCommandOptions.ephemeral)
						.setDescription(
							"Scegli se mostrare il risultato privatamente (default: true)"
						)
				)
		)
		.addSubcommand((cpp) =>
			cpp
				.setName(SubCommands.cpp)
				.setDescription("Compila il codice")
				.addStringOption((code) =>
					code
						.setName(SubCommandOptions.code)
						.setDescription("Codice da compilare")
						.setRequired(true)
				)
				.addStringOption((include) =>
					include
						.setName(SubCommandOptions.include)
						.setDescription(
							"Librerie da includere, separate da virgola (default: iostream)"
						)
				)
				.addStringOption((namespaces) =>
					namespaces
						.setName(SubCommandOptions.namespaces)
						.setDescription("Namespaces da usare (default: std)")
				)
				.addBooleanOption((ephemeral) =>
					ephemeral
						.setName(SubCommandOptions.ephemeral)
						.setDescription(
							"Scegli se mostrare il risultato privatamente (default: true)"
						)
				)
		)
		.addSubcommand((logs) =>
			logs
				.setName(SubCommands.logs)
				.setDescription("Mostra i log del bot")
				.addIntegerOption((lines) =>
					lines
						.setName(SubCommandOptions.lines)
						.setDescription("Numero di righe da mostrare (default: max)")
				)
				.addBooleanOption((ephemeral) =>
					ephemeral
						.setName(SubCommandOptions.ephemeral)
						.setDescription(
							"Scegli se mostrare il risultato privatamente (default: true)"
						)
				)
		)
		.addSubcommand((test) =>
			test.setName(SubCommands.test).setDescription("Un comando di test")
		),
	async run(interaction) {
		const ephemeral =
				interaction.options.getBoolean(SubCommandOptions.ephemeral) ?? true,
			subCommand = interaction.options.getSubcommand();

		if (subCommand !== SubCommands.evalCmd)
			await interaction.deferReply({
				ephemeral,
			});
		const now = Date.now();
		let botUptime: Date,
			child: ChildProcess,
			cmd: string,
			code: string,
			error: Error | undefined,
			exitCode: number,
			lines: number | null,
			logs: string[],
			memory: NodeJS.MemoryUsage,
			output: string,
			processUptime: Date;

		switch (subCommand) {
			case SubCommands.shell:
				cmd = interaction.options.getString(SubCommandOptions.cmd, true);
				child = exec(cmd);
				output = "";
				child.stdout?.on("data", (data: Buffer) => (output += data.toString()));
				child.stderr?.on("data", (data: Buffer) => (output += data.toString()));
				child.stderr?.pipe(stderr);
				child.stdout?.pipe(stdout);
				exitCode = await new Promise((resolve) => {
					child.once("close", resolve);
				});
				await interaction.editReply({
					content: `Comando eseguito in ${Date.now() - now}ms\n${inlineCode(
						`${cwd()}> ${Util.escapeInlineCode(cmd.slice(0, 2000 - 100))}`
					)}`,
					embeds: [
						{
							author: {
								name: interaction.user.tag,
								icon_url: interaction.user.displayAvatarURL(),
							},
							title: "Output",
							description: codeBlock(
								Util.escapeCodeBlock(output.slice(0, 4096 - 7))
							),
							color: exitCode ? Colors.Red : Colors.Green,
							timestamp: new Date().toISOString(),
						},
					],
				});
				break;
			case SubCommands.evalCmd:
				await interaction.showModal({
					title: "Eval",
					custom_id: `eval-${ephemeral ? "eph" : ""}`,
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									label: "TypeScript code",
									style: TextInputStyle.Paragraph,
									custom_id: "code",
									type: ComponentType.TextInput,
									required: true,
									placeholder:
										"The code to be formatted with Prettier and compiled by TypeScript...",
								},
							],
						},
					],
				});
				break;
			case SubCommands.ram:
				memory = memoryUsage();
				await interaction.editReply({
					content: `Memoria calcolata in ${Date.now() - now}ms`,
					embeds: [
						{
							author: {
								name: interaction.user.tag,
								icon_url: interaction.user.displayAvatarURL(),
							},
							title: "RAM",
							description: `${bold("Resident Set Size")}: ${bytesToMb(
								memory.rss
							)} MB\n${bold("Heap Total")}: ${bytesToMb(
								memory.heapTotal
							)} MB\n${bold("Heap Used")}: ${bytesToMb(
								memory.heapUsed
							)} MB\n${bold("External")}: ${bytesToMb(memory.external)} MB`,
							color: Math.round(((memory.rss / 1024 / 1024) * 16777215) / 500),
							timestamp: new Date().toISOString(),
						},
					],
				});
				break;
			case SubCommands.restartCmd:
				if (interaction.options.getBoolean(SubCommandOptions.process) ?? true) {
					await interaction.editReply({
						content: `Sto facendo ripartire il programma con i seguenti argv:\n${argv
							.map((arg) => inlineCode(Util.escapeInlineCode(arg)))
							.join("\n")}`,
					});
					restart(this.client);
				} else {
					this.client.destroy();
					this.client.token = env.DISCORD_TOKEN!;
					await this.client.login();
					await interaction.editReply({
						content: `Ricollegato in ${Date.now() - now}ms.`,
					});
				}
				break;
			case SubCommands.shutdown:
				await interaction.editReply({
					content: `Sto spegnendo il bot...`,
				});
				this.client.destroy();
				return exit(0);
			case SubCommands.uptimeCmd:
				processUptime = new Date(Date.now() - uptime() * 1000);
				botUptime = new Date(Date.now() - this.client.uptime);
				await interaction.editReply({
					content: `Process uptime calcolato in ${bold(
						`${Date.now() - now}ms`
					)}`,
					embeds: [
						{
							author: {
								name: interaction.user.tag,
								icon_url: interaction.user.displayAvatarURL(),
							},
							title: "Uptime",
							description: `${bold("Processo")}: ${time(
								processUptime,
								TimestampStyles.RelativeTime
							)} (${time(processUptime)})\n${bold("Bot")}: ${time(
								botUptime,
								TimestampStyles.RelativeTime
							)} (${time(botUptime)})`,
							color: Colors.Blurple,
							timestamp: new Date().toISOString(),
						},
					],
				});
				break;
			case SubCommands.cpp:
				const codeOption = interaction.options.getString(
					SubCommandOptions.code,
					true
				);

				code = `${(
					interaction.options.getString(SubCommandOptions.include) ?? "iostream"
				)
					.split(commaRegex)
					.map((include) => `#include <${include}>`)
					.join("\n")}\n${(
					interaction.options.getString(SubCommandOptions.namespaces) ?? "std"
				)
					.split(commaRegex)
					.map((namespace) => `using namespace ${namespace};`)
					.join("\n")}\n\nint main() {\n\t${codeOption}${
					codeOption.endsWith(";") ? "" : ";"
				}\n}`;
				error = await new Promise((resolve) => {
					createWriteStream("./tmp/cpp.cpp")
						.once("error", resolve)
						.once("finish", resolve)
						.setDefaultEncoding("utf8")
						.end(code);
				});
				if (error) {
					void CustomClient.printToStderr(error);
					await interaction.editReply({
						content: `Errore durante la creazione del file: ${CustomClient.inspect(
							error
						)}`,
					});
					break;
				}
				child = exec("g++ ./tmp/cpp.cpp -o ./tmp/cpp.exe");
				output = "";
				child.stdout?.on("data", (data) => (output += data));
				child.stderr?.on("data", (data) => (output += data));
				child.stdout?.pipe(stdout);
				child.stderr?.pipe(stderr);
				exitCode = await new Promise((resolve) => {
					child.once("close", resolve);
				});
				unlink("./tmp/cpp.cpp").catch(CustomClient.printToStderr);
				if (exitCode) {
					await interaction.editReply({
						content: `Errore durante la compilazione del codice C++\nCodice di errore: ${exitCode}`,
						embeds: [
							{
								author: {
									name: interaction.user.tag,
									icon_url: interaction.user.displayAvatarURL(),
								},
								title: "Output",
								description: codeBlock(
									Util.escapeCodeBlock(output.slice(0, 4096 - 7))
								),
								color: Colors.Red,
								timestamp: new Date().toISOString(),
							},
							{
								author: {
									name: interaction.user.tag,
									icon_url: interaction.user.displayAvatarURL(),
								},
								title: "Codice C++",
								description: codeBlock(
									"cpp",
									Util.escapeCodeBlock(code.slice(0, 4096 - 7))
								),
								color: Colors.Blurple,
								timestamp: new Date().toISOString(),
							},
						],
					});
					break;
				}
				const collector = interaction.channel?.createMessageCollector({
					filter: (m) => m.author.id === interaction.user.id,
				});
				const onData = (data: Buffer) => {
					output += data;
					interaction
						.editReply({
							content: output,
						})
						.catch(CustomClient.printToStderr);
				};

				output = "";
				child = execFile("./tmp/cpp.exe");
				child.stderr?.on("data", onData);
				child.stdout?.on("data", onData);
				collector?.on("collect", (message) => {
					const input = `${message.content}\n`;

					message.delete().catch(CustomClient.printToStderr);
					output += input;
					child.stdin?.write(input);
				});
				exitCode = await new Promise((resolve) => {
					child.once("close", resolve);
				});
				collector?.stop();
				unlink("./tmp/cpp.exe").catch(CustomClient.printToStderr);
				await interaction.editReply({
					content: `${output}\n\n**Processo terminato in ${
						Date.now() - now
					}ms con codice ${exitCode}**`,
				});
				break;
			case SubCommands.logs:
				logs = await new Promise<string[]>((resolve) => {
					let data = "";

					createReadStream(`./debug.log`)
						.setEncoding("utf8")
						.on("data", (chunk) => (data += chunk))
						.once("end", () => {
							resolve(data.split("\n"));
						})
						.once("error", (err) => {
							interaction
								.editReply({
									content: `Errore durante la lettura del file di log: ${CustomClient.inspect(
										err
									)}`,
								})
								.catch(CustomClient.printToStderr);
							resolve([]);
						});
				});
				if (!logs.length) break;
				const { length } = logs;

				lines = interaction.options.getInteger(SubCommandOptions.lines);
				if (lines != null && lines > 0)
					logs = logs.slice(Math.max(0, length - lines - 1));
				while (logs.join("\n").length > 4096 - 7) logs.shift();
				await interaction.editReply({
					content: `Logs letti in ${
						Date.now() - now
					}ms\nRighe totali: ${length}\nRighe visualizzate: ${logs.length}`,
					embeds: [
						{
							author: {
								name: interaction.user.tag,
								icon_url: interaction.user.displayAvatarURL(),
							},
							title: "Logs",
							description: codeBlock(
								Util.escapeCodeBlock(logs.slice(0, 4096 - 7).join("\n"))
							),
							color: Colors.Blurple,
							timestamp: new Date().toISOString(),
						},
					],
				});
				break;
			case SubCommands.test:
				break;
			default:
				await interaction.editReply("Comando non riconosciuto");
		}

		return undefined;
	},
};
