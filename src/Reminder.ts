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

export type Params = { message: string; duration: number; userId: string };

export class Reminder extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		const sleep = step.sleep("Sleep", event.payload.duration);

		await step.do<void>("Store reminder", this.storeReminder.bind(this, event));
		rest.setToken(this.env.DISCORD_TOKEN);
		const channelId = await step.do(
			"Create dm channel",
			this.createDM.bind(this, event.payload.userId),
		);

		await sleep;
		await Promise.all([
			step.do<void>(
				"Send reminder",
				this.sendReminder.bind(this, channelId, event.payload.message),
			),
			step.do<void>("Delete reminder", this.deleteReminder.bind(this, event)),
		]);
	}

	private async storeReminder({
		instanceId,
		payload: { duration, message, userId },
	}: WorkflowEvent<Params>) {
		await this.env.DB.prepare(
			`INSERT INTO Reminders (id, date, userId, remind)
				VALUES (?1, datetime('now', '+' || ?2 || ' seconds'), ?3, ?4)`,
		)
			.bind(
				instanceId.slice(userId.length + 1),
				Math.round(duration / 1_000),
				userId,
				message,
			)
			.run();
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

	private async deleteReminder({
		instanceId,
		payload: { userId },
	}: WorkflowEvent<Params>) {
		await this.env.DB.prepare(
			`DELETE FROM Reminders
			WHERE id = ?1 AND userId = ?2`,
		)
			.bind(instanceId.slice(userId.length + 1), userId)
			.run();
	}
}
