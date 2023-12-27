import { env } from "node:process";
import CustomClient from "./CustomClient";
import { printToStderr } from "./logger";

export const loadQuotes = async (client: CustomClient<true>) => {
	const channel = client.channels.cache.get(env.QUOTES_CHANNEL!);

	if (!channel?.isTextBased()) return;
	await channel.messages.fetch({ limit: 100 }).catch((err) => {
		printToStderr(err);
	});
};
