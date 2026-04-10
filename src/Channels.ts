import { DiscordAPIError } from "@discordjs/rest";
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
	OverwriteType,
	PermissionFlagsBits,
	Routes,
	type APIMediaGalleryItem,
	type APIMessageTopLevelComponent,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIGuildChannelJSONBody,
	type RESTPostAPIGuildChannelResult,
} from "discord-api-types/v10";
import { rest } from "./util/globals";
import normalizeError from "./util/normalizeError";
import { placeholder } from "./util/strings";

export type Params = {
	matches: MatchWithPlayers[];
	tournament: Database.Tournament;
	content?: string;
	attachments?: APIMediaGalleryItem[];
};

export class Channels extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		let parent_id = event.payload.tournament.categoryId;
		const values: Promise<void>[] = [];
		const cases: [string, [number, string]][] = [];
		for (const match of event.payload.matches)
			try {
				let channelName = event.payload.tournament.channelName;
				const channelId = await step.do<string>(
					`Create channel for match ${match.id}`,
					{ retries: { limit: 1, delay: 5_000 } },
					async () => {
						try {
							const { id } = (await rest.post(
								Routes.guildChannels(this.env.MAIN_GUILD),
								{
									body: {
										name: placeholder(
											channelName ?? "{matchID}-{player1}-vs-{player2}",
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
										type: ChannelType.GuildText,
										permission_overwrites: [
											{
												id: this.env.MAIN_GUILD,
												type: OverwriteType.Role,
												deny: String(PermissionFlagsBits.ViewChannel),
											},
											{
												id: match.user1,
												type: OverwriteType.Member,
												allow: String(PermissionFlagsBits.ViewChannel),
											},
											{
												id: match.user2!,
												type: OverwriteType.Member,
												allow: String(PermissionFlagsBits.ViewChannel),
											},
											{
												// TODO: Add this as option to tournament
												id: "1484914959673463004",
												type: OverwriteType.Role,
												allow: String(PermissionFlagsBits.ViewChannel),
											},
											...this.env.ALLOWED_ROLES.split(",").map((id) => ({
												id,
												type: OverwriteType.Role,
												allow: String(
													PermissionFlagsBits.ViewChannel |
														PermissionFlagsBits.ManageChannels,
												),
											})),
										],
										parent_id,
									} satisfies RESTPostAPIGuildChannelJSONBody,
								},
							)) as RESTPostAPIGuildChannelResult;

							return id;
						} catch (err) {
							if (
								err instanceof DiscordAPIError &&
								"errors" in err.rawError &&
								typeof err.rawError.errors === "object"
							) {
								if ("parent_id" in err.rawError.errors) parent_id = null;
								if ("name" in err.rawError.errors)
									channelName = "{matchId}-torneo-{tournamentId}";
							}
							throw err;
						}
					},
				);
				const components: APIMessageTopLevelComponent[] = [];

				cases.push([
					`WHEN ?${(cases.length + 1) * 2} THEN ?${(cases.length + 1) * 2 + 1}`,
					[match.id, channelId],
				]);
				if (event.payload.content)
					components.push({
						type: ComponentType.TextDisplay,
						content: placeholder(event.payload.content, {
							matchID: match.id.toString(),
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
				if (components.length > 1)
					values.push(
						step.do<void>(
							`Send message to channel ${channelId}`,
							{ retries: { limit: 1, delay: 5_000 } },
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
			} catch (err) {
				this.sendError(
					step,
					event.payload.tournament.logChannel,
					err,
					`Impossibile creare il canale per il match ${match.id}: ${match.user1Name} (<@${match.user1}> ${match.user1Tag}) VS ${match.user2Name} (<@${match.user1}> ${match.user2Tag})`,
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
