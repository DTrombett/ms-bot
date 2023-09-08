import { Snowflake } from "discord.js";
import { CustomClient } from "../util";

export const remind = async (client: CustomClient, user: Snowflake, text: string) => {
	await client.users.send(user, `⏰ **Promemoria**: ${text}`);
};
