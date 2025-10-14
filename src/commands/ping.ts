import {
	ApplicationCommandType,
	Routes,
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
		{ interaction, request }: ChatInputArgs,
	) {
		const content = `### 🏓\tPong!\n- Colo: **${request.cf?.colo as string}**\n- RTT: **${request.cf?.clientTcpRtt as number}ms**\n- Ping relativo: **${Date.now() - idToTimestamp(interaction.id)}ms**`;

		reply({ content });
		await timeout();
		const { id } = (await rest.get(
			Routes.webhookMessage(interaction.application_id, interaction.token),
		)) as APIMessage;
		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: {
					content: `${content}\n- Tempo totale: **${idDiff(id, interaction.id)}ms**`,
				} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			},
		);
	}
}
