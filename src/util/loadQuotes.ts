import { env } from "node:process";
import CustomClient from "./CustomClient";

export const loadQuotes = async (client: CustomClient<true>) => {
	const channel = client.channels.cache.get(env.QUOTES_CHANNEL!);

	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	if (!channel?.isTextBased()) return;
	for (const [id, { content }] of await channel.messages
		.fetch({ limit: 100 })
		.catch((err) => {
			CustomClient.printToStderr(err);
			return [];
		}))
		client.quotes.set(id, content);
};
