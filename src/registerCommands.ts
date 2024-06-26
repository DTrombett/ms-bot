import { REST } from "@discordjs/rest";
import {
	APIApplicationCommand,
	APIVersion,
	Routes,
} from "discord-api-types/v10";
import { config } from "dotenv";
import { env, exit } from "node:process";
import * as commandsObject from "./commands";
import { EnvVars } from "./util";

const label = "Register slash commands";

if (!("DISCORD_TOKEN" in env)) config({ path: ".dev.vars" });
console.time(label);

const {
	DISCORD_APPLICATION_ID: applicationId,
	DISCORD_TOKEN: token,
	TEST_GUILD: guildId,
	NODE_ENV: nodeEnv,
} = env as EnvVars;
const rest = new REST({ version: APIVersion }).setToken(token);
const commands = Object.values(commandsObject);
const [privateAPICommands, publicAPICommands] = await Promise.all([
	rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
		body: commands
			.filter((c) => nodeEnv !== "production" || c.isPrivate)
			.flatMap((file) => file.data),
	}) as Promise<APIApplicationCommand[]>,
	nodeEnv === "production"
		? (rest.put(Routes.applicationCommands(applicationId), {
				body: commands.filter((c) => !c.isPrivate).flatMap((file) => file.data),
			}) as Promise<APIApplicationCommand[]>)
		: [],
]);

console.log("Public commands:", publicAPICommands);
console.log("Private commands:", privateAPICommands);
console.timeEnd(label);
exit(0);
