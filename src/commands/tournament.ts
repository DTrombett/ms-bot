import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	TextInputStyle,
	type APIModalInteractionResponseCallbackData,
	type APISelectMenuOption,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";
import { RegistrationMode, TournamentFlags } from "../util/Constants";
import { ok } from "../util/node";
import { TimeUnit } from "../util/time";
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
								value: r.id.toString(32),
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
			await env.DB.prepare(
				`
					INSERT OR IGNORE INTO SupercellPlayers (tag, userId, active, type, name)
					VALUES (
						?1,
						?2,
						NOT EXISTS (
							SELECT 1
							FROM SupercellPlayers
							WHERE userId = ?2
							  AND type = ?3
							  AND active = 1
						),
						?3,
						?4
					)
				`,
			)
				.bind(options.tag, userId, tournament.game, name)
				.run();
			const result = await env.DB.prepare(
				`
					INSERT INTO Participants (tournamentId, userId, tag)
					VALUES (?1, ?2, ?3)
					ON CONFLICT(tournamentId, tag) DO UPDATE
					SET tag = tag
					RETURNING userId
				`,
			)
				.bind(tournament.id, userId, options.tag)
				.run();

			if (result?.results[0]?.userId && result.results[0].userId !== userId)
				return edit({
					content: `Esiste già un altro utente registrato con lo stesso tag!`,
				});
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
		}
		if (!(tournament.flags & TournamentFlags.TagRequired) && !options.tag) {
			await env.DB.prepare(
				`
					INSERT INTO Participants (tournamentId, userId)
					VALUES (?1, ?2)
				`,
			)
				.bind(tournament.id, userId)
				.run();
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
		}
		const { results: saved } = await env.DB.prepare(
			`SELECT tag, active, name FROM SupercellPlayers WHERE userId = ? AND type = ?`,
		)
			.bind(userId, tournament.game)
			.run<Pick<Database.SupercellPlayer, "tag" | "active" | "name">>();
		options.tag ??= (saved.find((g) => g.active) ?? saved[0])?.tag;
		if (!options.tag)
			return edit({
				content:
					"In questo torneo è obbligatorio specificare il proprio tag giocatore per iscriversi!",
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
								// TODO: Change this before merging
								id: "1486438403997175928",
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
			});
		return this.handleTournament(tournament, edit, id, { tag, team });
	};
	static unr = async (
		{ edit, defer }: ComponentReplies,
		{ args: [tournament], user: { id } }: ComponentArgs,
	) => {
		defer({ flags: MessageFlags.Ephemeral });
		const prepare = await env.DB.prepare(
			`
				SELECT 
					p.userId IS NOT NULL AS participationExists,
					(
						(t.registrationMode & ?1) != 0
						AND t.registrationStart < unixepoch('now')
						AND t.registrationEnd > unixepoch('now') + 1
					) AS registrationOpen
				FROM Tournaments t
				LEFT JOIN Participants p
					ON p.tournamentId = t.id AND p.userId = ?2
				WHERE t.id = ?3
			`,
		)
			.bind(RegistrationMode.Discord, id, tournament)
			.first<{ participationExists: boolean; registrationOpen: boolean }>();

		if (!prepare?.registrationOpen)
			return edit({ content: "Le iscrizioni per questo torneo sono chiuse!" });
		if (!prepare.participationExists)
			return edit({ content: "Non risulti iscritto a questo torneo!" });
		const { meta } = await env.DB.prepare(
			`
				DELETE FROM Participants
				WHERE tournamentId = ?1 AND userId = ?2
			`,
		)
			.bind(tournament, id)
			.run();
		return edit({
			content:
				meta.changed_db ?
					"Hai rimosso la tua iscrizione!"
				:	"Non risulti iscritto a questo torneo!",
		});
	};
	static reg = async (
		{ edit, deferUpdate, modal, defer }: ComponentReplies,
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
		// TODO: Check if the user is already registered
		const { results } = await env.DB.prepare(
			`
				SELECT sp.tag, sp.active, sp.name, t.registrationMode, t.registrationStart, t.registrationEnd, t.name as tournamentName
				FROM SupercellPlayers sp
				JOIN Tournaments t ON sp.type = t.game
				WHERE t.id = ?1 AND sp.userId = ?2
			`,
		)
			.bind(tournamentId, id)
			.run<
				Pick<Database.SupercellPlayer, "tag" | "active" | "name"> & {
					tournamentName: Database.Tournament["name"];
				} & Pick<
						Database.Tournament,
						"registrationMode" | "registrationStart" | "registrationEnd"
					>
			>();
		const result = results.find((g) => g.active) ?? results[0];

		if (!result) return modal(this.buildModal({ id: tournamentId!, team }));
		if (
			!(result.registrationMode & RegistrationMode.Discord) ||
			result.registrationStart! * TimeUnit.Second > Date.now() ||
			(result.registrationEnd! - 1) * TimeUnit.Second < Date.now()
		)
			return edit({ content: "Le iscrizioni per questo torneo sono chiuse." });
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
								// TODO: Change this before merging
								id: "1486438403997175928",
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
		custom_id: `tournament-tag-${options.id}-${options.team}`,
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
