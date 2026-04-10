import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ComponentType,
	MessageFlags,
	Routes,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { rest } from "./util/globals";
import normalizeError from "./util/normalizeError";

export type Params = { channels: string[]; logChannel: string };

export class DeleteChannels extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		const toDelete: string[] = [];

		for (const channelId of event.payload.channels)
			try {
				await step.do<void>(
					`Delete channel ${channelId}`,
					{ retries: { limit: 1, delay: 5_000 } },
					() => rest.delete(Routes.channel(channelId)).then(() => {}),
				);
				toDelete.push(channelId);
			} catch (err) {
				this.sendError(
					step,
					event.payload.logChannel,
					err,
					`Impossibile eliminare il canale ${channelId}`,
				);
			}
		await step.do<void>("Update channelId in database", () =>
			this.env.DB.prepare(
				`
					UPDATE Matches
					SET channelId = NULL
					WHERE channelId IN (${new Array(toDelete.length).fill("?").join(",")})
				`,
			)
				.bind(...toDelete)
				.run()
				.then(() => {}),
		);
	}

	private sendError = (
		step: WorkflowStep,
		channelId: string,
		error: unknown,
		message?: string,
	) => {
		const id = crypto.randomUUID();

		error = normalizeError(error);
		this.ctx.waitUntil(
			step.do<void>(
				`Report error ${id} in logs channel`,
				{ retries: { limit: 1, delay: 5_000 } },
				() =>
					rest
						.post(Routes.channelMessages(channelId), {
							body: {
								flags: MessageFlags.IsComponentsV2,
								components: [
									{
										type: ComponentType.Container,
										accent_color: 0xff0000,
										components: [
											{
												type: ComponentType.TextDisplay,
												content: `${message ? `### ${message}\n` : ""}\`\`\`\n${(error as Error).stack?.slice(0, 3952 - (message ? message.length + 5 : 0))}\n\`\`\`\n-# ${id}`,
											},
										],
									},
								],
							} satisfies RESTPostAPIChannelMessageJSONBody,
						})
						.then(() => {}),
			),
		);
	};
}
