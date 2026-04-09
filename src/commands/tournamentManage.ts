import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	PermissionFlagsBits,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";
import { DBMatchStatus, TournamentStatusFlags } from "../util/Constants";

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
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override supportComponentMethods = true;
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
}
