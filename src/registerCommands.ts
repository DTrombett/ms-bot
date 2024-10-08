import { REST } from "@discordjs/rest";
import {
	APIApplicationCommand,
	APIVersion,
	Routes,
} from "discord-api-types/v10";
import { exit } from "node:process";
import * as commandsObject from "./commands";

const label = "Register slash commands";

console.time(label);
const rest = new REST({ version: APIVersion }).setToken(
	process.env.DISCORD_TOKEN!,
);
const commands = Object.values(commandsObject);
const [privateAPICommands, publicAPICommands] = await Promise.all([
	rest.put(
		Routes.applicationGuildCommands(
			process.env.DISCORD_APPLICATION_ID!,
			process.env.TEST_GUILD!,
		),
		{
			body: commands
				.filter((c) => process.env.NODE_ENV !== "production" || c.isPrivate)
				.flatMap((file) => file.data),
		},
	) as Promise<APIApplicationCommand[]>,
	process.env.NODE_ENV === "production"
		? (rest.put(
				Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID!),
				{
					body: commands
						.filter((c) => !c.isPrivate)
						.flatMap((file) => file.data),
				},
			) as Promise<APIApplicationCommand[]>)
		: [],
]);

console.log("Public commands:", publicAPICommands);
console.log("Private commands:", privateAPICommands);
console.timeEnd(label);
exit(0);
