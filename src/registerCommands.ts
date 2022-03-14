import { REST } from "@discordjs/rest";
import type {
	APIApplicationCommand,
	APIGuildApplicationCommandPermissions,
} from "discord-api-types/v9";
import { APIVersion, Routes } from "discord-api-types/v9";
import { EnumResolvers } from "discord.js";
import { promises } from "node:fs";
import { env } from "node:process";
import { URL } from "node:url";
import type { CommandOptions } from "./util";
import Constants, { CustomClient } from "./util";

console.time("Register slash commands");

const {
	DISCORD_CLIENT_ID: applicationId,
	DISCORD_TOKEN: token,
	TEST_GUILD: guildId,
	NODE_ENV: nodeEnv,
} = env;
const rest = new REST({ version: APIVersion }).setToken(token!);
const commands = await promises
	.readdir(new URL(Constants.commandsFolderName(), import.meta.url))
	.then((fileNames) =>
		Promise.all(
			fileNames
				.filter((file): file is `${string}.js` => file.endsWith(".js"))
				.map(async (file) => {
					const fileData = (await import(
						`./${Constants.commandsFolderName()}/${file}`
					)) as { command: CommandOptions };
					return fileData.command;
				})
		)
	);
let privateAPICommands: APIApplicationCommand[];

if (nodeEnv === "production")
	[privateAPICommands] = await Promise.all([
		rest.put(Routes.applicationGuildCommands(applicationId!, guildId!), {
			body: commands
				.filter((c) => c.isPublic !== true)
				.map((file) => file.data.toJSON()),
		}) as Promise<APIApplicationCommand[]>,
		rest.put(Routes.applicationCommands(applicationId!), {
			body: commands
				.filter((c) => c.isPublic)
				.map((file) => file.data.toJSON()),
		}),
	]);
else
	privateAPICommands = await rest
		.put(Routes.applicationGuildCommands(applicationId!, guildId!), {
			body: commands.map((file) => file.data.toJSON()),
		})
		.then((registeredCommands) => {
			const privateCommands = commands.filter((c) => c.isPublic !== true);

			return (registeredCommands as APIApplicationCommand[]).filter((cmd) =>
				privateCommands.some((c) => c.data.name === cmd.name)
			);
		});

await rest.put(
	Routes.guildApplicationCommandsPermissions(applicationId!, guildId!),
	{
		body: privateAPICommands.map<APIGuildApplicationCommandPermissions>(
			(command) => ({
				application_id: applicationId!,
				guild_id: guildId!,
				id: command.id,
				permissions: [
					{
						id: env.OWNER_ID!,
						type: EnumResolvers.resolveApplicationCommandPermissionType("USER"),
						permission: true,
					},
				],
			})
		),
	}
);

// TODO: Log all the commands
await CustomClient.printToStdout(privateAPICommands);
console.timeEnd("Register slash commands");
