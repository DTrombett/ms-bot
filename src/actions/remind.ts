import { Snowflake } from "discord.js";
import { CustomClient } from "../util";

export const remind = (client: CustomClient, user: Snowflake, text: string) =>
	client.users.send(user, `⏰ **Promemoria**: ${text}`);
