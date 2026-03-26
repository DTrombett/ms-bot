import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ButtonStyle,
	ComponentType,
	MessageFlags,
	Routes,
	type APIMessageTopLevelComponent,
	type RESTGetAPIChannelMessageResult,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { RegistrationMode, TournamentFlags } from "./util/Constants";
import { rest } from "./util/globals";
import normalizeError from "./util/normalizeError";
import { placeholder } from "./util/strings";
import { TimeUnit } from "./util/time";

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
					`SELECT registrationStart, registrationMode, flags
					FROM Tournaments WHERE id = ?`,
				)
					.bind(this.tournamentId)
					.first<
						Pick<
							Database.Tournament,
							"registrationStart" | "registrationMode" | "flags"
						>
					>();

				return (
						result?.registrationStart &&
							!(result.flags & TournamentFlags.RegistrationStarted) &&
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
						SELECT flags, name, minPlayers, registrationMode, registrationChannel, registrationMessageLink, logChannel,
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
							| "flags"
							| "logChannel"
							| "registrationChannel"
							| "registrationMessageLink"
							| "registrationMode"
							| "name"
							| "minPlayers"
						> & { participantCount: number }
					>();

				return (
						result?.registrationChannel &&
							result?.registrationMessageLink &&
							!(result.flags & TournamentFlags.RegistrationStarted) &&
							result.registrationMode & RegistrationMode.Discord
					) ?
						{
							logChannel: result.logChannel,
							channel: result.registrationChannel,
							message: result.registrationMessageLink.split("/") as [
								channelId: string,
								messageId: string,
							],
							count: result.participantCount,
							name: result.name,
							minPlayers: result.minPlayers,
						}
					:	null;
			});

			if (registration)
				try {
					await step.do<void>("Send registration message", async () => {
						const message = (await rest.get(
							Routes.channelMessage(...registration.message),
						)) as RESTGetAPIChannelMessageResult;
						const components: APIMessageTopLevelComponent[] = [];

						if (message.content)
							components.push({
								type: ComponentType.TextDisplay,
								content: placeholder(message.content, {
									iscritti: registration.count.toLocaleString("it-IT"),
									nome: registration.name,
									minimo: (registration.minPlayers ?? 0).toLocaleString(
										"it-IT",
									),
								}),
							});
						if (message.attachments.length)
							components.push({
								type: ComponentType.MediaGallery,
								items: message.attachments.map((a) => ({
									description: a.description,
									spoiler: a.filename.startsWith("SPOILER_"),
									media: { url: a.url },
								})),
							});
						components.push({
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									custom_id: `tournament-reg-${this.tournamentId}`,
									style: ButtonStyle.Success,
									emoji: {
										animated: true,
										// TODO: Change this before merging
										id: "1486438403997175928",
										name: "verified",
									},
									label: "Iscriviti",
								},
								{
									type: ComponentType.Button,
									custom_id: `tournament-unr-${this.tournamentId}`,
									style: ButtonStyle.Danger,
									label: "Annulla iscrizione",
								},
							],
						});
						await rest.post(Routes.channelMessages(registration.channel), {
							body: {
								flags: MessageFlags.IsComponentsV2,
								components,
							} satisfies RESTPostAPIChannelMessageJSONBody,
						});
					});
					this.ctx.waitUntil(
						step.do<void>("Update database flags", () =>
							this.env.DB.prepare(
								`UPDATE Tournaments
								SET flags = flags | ?1
								WHERE id = ?2
							`,
							)
								.bind(TournamentFlags.RegistrationStarted, this.tournamentId)
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
