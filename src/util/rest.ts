import { REST } from "@discordjs/rest";
import { APIVersion } from "discord-api-types/v10";

export const rest = new REST({
	version: APIVersion,
	hashSweepInterval: 0,
	handlerSweepInterval: 0,
});
