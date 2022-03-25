import { codeBlock } from "@discordjs/builders";
import { Colors, GuildChannel, Util } from "discord.js";
import { readFile } from "fs/promises";
import prettier from "prettier";
import type { CompilerOptions } from "typescript";
import ts from "typescript";
import type { EventOptions } from "../../util";
import {
	avatar,
	bann,
	banner,
	cat,
	CustomClient,
	deleteEmoji,
	dog,
	editEmoji,
	emojiInfo,
	emojiList,
	EventType,
	icon,
	interactionCommand,
	kick,
	parseActionId,
	parseEval,
	ping,
	unbann,
} from "../../util";

export const event: EventOptions<EventType.Discord, "interactionCreate"> = {
	name: "interactionCreate",
	type: EventType.Discord,
	async on(interaction) {
		if (this.client.blocked) {
			void CustomClient.printToStderr(
				"Received interactionCreate event, but client is blocked."
			);
			return;
		}
		if (interaction.isChatInputCommand()) {
			void this.client.commands.get(interaction.commandName)?.run(interaction);
			void CustomClient.printToStdout(
				`Received command \`${interactionCommand(interaction)}\` from ${
					interaction.user.tag
				} (${interaction.user.id}) ${
					interaction.channel
						? `in ${
								interaction.channel instanceof GuildChannel
									? `#${interaction.channel.name}`
									: "DM"
						  } (${interaction.channelId})`
						: ""
				}`,
				true
			);
			return;
		}
		if (interaction.isAutocomplete()) {
			void this.client.commands
				.get(interaction.commandName)
				?.autocomplete(interaction);
			void CustomClient.printToStdout(
				`Received autocomplete request for command ${interactionCommand(
					interaction
				)} from ${interaction.user.tag} (${interaction.user.id}) ${
					interaction.channel
						? `in ${
								interaction.channel instanceof GuildChannel
									? `#${interaction.channel.name}`
									: "DM"
						  } (${interaction.channelId})`
						: ""
				}`,
				true
			);
			return;
		}
		if (interaction.isButton()) {
			const { action, args } = parseActionId(interaction.customId);
			let options;

			switch (action) {
				case "avatar":
					[options] = await Promise.all([
						avatar(this.client, args[0], args[1]),
						interaction.deferReply(),
					]);

					await interaction.editReply(options);
					break;
				case "bann":
					[options] = await Promise.all([
						bann(
							this.client,
							args[0],
							args[1],
							interaction.user.id,
							args[3],
							args[4]
						),
						interaction.deferReply(),
					]);

					await interaction.editReply(options);
					break;
				case "banner":
					[options] = await Promise.all([
						banner(this.client, args[0]),
						interaction.deferReply(),
					]);

					await interaction.editReply(options);
					break;
				case "cat":
					[options] = await Promise.all([
						cat(this.client),
						interaction.deferReply({ ephemeral: true }),
					]);

					await interaction.editReply(options);
					break;
				case "dog":
					[options] = await Promise.all([
						dog(this.client),
						interaction.deferReply({ ephemeral: true }),
					]);

					await interaction.editReply(options);
					break;
				case "deleteEmoji":
					[options] = await Promise.all([
						deleteEmoji(
							this.client,
							args[0],
							args[1],
							interaction.user.id,
							undefined
						),
						interaction.deferReply({ ephemeral: true }),
					]);

					await interaction.editReply(options);
					break;
				case "editEmoji":
					[options] = await Promise.all([
						editEmoji(
							this.client,
							args[0],
							args[1],
							args[2],
							interaction.user.id,
							undefined,
							...(args as string[]).slice(3)
						),
						interaction.deferReply({ ephemeral: true }),
					]);

					await interaction.editReply(options);
					break;
				case "emojiInfo":
					options = {
						...(await emojiInfo(this.client, args[0], args[1])),
						ephemeral: true,
					};

					await interaction.reply(options);
					break;
				case "emojiList":
					options = {
						...(await emojiList(this.client, args[0], args[1])),
					};

					await interaction.update(options);
					break;
				case "icon":
					options = { ...(await icon(this.client, args[0])) };

					await interaction.reply(options);
					break;
				case "kick":
					[options] = await Promise.all([
						kick(this.client, args[0], args[1], interaction.user.id, args[3]),
						interaction.deferReply(),
					]);

					await interaction.editReply(options);
					break;
				case "ping":
					options = {
						...(await ping(this.client)),
						ephemeral: true,
					};

					await interaction.reply(options);
					break;
				case "unbann":
					[options] = await Promise.all([
						unbann(this.client, args[0], args[1], interaction.user.id, args[3]),
						interaction.deferReply(),
					]);

					await interaction.editReply(options);
					break;
				default:
					void CustomClient.printToStderr(
						`Received unknown button interaction ${interaction.customId}`
					);
			}
			return;
		}
		if (interaction.isModalSubmit()) {
			const [customId, ...args] = interaction.customId.split("-");
			switch (customId) {
				case "eval":
					let code = interaction.fields.getTextInputValue("code"),
						result;
					const now = Date.now();
					try {
						[result] = await Promise.all([
							Promise.all([
								readFile(
									"./node_modules/@tsconfig/node16/tsconfig.json",
									"utf8"
								).then(JSON.parse) as Promise<{
									compilerOptions: CompilerOptions;
								}>,
								readFile("./tsconfig.json", "utf8").then(
									JSON.parse
								) as Promise<{
									compilerOptions: CompilerOptions;
								}>,
								prettier
									.resolveConfig(".prettierrc.json")
									.catch(() => null)
									.then(
										(config) => (code = prettier.format(code, { ...config }))
									),
							]).then(
								([
									{ compilerOptions: baseCompilerOptions },
									{ compilerOptions },
								]) =>
									parseEval(
										ts.transpileModule(code, {
											compilerOptions: {
												...baseCompilerOptions,
												...compilerOptions,
												isolatedModules: false,
												outDir: undefined,
												sourceMap: false,
											},
										}).outputText
									)
							),
							interaction.deferReply({ ephemeral: args[0] === "eph" }),
						]);
					} catch (e) {
						result = CustomClient.inspect(e);
					}
					void CustomClient.printToStdout(result);
					await interaction.editReply({
						content: `Eval elaborato in ${Date.now() - now}ms`,
						embeds: [
							{
								author: {
									name: interaction.user.tag,
									icon_url: interaction.user.displayAvatarURL(),
								},
								title: "Eval output",
								description: codeBlock(
									Util.escapeCodeBlock(result).slice(0, 4096 - 9)
								),
								color: Colors.Blurple,
								timestamp: new Date().toISOString(),
								fields: [
									{
										name: "Input",
										value: codeBlock(
											"js",
											Util.escapeCodeBlock(code).slice(0, 1024 - 9)
										),
									},
								],
							},
						],
					});
					break;
				default:
					void CustomClient.printToStderr(
						`Received unknown modal interaction ${interaction.customId}`
					);
			}
		}
	},
};
