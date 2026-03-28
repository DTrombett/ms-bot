import { Routes, type RESTGetAPIChannelResult } from "discord-api-types/v10";
import { match } from "node:assert/strict";
import { RegistrationMode, TournamentFlags } from "../Constants";
import { parseForm, ParseType } from "../forms";
import { rest } from "../globals";
import { ok } from "../node";
import { create403 } from "../responses";
import { isAdmin } from "../token";

export const parseTournamentData = async (
	request: Request,
	pathname: string,
): Promise<Response | Omit<Database.Tournament, "id">> => {
	if (!(await isAdmin(request.headers))) return create403(request);
	const formData = await request.formData();
	const form = parseForm(formData, {
		title: ParseType.Text,
		logChannel: ParseType.Text,
		game: ParseType.Number,
		team: ParseType.Number,
		message: ParseType.Boolean,
		dashboard: ParseType.Boolean,
		minPlayers: ParseType.Number,
		messageLink: ParseType.Text,
		channelId: ParseType.Text,
		roleId: ParseType.Text,
		registrationStartTime: ParseType.DateTime,
		registrationEndTime: ParseType.DateTime,
		tagRequired: ParseType.Boolean,
		bracketsTime: ParseType.DateTime,
		publicBrackets: ParseType.Boolean,
		autoChannels: ParseType.DateTime,
		channelsMode: ParseType.Number,
		autoDetectResults: ParseType.Boolean,
		autoDeleteChannels: ParseType.Boolean,
		channelName: ParseType.Text,
		endedChannelName: ParseType.Text,
		categoryId: ParseType.Text,
		endedCategoryId: ParseType.Text,
		matchMessageLink: ParseType.Text,
	});
	let registrationMode = 0,
		flags = 0;
	const bof = formData.getAll("bof");
	const rounds = formData
		.getAll("mode")
		.map((mode, i) => ({ mode: (mode as string).toString(), bof: +bof[i]! }));

	try {
		const idRegex = /^\d{16,32}$/;
		const linkRegex =
			/^https?:\/\/(?:[^.]+\.)?discord\.com\/channels\/(?<guild>\d{16,32}|@me)\/(?<channel>\d{16,32})\/(?<message>\d{16,32})$/;

		ok(form.title, "Il titolo è richiesto");
		ok(form.logChannel, "Il canale di log è richiesto");
		match(form.logChannel, idRegex, "L'id del canale di log non è valido");
		ok(form.game != null, "Il gioco è richiesto");
		ok(!Number.isNaN(form.game), "Il gioco non è valido");
		ok(form.team, "La dimensione della squadra è richiesta");
		ok(!Number.isNaN(form.team), "La dimensione della squadra non è valida");
		ok(form.team > 0, "La dimensione della squadra deve essere maggiore di 0");
		ok(
			form.team <= 5,
			"La dimensione della squadra deve essere al massimo di 5",
		);
		ok(
			!form.minPlayers || form.minPlayers > 0,
			"Il numero minimo di iscritti deve essere maggiore di 0",
		);
		if (form.messageLink) {
			const result = form.messageLink.match(linkRegex);

			ok(
				result?.groups?.channel && result.groups.message,
				"Link al messaggio di iscrizione non valido",
			);
			form.messageLink = `${result.groups.channel}/${result.groups.message}`;
		}
		if (form.channelId)
			match(
				form.channelId,
				idRegex,
				"L'id del canale di iscrizione non è valido",
			);
		if (form.roleId)
			match(form.roleId, idRegex, "L'id del ruolo di iscrizione non è valido");
		ok(
			!Number.isNaN(form.registrationStartTime),
			"La data di inizio registrazioni non è valida",
		);
		ok(
			!Number.isNaN(form.registrationEndTime),
			"La data di fine registrazioni non è valida",
		);
		ok(
			(!form.registrationStartTime || form.registrationEndTime) &&
				(form.registrationStartTime || !form.registrationEndTime),
			"Devi specificare sia l'inizio che la fine delle registrazioni",
		);
		ok(
			!form.registrationStartTime ||
				form.registrationEndTime! > form.registrationStartTime,
			"L'inizio delle registrazioni non può essere successivo alla fine",
		);
		ok(
			!form.registrationEndTime ||
				!form.bracketsTime ||
				form.bracketsTime >= form.registrationEndTime,
			"La data di creazione delle brackets deve essere successiva alla fine delle registrazioni",
		);
		ok(
			!form.autoChannels ||
				!form.registrationEndTime ||
				form.autoChannels >= form.registrationEndTime,
			"La data di creazione dei canali deve essere successiva alla fine delle registrazioni",
		);
		ok(
			!form.autoChannels ||
				!form.bracketsTime ||
				form.autoChannels >= form.bracketsTime,
			"La data di creazione dei canali deve essere successiva alla creazione dei brackets",
		);
		ok(
			!Number.isNaN(form.bracketsTime),
			"La data di creazione brackets non è valida",
		);
		ok(
			!Number.isNaN(form.autoChannels),
			"La data di creazione canali non è valida",
		);
		ok(
			!Number.isNaN(form.channelsMode),
			"La modalità di avanzamento round non è valida",
		);
		if (form.categoryId)
			match(
				form.categoryId,
				idRegex,
				"L'id della categoria in cui creare i canali non è valido",
			);
		if (form.endedCategoryId)
			match(
				form.endedCategoryId,
				idRegex,
				"L'id della categoria in cui spostare i canali non è valido",
			);
		if (form.matchMessageLink) {
			const result = form.matchMessageLink.match(linkRegex);

			ok(
				result?.groups?.channel && result.groups.message,
				"Il link al messaggio da mandare nei canali partite non è valido",
			);
			form.matchMessageLink = `${result.groups.channel}/${result.groups.message}`;
		}
		ok(
			!form.autoChannels || form.channelsMode,
			"La modalità di avanzamento round è richiesta quando si attiva la creazione automatica dei canali",
		);
		ok(
			!form.message || form.messageLink,
			"Il link al messaggio di iscrizione è richiesto quando si attiva l'iscrizione tramite messaggio",
		);
		ok(
			!form.message || form.channelId,
			"Il canale in cui mandare il messaggio è richiesto quando si attiva l'iscrizione tramite messaggio",
		);
		ok(
			!form.autoChannels || form.channelName,
			"Il nome dei canali delle partite è richiesto quando si attiva la creazione automatica dei canali",
		);
		ok(rounds.length > 0, "Devi specificare la modalità almeno per un round");
		ok(
			rounds.every((r) => r.bof && r.bof > 0),
			"Numero partite non valido",
		);
		if (form.message) registrationMode |= RegistrationMode.Discord;
		if (form.dashboard) registrationMode |= RegistrationMode.Dashboard;
		if (form.tagRequired) flags |= TournamentFlags.TagRequired;
		if (form.publicBrackets) flags |= TournamentFlags.PublicBrackets;
		if (form.autoDetectResults) flags |= TournamentFlags.AutoDetectResults;
		if (form.autoDeleteChannels) flags |= TournamentFlags.AutoDeleteChannels;
	} catch (err) {
		return new Response(null, {
			status: 303,
			headers: {
				"accept-ch": "Sec-CH-UA-Mobile",
				location: `${pathname}?error=${encodeURIComponent((err as Error).name)}&error_description=${encodeURIComponent((err as Error).message)}`,
			},
		});
	}
	return {
		name: form.title,
		flags,
		game: form.game,
		logChannel: form.logChannel,
		registrationMode,
		rounds: JSON.stringify(rounds),
		team: form.team,
		bracketsTime: form.bracketsTime,
		categoryId: form.categoryId,
		channelName: form.channelName,
		channelsTime: form.autoChannels,
		endedCategoryId: form.endedCategoryId,
		endedChannelName: form.endedChannelName,
		matchMessageLink: form.matchMessageLink,
		minPlayers: form.minPlayers,
		registrationChannel: form.channelId,
		registrationChannelName:
			form.channelId &&
			(
				(await rest.get(
					Routes.channel(form.channelId),
				)) as RESTGetAPIChannelResult
			).name,
		registrationEnd: form.registrationEndTime,
		registrationTemplateLink: form.messageLink,
		registrationRole: form.roleId,
		registrationStart: form.registrationStartTime,
		roundType: form.channelsMode,
	};
};
