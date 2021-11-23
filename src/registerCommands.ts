import { REST } from "@discordjs/rest";
import { APIVersion, Routes } from "discord-api-types/v9";
import { config } from "dotenv";
import { promises } from "node:fs";
import { join } from "node:path";
import type { CommandOptions } from "./util";
import Constants from "./util";

console.time(Constants.RegisterCommands);

config({ path: join(__dirname, "../.env") });

const {
	DISCORD_CLIENT_ID: applicationId,
	TEST_GUILD: guildId,
	DISCORD_TOKEN: token,
	GLOBAL_COMMANDS,
} = process.env;
const registerGlobal = GLOBAL_COMMANDS === "true";

void promises
	.readdir(join(__dirname, Constants.Commands))
	.then((files) =>
		Promise.all(
			files
				.filter((file): file is `${string}.js` => file.endsWith(".js"))
				.map(async (file) => {
					const fileData = (await import(
						join(__dirname, Constants.Commands, file)
					)) as { command: CommandOptions };
					return fileData;
				})
		)
	)
	.then((files) =>
		new REST({ version: APIVersion })
			.setToken(token!)
			.put(
				registerGlobal
					? Routes.applicationCommands(applicationId!)
					: Routes.applicationGuildCommands(applicationId!, guildId!),
				{
					body: (registerGlobal
						? files.filter((file) => !(file.command.reserved ?? false))
						: files
					).map((file) => file.command.data.toJSON()),
				}
			)
	)
	.then((res) => {
		console.log(res);
		console.timeEnd(Constants.RegisterCommands);
	});
