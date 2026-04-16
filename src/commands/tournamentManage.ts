import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	PermissionFlagsBits,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";
import { DBMatchStatus, TournamentStatusFlags } from "../util/Constants";
import { displayMatchScore, patchMatch } from "../util/tournaments/patchMatch";

export class TournamentManage extends Command {
	static override chatInputData = {
		name: "tournament-manage",
		description: "Gestisci i tornei",
		default_member_permissions: String(PermissionFlagsBits.ManageGuild),
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "advance",
				description: "Avanza al prossimo round",
				options: [
					{
						type: ApplicationCommandOptionType.Number,
						name: "tournament",
						description: "L'id del torneo",
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "abandoned",
				description:
					"Segna un abbandono. In caso di doppio abbandono non passare opzioni. Le opzioni sono mutualmente esclusive!",
				options: [
					{
						type: ApplicationCommandOptionType.User,
						name: "winner",
						description: "L'utente che vince per abbandono dell'avversario",
					},
					{
						type: ApplicationCommandOptionType.User,
						name: "user",
						description: "L'utente che ha abbandonato",
					},
					{
						type: ApplicationCommandOptionType.Boolean,
						name: "remove",
						description: "Rimuovi l'abbandono",
					},
				],
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static advance = async (
		{ defer, edit }: ChatInputReplies,
		{
			options: { tournament },
		}: ChatInputArgs<typeof TournamentManage.chatInputData, "advance">,
	) => {
		defer();
		const { results } = await env.DB.prepare(
			`
				SELECT t.currentRound, t.id, t.name,
				(
					SELECT COUNT(*)
					FROM Matches m
					WHERE m.tournamentId = t.id
					  AND (m.status = ?3 OR m.status = ?4)
					  AND m.id BETWEEN
						  ((1 << t.currentRound) - 1)
						  AND
						  ((1 << (t.currentRound + 1)) - 2)
				) AS pendingMatches
				FROM Tournaments t
				WHERE (t.id = ?1) OR (?1 IS NULL AND t.currentRound IS NOT NULL AND (t.statusFlags & ?2) = 0)
			`,
		)
			.bind(
				tournament ?? null,
				TournamentStatusFlags.Finished,
				DBMatchStatus.Playing,
				DBMatchStatus.ToBePlayed,
			)
			.run<
				Pick<Database.Tournament, "currentRound" | "id" | "name"> & {
					pendingMatches: number;
				}
			>();
		const [t] = results;

		if (!t) return edit({ content: "Non risulta alcun torneo disponibile!" });
		if (results.length > 1)
			return edit({
				content: `Ci sono più tornei al momento, specifica l'id corretto\n\n${results.map((t) => `${t.name}: \`${t.id}\``).join("\n")}`,
				allowed_mentions: { parse: [] },
			});
		if (t.pendingMatches)
			return edit({
				content: `Ci sono ancora ${t.pendingMatches} partite da concludere nel round attuale!`,
			});
		return edit({
			content: `Sei sicuro di voler terminare il round ${t.currentRound}?`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `tournament-ava-${t.id}-${t.currentRound}`,
							style: ButtonStyle.Success,
							emoji: { name: "⏭️" },
							label: "Termina round",
						},
					],
				},
			],
		});
	};
	static abandoned = async (
		{ defer, edit, reply }: ChatInputReplies,
		{
			options: { remove, user, winner },
			interaction: {
				channel: { id: channelId },
			},
			user: { id: userId },
		}: ChatInputArgs<typeof TournamentManage.chatInputData, "abandoned">,
	) => {
		if (remove && winner)
			return reply({
				content: "Non puoi specificare remove e winner contemporaneamente!",
				flags: MessageFlags.Ephemeral,
			});
		if (user && winner)
			return reply({
				content: "Non puoi specificare user e winner contemporaneamente!",
				flags: MessageFlags.Ephemeral,
			});
		defer();
		const match = await env.DB.prepare(
			`SELECT * FROM Matches WHERE channelId = ? LIMIT 1`,
		)
			.bind(channelId)
			.first<Database.Match>();

		if (!match)
			return edit({
				content: `Non risulta alcuno scontro collegato al canale <#${channelId}>!`,
			});
		if (
			(user || winner) &&
			match.user1 !== (user ?? winner) &&
			match.user2 !== (user ?? winner)
		)
			return edit({
				content: `<@${user ?? winner}> non è parte dello scontro tra <@${match.user1}> e ${
					match.user2 ? `<@${match.user2}>` : "N/A"
				}!`,
				allowed_mentions: { parse: [] },
			});
		if (remove && match.status !== DBMatchStatus.Abandoned)
			return edit({ content: "Lo scontro non risulta abbandonato!" });
		if (user)
			if (remove) {
				if ((match.user1 === user ? match.result1 : match.result2) != null)
					return edit({
						content: `<@${user}> non ha abbandonato lo scontro!`,
						allowed_mentions: { parse: [] },
					});
			} else {
				if (
					match.status === DBMatchStatus.Abandoned &&
					(match.user1 === user ? match.result1 : match.result2) == null
				)
					return edit({
						content: `<@${user}> ha già abbandonato lo scontro!`,
						allowed_mentions: { parse: [] },
					});
			}
		else if (winner) {
			if (
				match.status === DBMatchStatus.Abandoned &&
				(match.user1 === winner ? match.result1 : match.result2) != null &&
				(match.user1 === winner ? match.result2 : match.result1) == null
			)
				return edit({
					content: `<@${winner}> ha già vinto per abbandono!`,
					allowed_mentions: { parse: [] },
				});
		}
		const newMatch = await patchMatch(
			match.tournamentId,
			match.id,
			env.DB.prepare(
				`
					UPDATE Matches
					SET ${
						!remove ?
							user ?
								`
						result1 = CASE
							WHEN user1 = ?3 THEN NULL
							WHEN user2 = ?3 AND status != ?4 THEN COALESCE(result1, 0)
							ELSE result1
						END,
						result2 = CASE
							WHEN user2 = ?3 THEN NULL
							WHEN user1 = ?3 AND status != ?4 THEN COALESCE(result2, 0)
							ELSE result2
						END,
						status = ?4`
							: winner ?
								`
						result2 = CASE
							WHEN user1 = ?3 THEN NULL
							WHEN user2 = ?3 THEN COALESCE(result2, 0)
							ELSE result2
						END,
						result1 = CASE
							WHEN user2 = ?3 THEN NULL
							WHEN user1 = ?3 THEN COALESCE(result1, 0)
							ELSE result1
						END,
						status = ?4`
							:	`
						result1 = NULL,
						result2 = NULL,
						status = ?4`
						: user ?
							`
						status = CASE
							WHEN (user1 = ?3 AND result2 IS NOT NULL) OR (user2 = ?3 AND result1 IS NOT NULL) THEN ?4
							ELSE status
						END,
						result1 = CASE
							WHEN user1 = ?3 THEN COALESCE(result1, 0)
							ELSE result1
						END,
						result2 = CASE
							WHEN user2 = ?3 THEN COALESCE(result2, 0)
							ELSE result2
						END`
						:	`
						status = ?4,
						result1 = COALESCE(result1, 0),
						result2 = COALESCE(result2, 0)`
					}
					WHERE tournamentId = ?1 AND id = ?2 ${user || winner ? "AND (?3 = user1 OR ?3 = user2)" : ""}
					RETURNING status, result1, result2, user1, user2
				`,
			).bind(
				match.tournamentId,
				match.id,
				user ?? winner,
				!remove ? DBMatchStatus.Abandoned : DBMatchStatus.Playing,
			),
			userId,
		);

		if (newMatch)
			return edit({
				content: `## ${displayMatchScore(newMatch)}`,
				allowed_mentions: { parse: [] },
			});
	};
}
