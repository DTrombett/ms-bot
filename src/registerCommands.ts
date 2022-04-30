/* eslint-disable no-console */
import { REST } from "@discordjs/rest";
import type { APIApplicationCommand } from "discord-api-types/v10";
import { APIVersion, Routes } from "discord-api-types/v10";
import { config } from "dotenv";
import { promises } from "node:fs";
import { env, exit } from "node:process";
import { URL } from "node:url";
import type { CommandOptions } from "./util";
import Constants from "./util/Constants";

if (env.DISCORD_TOKEN == null) config();

console.time("Register slash commands");

const {
	DISCORD_CLIENT_ID: applicationId,
	DISCORD_TOKEN: token,
	TEST_GUILD: guildId,
	NODE_ENV: nodeEnv,
} = env;
const rest = new REST({ version: APIVersion }).setToken(token!);
const commands = await promises
	.readdir(new URL(Constants.commandsFolderName, import.meta.url))
	.then((fileNames) =>
		Promise.all(
			fileNames
				.filter((file): file is `${string}.js` => file.endsWith(".js"))
				.map(async (file) => {
					const fileData = (await import(
						`./${Constants.commandsFolderName}/${file}`
					)) as { command: CommandOptions };
					return fileData.command;
				})
		)
	);
const [privateAPICommands, publicAPICommands] = await Promise.all([
	rest
		.put(Routes.applicationGuildCommands(applicationId!, guildId!), {
			body: commands
				.filter((c) => nodeEnv !== "production" || c.isPublic !== true)
				.map((file) => file.data.toJSON()),
		})
		.then((registeredCommands) => {
			if (nodeEnv === "production") return registeredCommands;
			const privateCommands = commands.filter((c) => c.isPublic !== true);

			return (registeredCommands as APIApplicationCommand[]).filter((cmd) =>
				privateCommands.some((c) => c.data.name === cmd.name)
			);
		}) as Promise<APIApplicationCommand[]>,
	nodeEnv === "production"
		? (rest.put(Routes.applicationCommands(applicationId!), {
				body: commands
					.filter((c) => c.isPublic)
					.map((file) => file.data.toJSON()),
		  }) as Promise<APIApplicationCommand[]>)
		: [],
]);

console.log("Public commands:", publicAPICommands);
console.log("Private commands:", privateAPICommands);
console.timeEnd("Register slash commands");
exit(0);
