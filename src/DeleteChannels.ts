import { DiscordAPIError } from "@discordjs/rest";
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
		const errors: { reason: Error; channel: string }[] = [];

		for (const channelId of event.payload.channels)
			try {
				await step.do(
					`Delete channel ${channelId}`,
					{ retries: { limit: 1, delay: 5_000 } },
					() => rest.delete(Routes.channel(channelId)).then(() => {}),
				);
				toDelete.push(channelId);
			} catch (err) {
				if (err instanceof DiscordAPIError && err.code === 10003)
					toDelete.push(channelId);
				else errors.push({ channel: channelId, reason: normalizeError(err) });
			}
		if (toDelete.length)
			await step.do<void>("Update channelId in database", () =>
				this.env.DB.prepare(
					`
						UPDATE Matches SET channelId = NULL
						WHERE channelId IN (${new Array(toDelete.length).fill("?").join(",")})
					`,
				)
					.bind(...toDelete)
					.run()
					.then(() => {}),
			);
		if (errors.length)
			await step.do(
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
												content: `Impossibile eliminare i seguenti canali: ${errors.map((e) => `<#${e.channel}>`).join(", ")}`,
											},
											{
												type: ComponentType.TextDisplay,
												content: `\`\`\`\n${errors
													.map((e) => e.reason.stack)
													.join("\n")
													.slice(0, 3992)}\n\`\`\``,
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
