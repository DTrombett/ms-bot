import { env } from "cloudflare:workers";
import { QueueMessageType } from "./Constants";
import { editMessage } from "./tournaments/editMessage";

export const queueHandlers: {
	[T in QueueMessageType]: (
		message: Readonly<Message<Extract<QueueMessage, { t: T }>>>,
		batch: MessageBatch<QueueMessage>,
	) => Awaitable<void>;
} = {
	[QueueMessageType.Ack]: () => {},
	[QueueMessageType.TournamentMessageEdit]: async (message, batch) => {
		for (const m of batch.messages.filter(
			(m) =>
				m.id !== message.id &&
				m.body.t === message.body.t &&
				m.body.d.id === message.body.d.id,
		))
			m.body.t = QueueMessageType.Ack;
		const tournament = await env.DB.prepare(
			`
				SELECT id, maxPlayers, minPlayers, name, participantCount,
					registrationChannel, registrationMessage, registrationStart,
					registrationEnd, registrationTemplateLink
				FROM Tournaments WHERE id = ?
			`,
		)
			.bind(message.body.d.id)
			.first<
				Pick<
					Database.Tournament,
					| "id"
					| "maxPlayers"
					| "minPlayers"
					| "name"
					| "participantCount"
					| "registrationChannel"
					| "registrationMessage"
					| "registrationStart"
					| "registrationEnd"
					| "registrationTemplateLink"
				>
			>();

		if (!tournament) {
			// Do not retry when tournament is not found
			message.ack();
			throw new Error("Tournament not found");
		}
		await editMessage(tournament);
	},
};
