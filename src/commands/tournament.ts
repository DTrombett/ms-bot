import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	PermissionFlagsBits,
	TextInputStyle,
	type APIMessageTopLevelComponent,
	type APIModalInteractionResponseCallbackData,
	type APISelectMenuOption,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { Temporal } from "temporal-polyfill";
import { ColorNumbers } from "../app/utils/Colors";
import Command from "../Command";
import { forceCapitalize } from "../util/capitalize";
import {
	DBMatchStatus,
	RegistrationMode,
	SupercellPlayerType,
	TournamentFlags,
	TournamentStatusFlags,
} from "../util/Constants";
import { ok } from "../util/node";
import normalizeError from "../util/normalizeError";
import { camelToSpace, template } from "../util/strings";
import { TimeUnit } from "../util/time";
import { matchStatus, roundName } from "../util/tournaments/Constants";
import { finishRound } from "../util/tournaments/finishRound";
import { displayMatchScore, patchMatch } from "../util/tournaments/patchMatch";
import { register } from "../util/tournaments/register";
import { resolveWinner } from "../util/tournaments/resolveWinner";
import { unregister } from "../util/tournaments/unregister";
import { UserError } from "../util/UserError";
import { Brawl } from "./brawl";
import { Clash } from "./clash";

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
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "status",
				description: "Controlla l'avanzamento nel torneo",
				options: [
					{
						type: ApplicationCommandOptionType.User,
						name: "user",
						description:
							"L'utente di cui controllare l'avanzamento (default: tu)",
					},
					{
						type: ApplicationCommandOptionType.Boolean,
						name: "full",
						description: "Se vedere tutto lo storico del torneo",
					},
				],
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
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
	static status = async (
		{ reply }: ChatInputReplies,
		{
			user: { id },
			options: { user = id, full },
		}: ChatInputArgs<typeof Tournament.chatInputData, "status">,
	) => {
		const { results } = await env.DB.prepare(
			`
				WITH t AS (
					SELECT id FROM Tournaments
					WHERE currentRound IS NOT NULL AND (statusFlags & ?2) = 0
					LIMIT 1
				)
				SELECT * FROM Matches
				WHERE tournamentId = (SELECT id FROM t) AND user1 = ?1
				UNION ALL
				SELECT * FROM Matches
				WHERE tournamentId = (SELECT id FROM t) AND user2 = ?1
				ORDER BY id
				LIMIT ?3
			`,
		)
			.bind(user, TournamentStatusFlags.Finished, full ? 19 : 1)
			.run<Database.Match>();
		const [match] = results;
		const winner = resolveWinner(match);

		reply({
			flags: MessageFlags.IsComponentsV2 | (full ? MessageFlags.Ephemeral : 0),
			components: [
				{
					type: ComponentType.TextDisplay,
					content:
						match ?
							winner === user && match.id === 0 ?
								"Complimenti, hai vinto il torneo!"
							: (
								match.status === DBMatchStatus.Playing ||
								(match.status === DBMatchStatus.ToBePlayed && match.channelId)
							) ?
								`Lo scontro è iniziato! ${
									match.channelId ?
										`Vai in <#${match.channelId}> e segui le istruzioni per giocare`
									:	"Attendi che venga creato il canale per concordarti con il tuo avversario..."
								}.`
							: match.status === DBMatchStatus.ToBePlayed ?
								"Attendi l'inizio del torneo per giocare!"
							: match.status === DBMatchStatus.Postponed ?
								"Il tuo scontro è stato posticipato! Attendi ulteriori indicazioni..."
							: match.status === DBMatchStatus.Default ?
								"Hai superato lo scontro di default in quanto non è stato estratto alcun avversario! Attendi pazientemente l'inizio del prossimo round..."
							: match.status === DBMatchStatus.Abandoned ?
								winner === user ?
									"Hai superato lo scontro per abbandono del tuo avversario! Attendi pazientemente l'inizio del prossimo round..."
								:	"Hai perso lo scontro per abbandono :(\nSperiamo di vederti al prossimo torneo!"
							: winner === user ?
								"Hai vinto lo scontro! Attendi pazientemente l'inizio del prossimo round..."
								// Here status is Finished and resolveWinner always returns a value for finished matches
							:	`Hai perso lo scontro contro <@${winner!}> :(\nSperiamo di vederti al prossimo torneo!`
						:	"Non risulta alcuno scontro associato a te nel torneo in corso!\nAssicurati di essere correttamente iscritto e attendi che vengano create le brackets.",
				},
				...results.map((match): APIMessageTopLevelComponent => {
					const winner = resolveWinner(match);
					const round = Math.floor(Math.log2(match.id + 1));

					return {
						type: ComponentType.Container,
						accent_color:
							winner === user ? ColorNumbers.Success
							: winner === undefined ? ColorNumbers.Primary
							: ColorNumbers.Danger,
						components: [
							{
								type: ComponentType.TextDisplay,
								content: template`
									## ${displayMatchScore(match)}
									ID: **${match.id}**
									Stato: **${matchStatus[match.status]}**
									Round: **${roundName(round)}**
									Canale: ${match.channelId ? `<#${match.channelId}>` : "**nessuno**"}
								`,
							},
						],
					};
				}),
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
		options: { tag?: string; team?: string; name?: string; locale?: string },
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
		const { results: saved } = await env.DB.prepare(
			`
				SELECT tag, active, name FROM SupercellPlayers
				WHERE userId = ? AND type = ?
			`,
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
		try {
			await unregister(Number(tournament), {
				mode: RegistrationMode.Discord,
				userId: id,
			});
			return edit({ content: "Hai rimosso la tua iscrizione!" });
		} catch (err) {
			return this.handleError(err, edit);
		}
	};
	static reg = async (
		{ edit, deferUpdate, modal, defer, reply }: ComponentReplies,
		{
			args: [tournamentId, tag, team],
			user: { id },
			interaction: { locale },
		}: ComponentArgs,
	) => {
		if (tag)
			try {
				deferUpdate();
				await register(Number(tournamentId), {
					tag,
					userId: id,
					mode: RegistrationMode.Discord,
				});
				return edit({
					content: "Ti sei iscritto con successo!",
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
			} catch (err) {
				return this.handleError(err, edit);
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
			interaction: {
				member: { roles, permissions } = { roles: [] } as any,
				locale,
			},
		}: ComponentArgs,
	) => {
		defer();
		const match = await env.DB.prepare(
			`
				SELECT m.*, t.game, t.rounds, t.flags,
					p1.tag AS user1Tag, p2.tag AS user2Tag
				FROM Matches m JOIN Tournaments t ON m.tournamentId = t.id
				LEFT JOIN Participants p1 ON p1.userId = m.user1
					AND p1.tournamentId = m.tournamentId
				LEFT JOIN Participants p2 ON p2.userId = m.user2
					AND p2.tournamentId = m.tournamentId
				WHERE m.id = ?1 AND m.tournamentId = ?2
			`,
		)
			.bind(matchId, tournamentId)
			.first<
				Database.Match &
					Pick<Database.Tournament, "game" | "rounds" | "flags"> &
					PossiblyNull<{ user1Tag: Database.Participant["tag"] }> &
					PossiblyNull<{ user2Tag: Database.Participant["tag"] }>
			>();

		if (!match?.id) return edit({ content: "Scontro non trovato!" });
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
		if (!match.user1Tag || !match.user2Tag)
			return edit({
				content: "Entrambi i partecipanti devono avere il tag collegato!",
			});
		try {
			const tag = userId === match.user1 ? match.user1Tag : match.user2Tag;
			const rounds = JSON.parse(match.rounds) as Database.Round[];
			const round =
				rounds[Math.floor(Math.log2(match.id + 1))] ?? rounds.at(-1)!;
			const battles = await Brawl.getBattleLog(tag, { cache: false });
			const filteredBattles = battles
				.filter(
					(b) =>
						camelToSpace(b.battle.mode) === round.mode.toLowerCase() &&
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

			if (!filteredBattles.length)
				return edit({
					content: template`
						Non risulta alcuna partita corrispondente! Assicurati di giocare le partite richieste prima di controllare i risultati.
						-# Nota: solo le partite in ${round.mode} con i bot disattivati tra ${match.user1Tag} e ${match.user2Tag} vengono considerate
						${battles[0]}-# Ultima partita di ${tag} registrata il <t:${Clash.parseAPIDate(battles[0]?.battleTime ?? "")}:s>
					`,
				});
			const result = filteredBattles.reduce<[number, number]>(
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
						UPDATE Matches SET result1 = ?3, result2 = ?4, status = ?5
						WHERE tournamentId = ?1 AND id = ?2 RETURNING *
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
					flags: MessageFlags.IsComponentsV2,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: `## ${displayMatchScore(newMatch)} ${newMatch.status === DBMatchStatus.Playing ? "(provvisorio)" : ""}`,
						},
						...filteredBattles
							.reverse()
							.slice(0, 9)
							.map<APIMessageTopLevelComponent>((battle) => ({
								type: ComponentType.Container,
								accent_color:
									battle.battle.result === "defeat" ? ColorNumbers.Danger
									: battle.battle.result === "victory" ? ColorNumbers.Success
									: undefined,
								components: [
									{
										type: ComponentType.Section,
										accessory: {
											type: ComponentType.Thumbnail,
											media: {
												url: `https://cdn.brawlify.com/game-modes/regular/${48000000 + battle.event.modeId}.png`,
											},
										},
										components: [
											{
												type: ComponentType.TextDisplay,
												content: template`
													## ${(
														battle.battle.players?.map(
															this.stringifyBattlePlayer,
														) ??
														battle.battle.teams?.map((t) =>
															t.map(this.stringifyBattlePlayer).join(", "),
														)
													)?.join("\tVS\t")}
													Modalità: **${camelToSpace(battle.battle.mode)}**
													Mappa: **${battle.event.map}**
													Tipo: **${battle.battle.type}**
													Risultato: **${
														(battle.battle.result &&
															{
																victory: "Vittoria",
																defeat: "Sconfitta",
																draw: "Pareggio",
															}[battle.battle.result]) ??
														battle.battle.result
													}**
													Durata: **${Temporal.Duration.from({ seconds: battle.battle.duration })
														.round({ largestUnit: "day" })
														.toLocaleString(locale, { style: "narrow" })}**
												`,
											},
										],
									},
								],
							})),
					],
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
	static stringifyBattlePlayer = (battlePlayer: Brawl.BattlePlayer) =>
		`${battlePlayer.name} (${forceCapitalize(
			(battlePlayer.brawlers ?? [battlePlayer.brawler!])
				.map((b) => b.name)
				.join(", "),
		)})`;
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
	static handleError = (err: unknown, edit: BaseReplies["edit"]) => {
		if (err instanceof UserError) return edit({ content: err.message });
		console.error(err);
		return edit({
			content: "Si è verificato un errore imprevisto! Contatta un moderatore.",
			components: [],
		});
	};
}
