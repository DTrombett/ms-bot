import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ComponentType,
	MessageFlags,
	Routes,
	type RESTPatchAPIChannelJSONBody,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { rest } from "./util/globals";
import normalizeError from "./util/normalizeError";

export type Params = { channels: string[]; logChannel: string };

export class LockThreads extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		const results = await Promise.allSettled(
			event.payload.channels.map((channelId) =>
				step.do<void>(
					`Lock thread ${channelId}`,
					{ retries: { limit: 1, delay: 5_000 } },
					() =>
						rest
							.patch(Routes.channel(channelId), {
								body: {
									archived: true,
									locked: true,
								} satisfies RESTPatchAPIChannelJSONBody,
							})
							.then(() => {}),
				),
			),
		);
		const errors = results
			.filter((r) => r.status === "rejected")
			.map((r): unknown => r.reason);

		if (errors.length)
			await step.do<void>(
				"Report errors in logs channel",
				{ retries: { limit: 1, delay: 5_000 } },
				() =>
					rest
						.post(Routes.channelMessages(event.payload.logChannel), {
							body: {
								flags: MessageFlags.IsComponentsV2,
								components: [
									{
										type: ComponentType.Container,
										accent_color: 0xff0000,
										components: [
											{
												type: ComponentType.TextDisplay,
												content: `### Impossibile bloccare ${errors.length}/${event.payload.channels.length} thread\n${errors
													.map(
														(error) =>
															`\`\`\`\n${normalizeError(error).stack}\n\`\`\``,
													)
													.join("\n")
													?.slice(0, 3962)}`,
											},
										],
									},
								],
							} satisfies RESTPostAPIChannelMessageJSONBody,
						})
						.then(() => {}),
			);
	}
}
