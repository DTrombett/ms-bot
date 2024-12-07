import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ButtonStyle,
	RESTPostAPICurrentUserCreateDMChannelJSONBody,
	RESTPostAPICurrentUserCreateDMChannelResult,
	Routes,
} from "discord-api-types/v10";
import ms from "ms";
import {
	loadMatches,
	rest,
	type Env,
	type MatchDayResponse,
	type User,
} from "./util";

type Params = {
	matchDay?: { day: number; id: number };
};

export class PredictionsReminders extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		const matchDay =
			event.payload.matchDay ??
			(await step.do("get match day", this.getMatchDay));

		if (!matchDay) {
			console.log("No match day available");
			return;
		}
		const startTime = await step.do(
			"get match day start time",
			this.getMatches.bind(this, matchDay),
		);
		const diff = startTime - event.timestamp.getTime();

		if (diff > 12 * 60 * 60 * 1_000) {
			console.log(`Next match day is in ${ms(diff, { long: true })}`);
			return;
		}
		if (diff > 1_000) {
			const reminders = await step.do(
				"get prediction reminders",
				this.getReminders.bind(this, startTime),
			);

			rest.setToken(this.env.DISCORD_TOKEN);
			for (const [recipient_id, date] of reminders) {
				await step.sleepUntil(`${recipient_id} reminder`, date);
				const channelId = await step.do(
					`create ${recipient_id} dm channel`,
					this.createDM.bind(this, recipient_id),
				);

				await step.do<void>(
					`send ${recipient_id} reminder`,
					this.sendReminder.bind(this, channelId, matchDay, startTime),
				);
			}
		}
		await step.sleepUntil("match day start", startTime);
	}

	// TODO: Check if alreaday started
	private async getMatchDay(this: void) {
		const matchDays = await fetch(
			`https://legaseriea.it/api/season/${this.env.SEASON_ID}/championship/A/matchday`,
		).then<MatchDayResponse>((res) => res.json());

		if (!matchDays.success) throw new Error(matchDays.message);
		const md = matchDays.data.find((d) => d.category_status === "TO BE PLAYED");

		return md && { day: Number(md.description), id: md.id_category };
	}

	private async getMatches(day: { day: number; id: number }) {
		const matches = await loadMatches(day.id, 1);

		return Date.parse(matches[0]!.date_time) - 15 * 60 * 1000;
	}

	private async getReminders(startTime: number) {
		const { results } = await this.env.DB.prepare(
			`SELECT u.id, u.remindMinutes
				FROM Users u
				WHERE u.remindMinutes > 0`,
		).all<Pick<User, "id" | "remindMinutes">>();

		return results
			.sort((a, b) => b.remindMinutes! - a.remindMinutes!)
			.map<
				[recipient_id: string, date: number]
			>((u) => [u.id, startTime - u.remindMinutes! * 60 * 1000]);
	}

	// TODO: Extract this to a RPC?
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
		matchDay: { day: number; id: number },
		startTime: number,
	) {
		await rest.post(Routes.channelMessages(channelId), {
			body: {
				content: "⚽ È l'ora di inviare i pronostici per la prossima giornata!",
				components: [
					new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setCustomId(
									`predictions-${Number(matchDay.day)}-1-${startTime}`,
								)
								.setEmoji({ name: "⚽" })
								.setLabel("Invia pronostici")
								.setStyle(ButtonStyle.Primary),
							new ButtonBuilder()
								.setURL("https://ms-bot.trombett.org/predictions")
								.setEmoji({ name: "🌐" })
								.setLabel("Utilizza la dashboard")
								.setStyle(ButtonStyle.Link),
						)
						.toJSON(),
				],
			},
		});
	}
}
