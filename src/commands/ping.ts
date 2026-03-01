import {
	ApplicationCommandType,
	type APIMessage,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";
import { rest } from "../util/globals";
import { timeout } from "../util/node";
import { idDiff, idToTimestamp } from "../util/time";

export class Ping extends Command {
	static override chatInputData = {
		name: "ping",
		description: "Pong!",
		type: ApplicationCommandType.ChatInput,
	} satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override async chatInput(
		{ reply, edit }: ChatInputReplies,
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

		return edit({
			content: `${content}\n- Tempo totale: **${idDiff(id, interactionId)}ms**`,
		});
	}
}
