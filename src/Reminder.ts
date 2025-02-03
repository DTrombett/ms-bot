import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	Routes,
	type RESTPostAPICurrentUserCreateDMChannelJSONBody,
	type RESTPostAPICurrentUserCreateDMChannelResult,
} from "discord-api-types/v10";
import { rest, type Env } from "./util";

export type Params = { message: string; seconds: number; userId: string };

export class Reminder extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		const [channelId] = await Promise.all([
			step.do(
				"Create dm channel",
				this.createDM.bind(this, event.payload.userId),
			),
			step.sleep("Sleep", event.payload.seconds),
		]);

		rest.setToken(this.env.DISCORD_TOKEN);
		await step.do<void>(
			"Send reminder",
			this.sendReminder.bind(this, channelId, event.payload.message),
		);
	}

	private async createDM(recipient_id: string) {
		const { id } = (await rest.post(Routes.userChannels(), {
			body: {
				recipient_id,
			} satisfies RESTPostAPICurrentUserCreateDMChannelJSONBody,
		})) as RESTPostAPICurrentUserCreateDMChannelResult;

		return id;
	}

	private async sendReminder(channelId: string, message: string) {
		await rest.post(Routes.channelMessages(channelId), {
			body: { content: `🔔 Promemoria: ${message}` },
		});
	}
}
