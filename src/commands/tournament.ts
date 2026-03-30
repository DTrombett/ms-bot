import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	Routes,
	TextInputStyle,
	type APIModalInteractionResponseCallbackData,
	type APISelectMenuOption,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";
import { RegistrationMode, TournamentFlags } from "../util/Constants";
import { rest } from "../util/globals";
import { ok } from "../util/node";
import { TimeUnit } from "../util/time";
import { createRegistrationMessage } from "../util/tournaments/createRegistrationMessage";
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
			return this.handleTournament(results[0]!, edit, id, options);
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
		options: { tag?: string; team?: string; confirm?: boolean },
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
			const { name } = await Brawl.getPlayer(options.tag, { edit });
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
				.bind(options.tag, userId, tournament.game, name)
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
			return this.completeRegistration(tournament, edit, userId, options.tag);
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
			embeds: [Brawl.createPlayerEmbed(player)],
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
		tag?: string,
	) => {
		const [, result] = await env.DB.batch<
			Pick<
				Database.Tournament,
				| "minPlayers"
				| "registrationMessage"
				| "registrationTemplateLink"
				| "registrationRole"
				| "registrationChannel"
			> & { participantCount: number }
		>([
			env.DB.prepare(
				`
					INSERT INTO Participants (tournamentId, userId, tag)
					VALUES (?1, ?2, ?3)
				`,
			).bind(tournament.id, userId, tag || null),
			env.DB.prepare(
				`
					SELECT minPlayers, registrationMessage, registrationChannel, registrationTemplateLink, registrationRole,
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
			rest.put(
				Routes.guildMemberRole(env.MAIN_GUILD, userId, data.registrationRole!),
				{ reason: `Iscrizione al torneo ${tournament.name}` },
			),
			rest.patch(
				Routes.channelMessage(
					data.registrationChannel!,
					data.registrationMessage!,
				),
				{
					body: await createRegistrationMessage(
						tournament.id,
						data.registrationTemplateLink!,
						data.participantCount,
						tournament.name,
						data.minPlayers,
					),
				},
			),
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
					t.minPlayers, t.registrationMessage, t.registrationChannel, t.registrationTemplateLink, t.registrationRole, t.name,
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
					| "registrationMessage"
					| "registrationChannel"
					| "registrationTemplateLink"
					| "registrationRole"
					| "name"
				>
			>();

		if (!data?.registrationOpen)
			return edit({ content: "Le iscrizioni per questo torneo sono chiuse!" });
		if (!data.participationExists)
			return edit({ content: "Non risulti iscritto a questo torneo!" });
		await Promise.all([
			rest.delete(
				Routes.guildMemberRole(env.MAIN_GUILD, id, data.registrationRole!),
				{ reason: `Rimozione iscrizione al torneo ${data.name}` },
			),
			rest.patch(
				Routes.channelMessage(
					data.registrationChannel!,
					data.registrationMessage!,
				),
				{
					body: await createRegistrationMessage(
						Number(tournament),
						data.registrationTemplateLink!,
						data.participantCount - 1,
						data.name,
						data.minPlayers,
					),
				},
			),
			env.DB.prepare(
				`
					DELETE FROM Participants
					WHERE tournamentId = ?1 AND userId = ?2
				`,
			)
				.bind(tournament, id)
				.run(),
		]);
		return edit({ content: "Hai rimosso la tua iscrizione!" });
	};
	static reg = async (
		{ edit, deferUpdate, modal, defer, reply }: ComponentReplies,
		{ args: [tournamentId, tag, team], user: { id } }: ComponentArgs,
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
				JOIN Tournaments t
				    ON sp.type = t.game
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
			embeds: [Brawl.createPlayerEmbed(player)],
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
