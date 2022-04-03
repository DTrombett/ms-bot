import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { ActionMethod } from "../types";

/**
 * Calculate the love percentage of two users.
 * @param _client - The client
 * @param user1Id - The first user's id
 * @param user2Id - The second user's id
 * @param discriminator1 - The first user's discriminator
 * @param discriminator2 - The second user's discriminator
 */
export const love: ActionMethod<
	"love",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (_client, user1Id, user2Id, discriminator1, discriminator2) => {
	const bigint1 = BigInt(user1Id) * BigInt(discriminator1);
	const bigint2 = BigInt(user2Id) * BigInt(discriminator2);

	return {
		content: `❤️ L'amore tra <@${user1Id}> e <@${user2Id}> è del ${
			bigint1 > bigint2
				? (bigint2 * 100n) / bigint1
				: (bigint1 * 100n) / bigint2
		}% ❤️`,
	};
};
