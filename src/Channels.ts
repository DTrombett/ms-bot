import { DiscordAPIError } from "@discordjs/rest";
import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ChannelType,
	ComponentType,
	MessageFlags,
	OverwriteType,
	PermissionFlagsBits,
	Routes,
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
};

export class Channels extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		let parent_id = event.payload.tournament.categoryId;

		for (const match of event.payload.matches) {
			// TODO: send message
			await step.do(`Create channel for match ${match.id}`, async () => {
				try {
					const { id } = (await rest.post(
						Routes.guildChannels(this.env.MAIN_GUILD),
						{
							body: {
								name: placeholder(
									event.payload.tournament.channelName ??
										"{matchID}-{player1}-vs-{player2}",
									{
										matchID: match.id.toString(),
										id1: match.user1,
										id2: match.user2!,
										tag1: match.user1Tag?.slice(1) ?? "",
										tag2: match.user2Tag?.slice(1) ?? "",
										player1: match.user1Name ?? "",
										player2: match.user2Name ?? "",
									},
								),
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
						typeof err.rawError.errors === "object" &&
						"parent_id" in err.rawError.errors
					)
						parent_id = null;
					throw err;
				}
			});
		}
	}

	private sendError = (
		step: WorkflowStep,
		channelId: string,
		error: unknown,
		message = "Si è verificato un errore",
	) => {
		const id = crypto.randomUUID();

		error = normalizeError(error);
		this.ctx.waitUntil(
			step.do<void>(`Report error ${id} in logs channel`, () =>
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
											content: `### ${message} (${id})\n\`\`\`\n${(error as Error).stack}\n\`\`\``,
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
