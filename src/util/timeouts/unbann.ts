import type { Snowflake } from "discord-api-types/v10";
import type CustomClient from "../CustomClient";

declare const client: CustomClient;

const unbann = (guildId: Snowflake, userId: Snowflake) =>
	Promise.resolve(
		client.guilds.cache
			.get(guildId)
			?.members.unban(userId, "Bann temporaneo")
			.catch(() => null) ?? null
	);

export default unbann;
