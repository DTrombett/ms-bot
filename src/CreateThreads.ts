import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ButtonStyle,
	ChannelType,
	ComponentType,
	MessageFlags,
	Routes,
	type APIMediaGalleryItem,
	type APIMessageTopLevelComponent,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelThreadsJSONBody,
	type RESTPostAPIChannelThreadsResult,
} from "discord-api-types/v10";
import { rest } from "./util/globals";
import normalizeError from "./util/normalizeError";
import { placeholder } from "./util/strings";

export type Params = {
	tournament: Database.Tournament;
	content?: string;
	attachments?: APIMediaGalleryItem[];
	min: number;
	max: number;
};

export class CreateThreads extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		const results = await step.do(
			"Fetch matches",
			{ timeout: "20 seconds" },
			async () => {
				const { results } = await this.env.DB.prepare(
					`
						SELECT m.*,
							p1.tag		AS	user1Tag,
							sp1.name	AS	user1Name,
							p2.tag		AS	user2Tag,
							sp2.name	AS	user2Name
						FROM Matches m
							LEFT JOIN Participants p1 ON p1.tournamentId = m.tournamentId
							AND p1.userId	=	m.user1
							LEFT JOIN SupercellPlayers sp1 ON sp1.userId = p1.userId
							AND sp1.tag		=	p1.tag
							LEFT JOIN Participants p2 ON p2.tournamentId = m.tournamentId
							AND p2.userId	=	m.user2
							LEFT JOIN SupercellPlayers sp2 ON sp2.userId = p2.userId
							AND sp2.tag		=	p2.tag
						WHERE m.tournamentId = ?1 AND m.id BETWEEN ?2 AND ?3
							AND m.messageSent = FALSE AND m.user2 IS NOT NULL
						ORDER BY m.id
					`,
				)
					.bind(
						event.payload.tournament.id,
						event.payload.min,
						event.payload.max,
					)
					.run<MatchWithPlayers>();

				return results;
			},
		);
		const values: Promise<void>[] = [];
		const cases: [string, [number, string]][] = [];
		for (const match of results)
			try {
				const channelId = await step.do<string>(
					`Create thread for match ${match.id}`,
					{ retries: { limit: 0, delay: 0 }, timeout: "5 minutes" },
					async () =>
						(
							(await rest.post(
								Routes.threads(event.payload.tournament.categoryId!),
								{
									reason: `Creazione thread per lo scontro ${match.id} (<@${match.user1}> VS <@${match.user2}>)`,
									body: {
										name: placeholder(
											event.payload.tournament.channelName ??
												"{matchId}: {player1} VS {player2}",
											{
												matchId: match.id.toString(),
												tournamentId: event.payload.tournament.id.toString(),
												id1: match.user1,
												id2: match.user2!,
												tag1: match.user1Tag?.slice(1) ?? "",
												tag2: match.user2Tag?.slice(1) ?? "",
												player1: match.user1Name ?? "",
												player2: match.user2Name ?? "",
											},
										).slice(0, 100),
										type: ChannelType.PrivateThread,
										invitable: false,
										rate_limit_per_user: 0,
									} satisfies RESTPostAPIChannelThreadsJSONBody,
								},
							)) as RESTPostAPIChannelThreadsResult
						).id,
				);

				if (event.payload.content || event.payload.attachments?.length) {
					const components: APIMessageTopLevelComponent[] = [];

					cases.push([
						`WHEN ?${(cases.length + 1) * 2} THEN ?${(cases.length + 1) * 2 + 1}`,
						[match.id, channelId],
					]);
					if (event.payload.content)
						components.push({
							type: ComponentType.TextDisplay,
							content: placeholder(event.payload.content, {
								matchId: match.id.toString(),
								id1: match.user1,
								id2: match.user2!,
								tag1: match.user1Tag?.slice(1) ?? "",
								tag2: match.user2Tag?.slice(1) ?? "",
								player1: match.user1Name ?? "",
								player2: match.user2Name ?? "",
							}),
						});
					if (event.payload.attachments?.length)
						components.push({
							type: ComponentType.MediaGallery,
							items: event.payload.attachments,
						});
					components.push({
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `tournament-che-${match.id}-${event.payload.tournament.id}`,
								style: ButtonStyle.Success,
								emoji: { name: "✅" },
								label: "Controlla risultati",
							},
						],
					});
					values.push(
						step.do<void>(
							`Send message to thread ${channelId}`,
							{ retries: { limit: 0, delay: 0 } },
							() =>
								rest
									.post(Routes.channelMessages(channelId), {
										body: {
											flags: MessageFlags.IsComponentsV2,
											components,
										} satisfies RESTPostAPIChannelMessageJSONBody,
									})
									.then(() => {}),
						),
					);
				}
			} catch (err) {
				if (
					err instanceof Error &&
					err.message.startsWith(
						"Too many subrequests by single Worker invocation.",
					)
				) {
					break;
				}
				this.sendError(
					step,
					event.payload.tournament.logChannel,
					err,
					`Impossibile creare il canale per il match ${match.id}: ${match.user1Name} (<@${match.user1}> ${match.user1Tag}) VS ${match.user2Name} (<@${match.user2}> ${match.user2Tag})`,
				);
			}
		if (cases.length)
			try {
				await step.do<void>("Update database", () =>
					this.env.DB.prepare(
						`
							UPDATE Matches
							SET channelId = CASE id
								${cases.map(([c]) => c).join("\n")}
							END
							WHERE tournamentId = ?1 AND id IN (${cases.map((_, i) => `?${(i + 1) * 2}`).join(",")})
						`,
					)
						.bind(event.payload.tournament.id, ...cases.flatMap(([, c]) => c))
						.run()
						.then(() => {}),
				);
			} catch (err) {
				this.sendError(
					step,
					event.payload.tournament.logChannel,
					err,
					"Impossibile aggiornare il database",
				);
			}
		const errors = (await Promise.allSettled(values))
			.filter((v) => v.status === "rejected")
			.map((v): unknown => v.reason);

		if (errors.length)
			this.sendError(
				step,
				event.payload.tournament.logChannel,
				new Error(
					`Impossibile inviare ${errors.length.toLocaleString("it-IT")} messaggi su ${values.length.toLocaleString("it-IT")}`,
					{ cause: errors },
				),
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
