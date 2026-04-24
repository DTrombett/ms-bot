import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	Routes,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPICurrentUserCreateDMChannelJSONBody,
	type RESTPostAPICurrentUserCreateDMChannelResult,
} from "discord-api-types/v10";
import { rest } from "./util/globals";

export type Params = {
	message: RESTPostAPIChannelMessageJSONBody;
	remind: string;
	timestamp: number;
	userId: string;
};

export class Reminder extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		await step.do<void>("Store reminder", this.storeReminder.bind(this, event));
		const channelId = await step.do(
			"Create dm channel",
			this.createDM.bind(this, event.payload.userId),
		);

		if (event.payload.timestamp > Date.now())
			await step.sleepUntil("Sleep", new Date(event.payload.timestamp));
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
		payload: { timestamp, remind, userId },
	}: WorkflowEvent<Params>) {
		await this.env.DB.prepare(
			`
				INSERT INTO Reminders (id, timestamp, userId, remind)
				VALUES (?1, ?2, ?3, ?4)
			`,
		)
			.bind(instanceId.slice(userId.length + 1), timestamp, userId, remind)
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

	private async sendReminder(
		channelId: string,
		body: RESTPostAPIChannelMessageJSONBody,
	) {
		await rest.post(Routes.channelMessages(channelId), { body });
	}

	private async deleteReminder({
		instanceId,
		payload: { userId },
	}: WorkflowEvent<Params>) {
		await this.env.DB.prepare(
			`DELETE FROM Reminders WHERE id = ?1 AND userId = ?2`,
		)
			.bind(instanceId.slice(userId.length + 1), userId)
			.run();
	}
}
