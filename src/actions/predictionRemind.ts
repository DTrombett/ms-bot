import { Snowflake } from "discord.js";
import { CustomClient } from "../util";

export const predictionRemind = async (
	client: CustomClient,
	user: Snowflake,
) => {
	await client.users.send(
		user,
		"⚽ È tempo di inviare i pronostici per la prossima giornata!",
	);
};
