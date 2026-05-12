import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
	TextInputStyle,
	type APIMessageTopLevelComponent,
	type APIModalInteractionResponseCallbackData,
	type APISelectMenuOption,
	type Locale,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
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
import { randomArrayItem } from "../util/random";
import { camelToSpace, template } from "../util/strings";
import { matchStatus, roundName } from "../util/tournaments/Constants";
import { finishRound } from "../util/tournaments/finishRound";
import { displayMatchScore, patchMatch } from "../util/tournaments/patchMatch";
import {
	register,
	RegisterError,
	RegisterErrorType,
} from "../util/tournaments/register";
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
		contexts: [InteractionContextType.Guild],
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
					// Team tournaments are currently not supported
					// {
					// 	type: ApplicationCommandOptionType.String,
					// 	name: "team",
					// 	description:
					// 		"Il codice team con il quale iscriversi nei tornei a squadre (es. ABCD)",
					// 	max_length: 20,
					// },
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
			interaction: { locale, guild_id },
		}: ChatInputArgs<typeof Tournament.chatInputData, "register">,
	) => {
		// if (options.team && !/^[0-9a-v]+$/iu.test(options.team))
		// 	return reply({
		// 		flags: MessageFlags.Ephemeral,
		// 		content: "Il codice team non è valido.",
		// 	});
		const { results } = await env.DB.prepare(
			`
				SELECT id, name FROM Tournaments
				WHERE (registrationMode & ?1) != 0 AND
					registrationStart <= unixepoch('now') AND
					registrationEnd > unixepoch('now') + 1 AND
					guildId = ?2
			`,
		)
			.bind(RegistrationMode.Discord, guild_id)
			.run<Pick<Database.Tournament, "id" | "name">>();
		if (results.length === 0)
			return reply({
				content: "Non è possibile iscriversi a nessun torneo al momento!",
				flags: MessageFlags.Ephemeral,
			});
		defer({ flags: MessageFlags.Ephemeral });
		if (results.length === 1)
			try {
				return edit(
					this.createConfirmMessage(
						await register(results[0]!.id, {
							userId: id,
							simulate: true,
							tag: options.tag,
							mode: RegistrationMode.Discord,
						}),
						locale,
					),
				);
			} catch (err) {
				return this.handleError(err, edit);
			}
		return edit({
			content: "Sono aperte le iscrizioni per più tornei al momento!",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.StringSelect,
							custom_id: `tournament-cho-${options.tag ?? ""}`,
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
			interaction: { guild_id },
		}: ChatInputArgs<typeof Tournament.chatInputData, "status">,
	) => {
		const { results } = await env.DB.prepare(
			`
				WITH t AS (
					SELECT id FROM Tournaments
					WHERE currentRound IS NOT NULL
						AND (statusFlags & ?2) = 0
						AND guildId = ?4
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
			.bind(user, TournamentStatusFlags.Finished, full ? 19 : 1, guild_id)
			.run<Database.Match>();
		const [match] = results;
		const winner = resolveWinner(match);

		reply({
			flags: MessageFlags.IsComponentsV2 | (full ? MessageFlags.Ephemeral : 0),
			allowed_mentions: { parse: [] },
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
	static cho = async (
		{ edit, deferUpdate, update }: ComponentReplies,
		{ args: [tag], interaction: { data, locale }, user: { id } }: ComponentArgs,
	) => {
		ok(data.component_type === ComponentType.StringSelect);
		try {
			return edit(
				this.createConfirmMessage(
					await register(Number(data.values[0]), {
						tag,
						userId: id,
						simulate: true,
						defer: deferUpdate,
						mode: RegistrationMode.Discord,
					}),
					locale,
				),
			);
		} catch (err) {
			if (err instanceof RegisterError) return update({ content: err.message });
			deferUpdate();
			return this.handleError(err, edit);
		}
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
		{ edit, deferUpdate, modal, defer, reply, update }: ComponentReplies,
		{
			args: [tournamentId, tag],
			user: { id },
			interaction: { locale },
		}: ComponentArgs,
	) => {
		if (tag != null)
			try {
				await register(Number(tournamentId), {
					tag,
					userId: id,
					defer: deferUpdate,
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
				if (err instanceof RegisterError)
					return update({ content: err.message });
				deferUpdate();
				return this.handleError(err, edit);
			}
		try {
			return edit(
				this.createConfirmMessage(
					await register(Number(tournamentId), {
						userId: id,
						simulate: true,
						mode: RegistrationMode.Discord,
						defer: defer.bind(null, { flags: MessageFlags.Ephemeral }),
					}),
					locale,
				),
			);
		} catch (err) {
			if (err instanceof RegisterError)
				return err.type === RegisterErrorType.TagRequired ?
						modal(this.buildModal({ id: tournamentId! }))
					:	reply({ content: err.message, flags: MessageFlags.Ephemeral });
			defer({ flags: MessageFlags.Ephemeral });
			return this.handleError(err, edit);
		}
	};
	static pro = async (
		{ edit, deferUpdate, modal, update }: ComponentReplies,
		{
			args: [tournamentId],
			interaction: { data, locale },
			user: { id },
		}: ComponentArgs,
	) => {
		ok(data.component_type === ComponentType.StringSelect);
		const tag = data.values[0] ?? "#";

		if (tag === "#") return modal(this.buildModal({ id: tournamentId! }));
		try {
			return edit(
				this.createConfirmMessage(
					await register(Number(tournamentId), {
						tag,
						userId: id,
						simulate: true,
						defer: deferUpdate,
						mode: RegistrationMode.Discord,
					}),
					locale,
				),
			);
		} catch (err) {
			if (err instanceof RegisterError)
				return update({ content: err.message, components: [], embeds: [] });
			deferUpdate();
			return this.handleError(err, edit);
		}
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
			`SELECT workflowId FROM Tournaments WHERE id = ?1`,
		)
			.bind(tournamentId)
			.first<Pick<Database.Tournament, "workflowId">>();

		if (!tournament?.workflowId)
			return edit({ content: "Torneo non trovato." });
		try {
			await finishRound(tournament.workflowId, Number(round));
			return edit({
				content:
					round === "0" ? "Il torneo è terminato" : "Il round è iniziato!",
			});
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
			const tags = [match.user1Tag, match.user2Tag];
			const tag =
				userId === match.user1 ? match.user1Tag
				: userId === match.user2 ? match.user2Tag
				: randomArrayItem(tags);
			const rounds = JSON.parse(match.rounds) as Database.Round[];
			const round =
				rounds[Math.floor(Math.log2(match.id + 1))] ?? rounds.at(-1)!;
			const battles = await Brawl.getBattleLog(tag);
			const filteredBattles = battles
				.filter(
					(b) =>
						camelToSpace(b.battle.mode) === round.mode.toLowerCase() &&
						(b.battle.result === "defeat" || b.battle.result === "victory") &&
						(b.battle.teams?.every(
							(t) => t.length === 1 && tags.includes(t[0]!.tag),
						) ??
							b.battle.players?.every((t) => tags.includes(t.tag))),
				)
				.reverse()
				.slice(0, round.bof);

			if (!filteredBattles.length)
				return edit({
					content: template`
						Non risulta alcuna partita corrispondente! Assicurati di giocare le partite richieste prima di controllare i risultati.
						-# Nota: solo le partite in ${round.mode} con i bot disattivati tra ${match.user1Tag} e ${match.user2Tag} vengono considerate
						${battles[0]}-# Ultima partita di ${tag} registrata il <t:${Math.round(Clash.parseAPIDate(battles[0]?.battleTime ?? "") / 1000)}:s>
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
			args: [tournamentId],
			interaction: {
				data: { components },
				locale,
			},
			user: { id },
		}: ModalArgs,
	) => {
		ok(
			components[0]?.type === ComponentType.Label &&
				components[0].component.type === ComponentType.TextInput,
		);
		const tag = components[0].component.value;

		try {
			return edit(
				this.createConfirmMessage(
					await register(Number(tournamentId), {
						tag,
						userId: id,
						simulate: true,
						defer: defer.bind(null, { flags: MessageFlags.Ephemeral }),
						mode: RegistrationMode.Discord,
					}),
					locale,
				),
			);
		} catch (err) {
			if (err instanceof RegisterError)
				return reply({ content: err.message, flags: MessageFlags.Ephemeral });
			defer({ flags: MessageFlags.Ephemeral });
			return this.handleError(err, edit);
		}
	};
	static stringifyBattlePlayer = (battlePlayer: Brawl.BattlePlayer) =>
		`${battlePlayer.name} (${forceCapitalize(
			(battlePlayer.brawlers ?? [battlePlayer.brawler!])
				.map((b) => b.name)
				.join(", "),
		)})`;
	static buildModal = (options: {
		id: string;
	}): APIModalInteractionResponseCallbackData => ({
		title: "Iscrizione al torneo",
		custom_id: `tournament-tag-${options.id}`,
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
	private static createConfirmMessage(
		result: Awaited<ReturnType<typeof register>>,
		locale: Locale,
	): RESTPatchAPIWebhookWithTokenMessageJSONBody {
		const { tournament, player, name, tag, savedPlayers, tournamentId } =
			result;

		return {
			content: `Confermi la tua iscrizione al torneo **${tournament.name}** come **${name}**?`,
			embeds:
				player ?
					[
						([Brawl, Clash] as const)[tournament.game].createPlayerEmbed(
							player as never,
							{ locale },
						),
					]
				:	undefined,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.StringSelect,
							custom_id: `tournament-pro-${tournamentId}`,
							placeholder: "Cambia profilo",
							options: [
								...savedPlayers.map<APISelectMenuOption>((p) => ({
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
							custom_id: `tournament-reg-${tournamentId}-${tag ?? ""}`,
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
		};
	}
}
