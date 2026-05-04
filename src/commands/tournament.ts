import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	PermissionFlagsBits,
	Routes,
	TextInputStyle,
	type APIModalInteractionResponseCallbackData,
	type APISelectMenuOption,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";
import {
	DBMatchStatus,
	RegistrationMode,
	SupercellPlayerType,
	TournamentFlags,
} from "../util/Constants";
import { rest } from "../util/globals";
import { ok } from "../util/node";
import normalizeError from "../util/normalizeError";
import { TimeUnit } from "../util/time";
import { editMessage } from "../util/tournaments/editMessage";
import { finishRound } from "../util/tournaments/finishRound";
import { displayMatchScore, patchMatch } from "../util/tournaments/patchMatch";
import { Brawl } from "./brawl";

export class Tournament extends Command {
	static override chatInputData = {
		name: "tournament",
		description: "Gestisci le tue iscrizioni ai tornei",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "register",
				description: "Registrati al torneo",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "tag",
						description: "Il tag giocatore con cui iscriversi (es. #8QJR0YC)",
						min_length: 3,
						max_length: 20,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "team",
						description:
							"Il codice team con il quale iscriversi nei tornei a squadre (es. ABCD)",
						max_length: 20,
					},
				],
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override customId = "tournament";
	static override supportComponentMethods = true;
	static register = async (
		{ defer, edit, reply }: ChatInputReplies,
		{
			user: { id },
			options,
			interaction: { locale },
		}: ChatInputArgs<typeof Tournament.chatInputData, "register">,
	) => {
		if (options.tag)
			try {
				options.tag = Brawl.normalizeTag(options.tag);
			} catch (err) {
				return reply({
					flags: MessageFlags.Ephemeral,
					content:
						err instanceof Error ? err.message : "Il tag fornito non è valido.",
				});
			}
		if (options.team && !/^[0-9a-v]+$/iu.test(options.team))
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "Il codice team non è valido.",
			});
		defer({ flags: MessageFlags.Ephemeral });
		const { results } = await env.DB.prepare(
			`
				SELECT t.id, t.name, t.flags, t.team, t.game, p.tag, p.team, p.userId IS NOT NULL AS registered
				FROM Tournaments t
				LEFT JOIN Participants p ON p.tournamentId = t.id AND p.userId = ?1
				WHERE
					(t.registrationMode & ?2) != 0
					AND t.registrationStart < unixepoch('now')
					AND t.registrationEnd > unixepoch('now') + 1
			`,
		)
			.bind(id, RegistrationMode.Discord)
			.run<
				Pick<Database.Tournament, "id" | "name" | "flags" | "team" | "game"> &
					Pick<Database.Participant, "tag" | "team"> & { registered: 0 | 1 }
			>();
		if (results.length === 0)
			return edit({
				content: "Non è possibile iscriversi a nessun torneo al momento!",
			});
		if (results.length === 1)
			return this.handleTournament(results[0]!, edit, id, {
				...options,
				locale,
			});
		return edit({
			content: "Sono aperte le iscrizioni per più tornei al momento!",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.StringSelect,
							custom_id: `tournament-cho-${options.tag ?? ""}-${options.team ?? ""}`,
							options: results.map((r) => ({
								label: r.name,
								value: r.id.toString(),
							})),
							placeholder: "Scegli torneo",
						},
					],
				},
			],
		});
	};
	static handleTournament = async (
		tournament: Pick<
			Database.Tournament,
			"id" | "name" | "team" | "flags" | "game"
		> &
			Pick<Database.Participant, "tag" | "team"> & { registered: 0 | 1 },
		edit: Replies["edit"],
		userId: string,
		options: {
			tag?: string;
			team?: string;
			confirm?: boolean;
			name?: string;
			locale?: string;
		},
	) => {
		if (tournament.registered)
			return edit({
				content: `Sei già iscritto al torneo **${tournament.name}**${tournament.tag ? ` come **${tournament.tag}**` : ""}${tournament.team ? ` con il team **${tournament.team.toString(32).toUpperCase()}**` : ""}!\nSe vuoi modificare la tua iscrizione prima disiscriviti.`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `tournament-unr-${tournament.id}`,
								style: ButtonStyle.Danger,
								label: "Rimuovi iscrizione",
							},
						],
					},
				],
			});
		if (options.tag && options.confirm) {
			({ name: options.name } = await Brawl.getPlayer(options.tag, { edit }));
			const existing = await env.DB.prepare(
				`
					INSERT INTO SupercellPlayers (tag, userId, active, type, name)
					VALUES (
						?1,
						?2,
						NOT EXISTS (
							SELECT 1
							FROM SupercellPlayers
							WHERE userId = ?2 AND type = ?3 AND active = TRUE
						),
						?3,
						?4
					)
					ON CONFLICT(tag, type) DO UPDATE
					SET name = excluded.name
					RETURNING userId
				`,
			)
				.bind(options.tag, userId, tournament.game, options.name)
				.first<Database.SupercellPlayer["userId"]>("userId");

			if (existing && existing !== userId)
				return edit({
					content: `Questo tag risulta già collegato a <@${existing}>!`,
				});
		}
		if (
			(!(tournament.flags & TournamentFlags.TagRequired) && !options.tag) ||
			(options.tag && options.confirm)
		)
			return this.completeRegistration(tournament, edit, userId, options);
		const { results: saved } = await env.DB.prepare(
			`SELECT tag, active, name FROM SupercellPlayers WHERE userId = ? AND type = ?`,
		)
			.bind(userId, tournament.game)
			.run<Pick<Database.SupercellPlayer, "tag" | "active" | "name">>();
		options.tag ||= (saved.find((g) => g.active) ?? saved[0])?.tag;
		if (!options.tag)
			return edit({
				content:
					"In questo torneo è obbligatorio specificare il proprio tag giocatore per iscriversi!",
				components: [],
			});
		const player = await Brawl.getPlayer(options.tag, { edit });
		return edit({
			content: `Confermi la tua iscrizione al torneo **${tournament.name}** come **${player.name}**?`,
			embeds: [Brawl.createPlayerEmbed(player, { locale: options.locale })],
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.StringSelect,
							custom_id: `tournament-pro-${tournament.id}-${options.team ?? ""}`,
							placeholder: "Cambia profilo",
							options: [
								...saved.map<APISelectMenuOption>((p) => ({
									label: p.name,
									description: p.tag,
									value: p.tag,
									default: p.tag === options.tag,
								})),
								{ label: "Inserisci tag...", value: "#" },
							],
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `tournament-reg-${tournament.id}-${player.tag}-${options.team ?? ""}`,
							label: "Conferma",
							emoji: {
								animated: true,
								id: "817094620700868678",
								name: "verified",
							},
							style: ButtonStyle.Success,
						},
					],
				},
			],
		});
	};
	static completeRegistration = async (
		tournament: Pick<Database.Tournament, "id" | "name">,
		edit: Replies["edit"],
		userId: string,
		{ tag, name }: { tag?: string; name?: string } = {},
	) => {
		const [, result] = await env.DB.batch<
			Pick<
				Database.Tournament,
				| "minPlayers"
				| "maxPlayers"
				| "registrationMessage"
				| "registrationTemplateLink"
				| "registrationRole"
				| "registrationChannel"
				| "name"
				| "id"
			> & { participantCount: number }
		>([
			env.DB.prepare(
				`
					INSERT INTO Participants (tournamentId, userId, tag, name)
					VALUES (?1, ?2, ?3, ?4)
				`,
			).bind(tournament.id, userId, tag || null, name || null),
			env.DB.prepare(
				`
					SELECT minPlayers, maxPlayers, registrationMessage, registrationChannel, registrationTemplateLink, registrationRole, name, id,
					(
						SELECT COUNT(*)
						FROM Participants
						WHERE tournamentId = Tournaments.id
					) AS participantCount
					FROM Tournaments WHERE id = ?
				`,
			).bind(tournament.id),
		]);
		const data = result?.results[0];
		if (!data)
			return edit({
				content: `Non è stato possibile completare l'iscrizione! Riprova o contatta un moderatore.`,
			});
		await Promise.all([
			data.registrationRole &&
				rest.put(
					Routes.guildMemberRole(env.MAIN_GUILD, userId, data.registrationRole),
					{
						reason: `Iscrizione al torneo ${tournament.name}${tag ? ` come ${tag}` : ""} (${data.participantCount} iscritti totali)`,
					},
				),
			editMessage(data),
		]);
		return edit({
			content: `Ti sei iscritto con successo al torneo **${tournament.name}**!`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `tournament-unr-${tournament.id}`,
							style: ButtonStyle.Danger,
							label: "Rimuovi iscrizione",
						},
					],
				},
			],
		});
	};
	static cho = async (
		{ edit, deferUpdate }: ComponentReplies,
		{ args: [tag, team], interaction: { data }, user: { id } }: ComponentArgs,
	) => {
		ok(data.component_type === ComponentType.StringSelect);
		deferUpdate();
		const tournament = await env.DB.prepare(
			`
				SELECT t.id, t.name, t.flags, t.team, t.game, p.tag, p.team, p.userId IS NOT NULL AS registered
				FROM Tournaments t
				LEFT JOIN Participants p ON p.tournamentId = t.id AND p.userId = ?1
				WHERE
					t.id = ?2
					AND (t.registrationMode & ?3) != 0
					AND t.registrationStart < unixepoch('now')
					AND t.registrationEnd > unixepoch('now') + 1
			`,
		)
			.bind(id, data.values[0], RegistrationMode.Discord)
			.first<
				Pick<Database.Tournament, "id" | "name" | "flags" | "team" | "game"> &
					Pick<Database.Participant, "tag" | "team"> & { registered: 0 | 1 }
			>();

		if (!tournament)
			return edit({
				content: "Le iscrizioni per questo torneo non sono più disponibili.",
				components: [],
			});
		return this.handleTournament(tournament, edit, id, { tag, team });
	};
	static unr = async (
		{ edit, defer }: ComponentReplies,
		{ args: [tournament], user: { id } }: ComponentArgs,
	) => {
		defer({ flags: MessageFlags.Ephemeral });
		const data = await env.DB.prepare(
			`
				SELECT 
					t.minPlayers, t.maxPlayers, t.registrationMessage, t.registrationChannel, t.registrationTemplateLink, t.registrationRole, t.name, t.id,
					p.userId IS NOT NULL AS participationExists,
					(
						(t.registrationMode & ?1) != 0
						AND t.registrationStart < unixepoch('now')
						AND t.registrationEnd > unixepoch('now') + 1
					) AS registrationOpen,
					(
						SELECT COUNT(*)
						FROM Participants
						WHERE tournamentId = t.id
					) AS participantCount
				FROM Tournaments t
				LEFT JOIN Participants p
					ON p.tournamentId = t.id AND p.userId = ?2
				WHERE t.id = ?3
			`,
		)
			.bind(RegistrationMode.Discord, id, tournament)
			.first<
				{
					participationExists: boolean;
					registrationOpen: boolean;
					participantCount: number;
				} & Pick<
					Database.Tournament,
					| "minPlayers"
					| "maxPlayers"
					| "registrationMessage"
					| "registrationChannel"
					| "registrationTemplateLink"
					| "registrationRole"
					| "name"
					| "id"
				>
			>();

		if (!data?.registrationOpen)
			return edit({ content: "Le iscrizioni per questo torneo sono chiuse!" });
		if (!data.participationExists)
			return edit({ content: "Non risulti iscritto a questo torneo!" });
		data.participantCount--;
		await Promise.all([
			rest.delete(
				Routes.guildMemberRole(env.MAIN_GUILD, id, data.registrationRole!),
				{ reason: `Rimozione iscrizione al torneo ${data.name}` },
			),
			editMessage(data),
			env.DB.prepare(
				`DELETE FROM Participants WHERE tournamentId = ?1 AND userId = ?2`,
			)
				.bind(tournament, id)
				.run(),
		]);
		return edit({ content: "Hai rimosso la tua iscrizione!" });
	};
	static reg = async (
		{ edit, deferUpdate, modal, defer, reply }: ComponentReplies,
		{
			args: [tournamentId, tag, team],
			user: { id },
			interaction: { locale },
		}: ComponentArgs,
	) => {
		if (tag) {
			deferUpdate();
			const tournament = await env.DB.prepare(
				`
					SELECT t.id, t.name, t.flags, t.team, t.game, p.tag, p.team, p.userId IS NOT NULL AS registered
					FROM Tournaments t
					LEFT JOIN Participants p ON p.tournamentId = t.id AND p.userId = ?1
					WHERE
						t.id = ?2
						AND (t.registrationMode & ?3) != 0
						AND t.registrationStart < unixepoch('now')
						AND t.registrationEnd > unixepoch('now')
				`,
			)
				.bind(id, tournamentId, RegistrationMode.Discord)
				.first<
					Pick<Database.Tournament, "id" | "name" | "flags" | "team" | "game"> &
						Pick<Database.Participant, "tag" | "team"> & { registered: 0 | 1 }
				>();

			if (!tournament)
				return edit({
					content: "Le iscrizioni per questo torneo non sono più disponibili.",
				});
			return this.handleTournament(tournament, edit, id, {
				tag,
				team,
				confirm: true,
			});
		}
		const { results } = await env.DB.prepare(
			`
				SELECT
					sp.tag,
					sp.active,
					sp.name,
					t.registrationMode,
					t.registrationStart,
					t.registrationEnd,
					t.name AS tournamentName,
					p.userId IS NOT NULL AS registered,
					p.tag as pTag,
					p.team as pTeam
				FROM SupercellPlayers sp
				JOIN Tournaments t ON sp.type = t.game
				LEFT JOIN Participants p
					ON p.tournamentId = t.id AND p.userId = sp.userId
				WHERE t.id = ?1 AND sp.userId = ?2
			`,
		)
			.bind(tournamentId, id)
			.run<
				Pick<Database.SupercellPlayer, "tag" | "active" | "name"> & {
					tournamentName: Database.Tournament["name"];
					registered: boolean;
					pTag: Database.Participant["tag"];
					pTeam: Database.Participant["team"];
				} & Pick<
						Database.Tournament,
						"registrationMode" | "registrationStart" | "registrationEnd"
					>
			>();
		const result = results.find((g) => g.active) ?? results[0];

		if (!result) return modal(this.buildModal({ id: tournamentId!, team }));
		if (result.registered)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: `Sei già iscritto al torneo **${result.tournamentName}**${result.pTag ? ` come **${result.pTag}**` : ""}${result.pTeam ? ` con il team **${result.pTeam.toString(32).toUpperCase()}**` : ""}!\nSe vuoi modificare la tua iscrizione prima disiscriviti.`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `tournament-unr-${tournamentId}`,
								style: ButtonStyle.Danger,
								label: "Rimuovi iscrizione",
							},
						],
					},
				],
			});
		if (
			!(result.registrationMode & RegistrationMode.Discord) ||
			result.registrationStart! * TimeUnit.Second > Date.now() ||
			(result.registrationEnd! - 1) * TimeUnit.Second < Date.now()
		)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "Le iscrizioni per questo torneo sono chiuse.",
			});
		defer({ flags: MessageFlags.Ephemeral });
		({ tag } = result);
		const player = await Brawl.getPlayer(tag, { edit });
		return edit({
			content: `Confermi la tua iscrizione al torneo **${result.tournamentName}** come **${player.name}**?`,
			embeds: [Brawl.createPlayerEmbed(player, { locale })],
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.StringSelect,
							custom_id: `tournament-pro-${tournamentId}-${team ?? ""}`,
							placeholder: "Cambia profilo",
							options: [
								...results.map<APISelectMenuOption>((p) => ({
									label: p.name,
									description: p.tag,
									value: p.tag,
									default: p.tag === tag,
								})),
								{ label: "Inserisci tag...", value: "#" },
							],
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `tournament-reg-${tournamentId}-${player.tag}-${team ?? ""}`,
							label: "Conferma",
							emoji: {
								animated: true,
								id: "817094620700868678",
								name: "verified",
							},
							style: ButtonStyle.Success,
						},
					],
				},
			],
		});
	};
	static pro = async (
		{ edit, deferUpdate, modal }: ComponentReplies,
		{
			args: [tournamentId, team],
			interaction: { data },
			user: { id },
		}: ComponentArgs,
	) => {
		ok(data.component_type === ComponentType.StringSelect);
		if (data.values[0] === "#")
			return modal(this.buildModal({ id: tournamentId!, team }));
		deferUpdate();
		const tournament = await env.DB.prepare(
			`
				SELECT t.id, t.name, t.flags, t.team, t.game, p.tag, p.team, p.userId IS NOT NULL AS registered
				FROM Tournaments t
				LEFT JOIN Participants p ON p.tournamentId = t.id AND p.userId = ?1
				WHERE
					t.id = ?2
					AND (t.registrationMode & ?3) != 0
					AND t.registrationStart < unixepoch('now')
					AND t.registrationEnd > unixepoch('now') + 1
			`,
		)
			.bind(id, tournamentId, RegistrationMode.Discord)
			.first<
				Pick<Database.Tournament, "id" | "name" | "flags" | "team" | "game"> &
					Pick<Database.Participant, "tag" | "team"> & { registered: 0 | 1 }
			>();

		if (!tournament)
			return edit({
				content: "Le iscrizioni per questo torneo non sono più disponibili.",
			});
		return this.handleTournament(tournament, edit, id, {
			tag: data.values[0],
			team,
		});
	};
	static ava = async (
		{ edit, defer, reply }: ComponentReplies,
		{
			args: [tournamentId, round],
			interaction: { member: { roles, permissions } = { roles: [] } as any },
		}: ComponentArgs,
	) => {
		if (
			new Set(roles).isDisjointFrom(new Set(env.ALLOWED_ROLES.split(","))) &&
			!(BigInt(permissions) & PermissionFlagsBits.ManageGuild)
		)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "Non hai abbastanza permessi per eseguire questa azione!",
			});
		defer();
		const tournament = await env.DB.prepare(
			`
				SELECT workflowId
				FROM Tournaments
				WHERE id = ?1
			`,
		)
			.bind(tournamentId)
			.first<Pick<Database.Tournament, "workflowId">>();

		if (!tournament?.workflowId)
			return edit({ content: "Torneo non trovato." });
		try {
			await finishRound(tournament.workflowId, Number(round));
			return edit({ content: "Il round successivo è iniziato!" });
		} catch (err) {
			return edit({
				content: `\`\`\`\n${normalizeError(err).stack?.slice(0, 3950)}\n\`\`\``,
			});
		}
	};
	static che = async (
		{ edit, defer }: ComponentReplies,
		{
			args: [matchId, tournamentId],
			user: { id: userId },
			interaction: { member: { roles, permissions } = { roles: [] } as any },
		}: ComponentArgs,
	) => {
		defer();
		const match = await env.DB.prepare(
			`
				SELECT 
					m.*,
					t.game, t.rounds, t.flags, t.id as tournamentId,
					p1.tag AS user1Tag, p2.tag AS user2Tag
				FROM Matches m
				JOIN Tournaments t ON m.tournamentId = t.id
				LEFT JOIN Participants p1 ON p1.userId = m.user1 AND p1.tournamentId = m.tournamentId
				LEFT JOIN Participants p2 ON p2.userId = m.user2 AND p2.tournamentId = m.tournamentId
				WHERE m.id = ?1 AND m.tournamentId = ?2
			`,
		)
			.bind(matchId, tournamentId)
			.first<
				Database.Match &
					Pick<Database.Tournament, "game" | "rounds" | "flags"> & {
						tournamentId: Database.Tournament["id"];
					} & Partial<{
						user1Tag: Database.Participant["tag"];
						user2Tag: Database.Participant["tag"];
					}>
			>();

		if (!match?.user1Tag) return edit({ content: "Torneo non trovato." });
		if ((match.flags & TournamentFlags.AutoDetectResults) === 0)
			return edit({
				content:
					"Il controllo dei risultati tramite registro battaglie non è attivato per questo torneo!",
			});
		if (match.game === SupercellPlayerType.ClashRoyale)
			return edit({
				content:
					"Il controllo dei risultati tramite registro battaglie non è supportato per Clash Royale!",
			});
		if (
			match.status !== DBMatchStatus.Playing &&
			match.status !== DBMatchStatus.ToBePlayed &&
			new Set(roles).isDisjointFrom(new Set(env.ALLOWED_ROLES.split(","))) &&
			!(BigInt(permissions) & PermissionFlagsBits.ManageGuild)
		)
			return edit({
				flags: MessageFlags.Ephemeral,
				content:
					"Solo gli amministratori possono aggiornare i risultati dopo che la partita è terminata!",
			});
		try {
			const rounds = JSON.parse(match.rounds) as Database.Round[];
			const round =
				rounds[Math.floor(Math.log2(match.id + 1))] ?? rounds.at(-1)!;
			const resolvedMode = round.mode
				.toLowerCase()
				.split(/\s+/)
				.reduce((a, b) => a + (b[0]?.toUpperCase() ?? "") + b.slice(1));
			const battleLog = (await Brawl.getBattleLog(match.user1Tag))
				.filter(
					(b) =>
						b.battle.mode === resolvedMode &&
						(b.battle.result === "defeat" || b.battle.result === "victory") &&
						(b.battle.teams?.every(
							(t) =>
								t.length === 1 &&
								[match.user1Tag, match.user2Tag].includes(t[0]?.tag),
						) ??
							b.battle.players?.every((t) =>
								[match.user1Tag, match.user2Tag].includes(t.tag),
							)),
				)
				.reverse()
				.slice(0, round.bof);

			if (!battleLog.length)
				return edit({
					content: `Non risulta alcuna partita corrispondente!\n-# Nota: solo le partite in ${round.mode} con i bot disattivati tra ${match.user1Tag} e ${match.user2Tag} vengono considerate\n`,
				});
			const result = battleLog.reduce<[number, number]>(
				(result, { battle }) =>
					battle.result === "defeat" ?
						[result[0], result[1] + 1]
					:	[result[0] + 1, result[1]],
				[0, 0],
			);
			const newMatch = await patchMatch(
				match.tournamentId,
				match.id,
				env.DB.prepare(
					`
						UPDATE Matches
						SET result1 = ?3, result2 = ?4, status = ?5
						WHERE tournamentId = ?1 AND id = ?2
						RETURNING *
					`,
				).bind(
					match.tournamentId,
					match.id,
					result[0],
					result[1],
					Math.max(result[0], result[1]) > round.bof / 2 ?
						DBMatchStatus.Finished
					:	DBMatchStatus.Playing,
				),
				userId,
			);

			if (newMatch)
				return edit({
					content: `## ${displayMatchScore(newMatch)} ${newMatch.status === DBMatchStatus.Playing ? "(provvisorio)" : ""}`,
					allowed_mentions: { parse: [] },
				});
		} catch (err) {
			return edit({
				content: `\`\`\`\n${normalizeError(err).stack?.slice(0, 3950)}\n\`\`\``,
			});
		}
	};
	static tag = async (
		{ defer, edit, reply }: ModalReplies,
		{
			args: [tournamentId, team],
			interaction: {
				data: { components },
			},
			user: { id },
		}: ModalArgs,
	) => {
		ok(
			components[0]?.type === ComponentType.Label &&
				components[0].component.type === ComponentType.TextInput,
		);
		let tag = components[0].component.value;
		try {
			tag = Brawl.normalizeTag(tag);
		} catch (err) {
			return reply({
				flags: MessageFlags.Ephemeral,
				content:
					err instanceof Error ? err.message : "Il tag fornito non è valido.",
			});
		}
		defer({ flags: MessageFlags.Ephemeral });
		const tournament = await env.DB.prepare(
			`
				SELECT t.id, t.name, t.flags, t.team, t.game, p.tag, p.team, p.userId IS NOT NULL AS registered
				FROM Tournaments t
				LEFT JOIN Participants p ON p.tournamentId = t.id AND p.userId = ?1
				WHERE
					t.id = ?2
					AND (t.registrationMode & ?3) != 0
					AND t.registrationStart < unixepoch('now')
					AND t.registrationEnd > unixepoch('now') + 1
			`,
		)
			.bind(id, tournamentId, RegistrationMode.Discord)
			.first<
				Pick<Database.Tournament, "id" | "name" | "flags" | "team" | "game"> &
					Pick<Database.Participant, "tag" | "team"> & { registered: 0 | 1 }
			>();
		if (!tournament)
			return edit({
				content: "Le iscrizioni per questo torneo non sono più disponibili.",
			});
		return this.handleTournament(tournament, edit, id, { tag, team });
	};
	static buildModal = (options: {
		id: string;
		team?: string;
	}): APIModalInteractionResponseCallbackData => ({
		title: "Iscrizione al torneo",
		custom_id: `tournament-tag-${options.id}-${options.team ?? ""}`,
		components: [
			{
				type: ComponentType.Label,
				label: "Tag giocatore",
				description:
					"Lo trovi all'interno del tuo profilo di gioco, sotto l'immagine",
				component: {
					type: ComponentType.TextInput,
					custom_id: "tag",
					style: TextInputStyle.Short,
					min_length: 3,
					max_length: 20,
					required: true,
					placeholder:
						"Il tag giocatore con cui iscriversi al torneo (es. #8QJR0YC)",
				},
			},
		],
	});
}
