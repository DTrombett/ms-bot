import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ComponentType,
	MessageFlags,
	Routes,
	type RESTPatchAPIChannelMessageResult,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageResult,
} from "discord-api-types/v10";
import { RegistrationMode } from "./util/Constants";
import { rest } from "./util/globals";
import normalizeError from "./util/normalizeError";
import { TimeUnit } from "./util/time";
import { createRegistrationMessage } from "./util/tournaments/createRegistrationMessage";

export type Params = { id: number };

export class Tournament extends WorkflowEntrypoint<Env, Params> {
	private tournamentId!: number;
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		this.tournamentId = event.payload.id;
		const registrationStart = await step.do(
			"Get registration start time",
			async () => {
				const result = await this.env.DB.prepare(
					`SELECT registrationStart, registrationMode
					FROM Tournaments WHERE id = ?`,
				)
					.bind(this.tournamentId)
					.first<
						Pick<Database.Tournament, "registrationStart" | "registrationMode">
					>();

				return (
						result?.registrationStart &&
							result.registrationMode & RegistrationMode.Discord
					) ?
						result.registrationStart
					:	null;
			},
		);

		if (registrationStart) {
			if (registrationStart * TimeUnit.Second > Date.now() + TimeUnit.Second)
				await step.sleepUntil(
					"Wait for registration start",
					new Date(registrationStart * TimeUnit.Second),
				);
			const registration = await step.do("Get registration data", async () => {
				const result = await this.env.DB.prepare(
					`
						SELECT name, minPlayers, registrationMode, registrationChannel, registrationTemplateLink, logChannel, registrationMessage,
						(
							SELECT COUNT(*)
							FROM Participants
							WHERE tournamentId = Tournaments.id
						) AS participantCount
						FROM Tournaments WHERE id = ?
					`,
				)
					.bind(this.tournamentId)
					.first<
						Pick<
							Database.Tournament,
							| "logChannel"
							| "registrationChannel"
							| "registrationTemplateLink"
							| "registrationMode"
							| "name"
							| "registrationMessage"
							| "minPlayers"
						> & { participantCount: number }
					>();

				return (
						result?.registrationChannel &&
							result?.registrationTemplateLink &&
							result.registrationMode & RegistrationMode.Discord
					) ?
						{
							logChannel: result.logChannel,
							channel: result.registrationChannel,
							template: result.registrationTemplateLink,
							count: result.participantCount,
							name: result.name,
							minPlayers: result.minPlayers,
							message: result.registrationMessage,
						}
					:	null;
			});

			if (registration)
				try {
					const id = await step.do<string>(
						"Send registration message",
						async () =>
							rest[registration.message ? "patch" : "post"](
								Routes.channelMessages(registration.channel),
								{
									body: await createRegistrationMessage(
										this.tournamentId,
										registration.template,
										registration.count,
										registration.name,
										registration.minPlayers,
									),
								},
							).then(
								(m) =>
									(
										m as
											| RESTPostAPIChannelMessageResult
											// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
											| RESTPatchAPIChannelMessageResult
									).id,
							),
					);

					if (!registration.message)
						this.ctx.waitUntil(
							step.do<void>("Update database", () =>
								this.env.DB.prepare(
									`
										UPDATE Tournaments
										SET registrationMessage = ?1
										WHERE id = ?2
									`,
								)
									.bind(id, this.tournamentId)
									.run()
									.then(() => {}),
							),
						);
				} catch (error) {
					this.sendError(
						step,
						registration.logChannel,
						error,
						"Impossibile inviare il messaggio di iscrizione nel canale specificato",
					);
				}
		}
	}

	private sendError(
		step: WorkflowStep,
		channelId: string,
		error: unknown,
		message = "Si è verificato un errore",
	) {
		error = normalizeError(error);
		this.ctx.waitUntil(
			step.do<void>("Report error in logs channel", () =>
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
											content: `### ${message}\n\`\`\`\n${(error as Error).stack}\n\`\`\``,
										},
									],
								},
							],
						} satisfies RESTPostAPIChannelMessageJSONBody,
					})
					.then(() => {}),
			),
		);
	}
}
