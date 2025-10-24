import {
	ApplicationCommandType,
	type APIMessage,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import { timeout } from "../util/node.ts";
import { rest } from "../util/rest.ts";
import { idDiff, idToTimestamp } from "../util/time.ts";

export class Ping extends Command {
	static override chatInputData = {
		name: "ping",
		description: "Pong!",
		type: ApplicationCommandType.ChatInput,
	} satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override async chatInput(
		{ reply }: ChatInputReplies,
		{
			fullRoute,
			interaction: { id: interactionId },
			request: { cf: { colo, clientTcpRtt } = {} },
		}: ChatInputArgs,
	) {
		reply({
			content: `### 🏓\tPong!\n- Colo: **${colo as string}**\n- RTT: **${clientTcpRtt as number}ms**\n- Ping relativo: **${Date.now() - idToTimestamp(interactionId)}ms**`,
		});
		await timeout();
		const { id, content } = (await rest.get(fullRoute)) as APIMessage;

		return rest.patch(fullRoute, {
			body: {
				content: `${content}\n- Tempo totale: **${idDiff(id, interactionId)}ms**`,
			} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
		});
	}
}
