import { REST } from "@discordjs/rest";
import Cloudflare from "cloudflare";
import { env } from "cloudflare:workers";
import { APIVersion } from "discord-api-types/v10";

export const rest = new REST({
	version: APIVersion,
	hashSweepInterval: 0,
	handlerSweepInterval: 0,
}).setToken(env.DISCORD_TOKEN);
export const cloudflare = new Cloudflare({
	apiToken: env.CLOUDFLARE_API_KEY,
	maxRetries: 4,
});
