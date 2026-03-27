import cssMap from "build:css";
import jsMap from "build:js";
import { env } from "cloudflare:workers";
import {
	RouteBases,
	Routes,
	type APIUser,
	type RESTGetAPIGuildMemberResult,
} from "discord-api-types/v10";
import { match } from "node:assert/strict";
import { renderToReadableStream } from "react-dom/server";
import Index from "./app/index.page";
import Tournaments from "./app/tournaments.page";
import NewTournament from "./app/tournaments/new.page";
import { Brawl } from "./commands/brawl";
import * as commands from "./commands/index";
import { CommandHandler } from "./util/CommandHandler";
import { RegistrationMode, TournamentFlags } from "./util/Constants";
import { createSolidPng } from "./util/createSolidPng";
import { parseForm, ParseType } from "./util/forms";
import { rest, textEncoder } from "./util/globals";
import { isMobile } from "./util/isMobile";
import { ok } from "./util/node";
import normalizeError from "./util/normalizeError";
import { toSearchParams } from "./util/objects";
import type { RGB } from "./util/resolveColor";
import { create403, create405 } from "./util/responses";
import { TimeUnit } from "./util/time";
import {
	createSetCookie,
	createToken,
	isAdmin,
	parseToken,
	refreshToken,
	tokenFromResponse,
	updateToken,
} from "./util/token";

const handler = new CommandHandler(Object.values(commands));
const authRedirectPath = "/auth/discord/callback";

const server: ExportedHandler<Env> = {
	fetch: async (request) => {
		const url = new URL(request.url);

		if (url.pathname === "/") {
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405();
			const { setCookie, token } = await createSetCookie(request);

			return new Response(
				request.method === "GET" ?
					await renderToReadableStream(
						<Index
							mobile={isMobile(request.headers)}
							styles={cssMap[url.pathname]}
							url={url}
							user={
								(token && {
									id: token.i,
									avatar: token.h ?? null,
									global_name: token.d ?? null,
									username: token.u,
								}) satisfies
									| Pick<APIUser, "id" | "username" | "avatar" | "global_name">
									| undefined
							}
						/>,
						{ bootstrapModules: jsMap[url.pathname] },
					)
				:	null,
				{
					headers: {
						"accept-ch": "Sec-CH-UA-Mobile",
						"cache-control": "private, max-age=300",
						"content-type": "text/html",
						"set-cookie": setCookie,
						vary: "Cookie",
					},
				},
			);
		}
		if (url.pathname === "/tournaments") {
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405();
			const { setCookie, token } = await createSetCookie(request);

			return new Response(
				request.method === "GET" ?
					await renderToReadableStream(
						<Tournaments
							styles={cssMap[url.pathname]}
							url={url}
							admin={await isAdmin(token)}
							tournaments={env.DB.prepare(`SELECT * FROM Tournaments`)
								.run<Database.Tournament>()
								.then((r) => r.results)}
							mobile={isMobile(request.headers)}
						/>,
						{ bootstrapModules: jsMap[url.pathname] },
					)
				:	null,
				{
					headers: {
						"accept-ch": "Sec-CH-UA-Mobile",
						"cache-control": "private, max-age=300",
						"content-type": "text/html",
						"set-cookie": setCookie,
						vary: "Cookie",
					},
				},
			);
		}
		if (url.pathname === "/tournaments/new") {
			if (request.method === "POST") {
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
					.map((mode, i) => ({
						mode: (mode as string).toString(),
						bof: +bof[i]!,
					}));

				try {
					const idRegex = /^\d{16,32}$/;
					const linkRegex =
						/^https?:\/\/(?:[^.]+\.)?discord\.com\/channels\/(?<guild>\d{16,32})\/(?<channel>\d{16,32})\/(?<message>\d{16,32})$/;

					ok(form.title, "Il titolo è richiesto");
					ok(form.logChannel, "Il canale di log è richiesto");
					match(
						form.logChannel,
						idRegex,
						"L'id del canale di log non è valido",
					);
					ok(form.game != null, "Il gioco è richiesto");
					ok(!Number.isNaN(form.game), "Il gioco non è valido");
					ok(form.team, "La dimensione della squadra è richiesta");
					ok(
						!Number.isNaN(form.team),
						"La dimensione della squadra non è valida",
					);
					ok(
						form.team > 0,
						"La dimensione della squadra deve essere maggiore di 0",
					);
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
						match(
							form.roleId,
							idRegex,
							"L'id del ruolo di iscrizione non è valido",
						);
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
					ok(
						rounds.length > 0,
						"Devi specificare la modalità almeno per un round",
					);
					ok(
						rounds.every((r) => r.bof && r.bof > 0),
						"Numero partite non valido",
					);
					if (form.message) registrationMode |= RegistrationMode.Discord;
					if (form.dashboard) registrationMode |= RegistrationMode.Dashboard;
					if (form.tagRequired) flags |= TournamentFlags.TagRequired;
					if (form.publicBrackets) flags |= TournamentFlags.PublicBrackets;
					if (form.autoDetectResults)
						flags |= TournamentFlags.AutoDetectResults;
					if (form.autoDeleteChannels)
						flags |= TournamentFlags.AutoDeleteChannels;
				} catch (err) {
					return new Response(null, {
						status: 303,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							location: `/tournaments/new?error=${encodeURIComponent((err as Error).name)}&error_description=${encodeURIComponent((err as Error).message)}`,
						},
					});
				}
				try {
					const id = crypto.randomUUID();
					const {
						meta: { last_row_id },
					} = await env.DB.prepare(
						`INSERT INTO Tournaments (
							name,
							flags,
							game,
							logChannel,
							registrationMode,
							rounds,
							team,
							bracketsTime,
							categoryId,
							channelName,
							channelsTime,
							endedCategoryId,
							endedChannelName,
							matchMessageLink,
							minPlayers,
							registrationChannel,
							registrationEnd,
							registrationTemplateLink,
							registrationRole,
							registrationStart,
							roundType,
							workflowId
						)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					)
						.bind(
							form.title,
							flags,
							form.game,
							form.logChannel,
							registrationMode,
							JSON.stringify(rounds),
							form.team,
							form.bracketsTime,
							form.categoryId,
							form.channelName,
							form.autoChannels,
							form.endedCategoryId,
							form.endedChannelName,
							form.matchMessageLink,
							form.minPlayers,
							form.channelId,
							form.registrationEndTime,
							form.messageLink,
							form.roleId,
							form.registrationStartTime,
							form.channelsMode,
							id,
						)
						.run();
					await env.TOURNAMENT.create({ id, params: { id: last_row_id } });
					return new Response(null, {
						status: 303,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							location: "/tournaments",
						},
					});
				} catch (err) {
					console.error(err);
					return new Response(null, {
						status: 303,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							location: `/tournaments/new?error=${encodeURIComponent((err as Error).name)}`,
						},
					});
				}
			}
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405("HEAD, GET, POST");
			const { setCookie, token } = await createSetCookie(request);

			if (!token)
				return new Response(null, {
					status: 303,
					headers: {
						location: `/auth/discord/login?to=${encodeURIComponent(url.pathname)}`,
						"set-cookie": setCookie,
					},
				});
			const member = (await rest
				.get(Routes.guildMember(env.MAIN_GUILD, token.i))
				.catch(() => null)) as RESTGetAPIGuildMemberResult | null;
			if (
				new Set(member?.roles).isDisjointFrom(
					new Set(env.ALLOWED_ROLES.split(",")),
				)
			)
				return create403(request, {
					headers: {
						"cache-control": "private, max-age=300",
						"set-cookie": setCookie,
						vary: "Cookie",
					},
				});
			return new Response(
				request.method === "GET" ?
					await renderToReadableStream(
						<NewTournament
							styles={cssMap[url.pathname]}
							url={url}
							mobile={isMobile(request.headers)}
							modesPromise={Brawl.getModes().catch(
								(err) => void console.error(err),
							)}
						/>,
						{ bootstrapModules: jsMap[url.pathname] },
					)
				:	null,
				{
					headers: {
						"accept-ch": "Sec-CH-UA-Mobile",
						"cache-control": "private, max-age=300",
						"content-type": "text/html",
						"set-cookie": setCookie,
						vary: "Cookie",
					},
				},
			);
		}
		if (url.pathname === "/auth/discord/login") {
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405();
			let r = url.searchParams.get("to") ?? request.headers.get("Referer");
			if (r && URL.canParse(r)) r = new URL(r).pathname;
			try {
				const token = await parseToken(
					request.headers.get("cookie")?.match(/(?:^|;\s*)token=([^;]*)/)?.[1],
				);

				if (token && +token.e * 1000 - 5 * TimeUnit.Minute > Date.now())
					return new Response(null, {
						status: 303,
						headers: {
							location: `${r ?? "/"}?login_success`,
							"set-cookie": `token=${await createToken(await updateToken(token))}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
						},
					});
				else if (token?.r)
					return new Response(null, {
						status: 303,
						headers: {
							location: `${r ?? "/"}?login_success`,
							"set-cookie": `token=${await createToken(await refreshToken(token.r, true))}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
						},
					});
			} catch (err) {
				// If no token is present or it's invalid, re-request authorization
			}
			const state = textEncoder
				.encode(toSearchParams({ s: crypto.randomUUID(), r }).toString())
				.toBase64({ alphabet: "base64url", omitPadding: true });

			return new Response(null, {
				headers: {
					location: `https://discord.com/oauth2/authorize?${new URLSearchParams(
						{
							redirect_uri: new URL(authRedirectPath, url).href,
							client_id: env.DISCORD_APPLICATION_ID,
							response_type: "code",
							scope: "identify",
							prompt: "none",
							state,
						},
					).toString()}`,
					"set-cookie": `loginState=${state}; Path=/auth/discord/; HttpOnly; Secure; SameSite=Lax`,
				},
				status: 302,
			});
		}
		if (url.pathname === "/auth/discord/logout") {
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405();
			let r = url.searchParams.get("to") ?? request.headers.get("Referer");

			if (r && URL.canParse(r)) r = new URL(r).pathname;
			return new Response(null, {
				status: 303,
				headers: {
					location: `${r ?? "/"}?logout`,
					"set-cookie": `token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
				},
			});
		}
		if (url.pathname === authRedirectPath) {
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405();
			const code = url.searchParams.get("code"),
				state = url.searchParams.get("state");
			const loginState = request.headers
				.get("cookie")
				?.match(/(?:^|;\s*)loginState=([^;]*)/)?.[1];
			const headers: [string, string][] = [
				[
					"Set-Cookie",
					`loginState=; Path=/auth/discord/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
				],
			];
			const parsed = await Promise.try(
				() => new URLSearchParams(atob(state!)),
			).catch(normalizeError);
			if (loginState !== state || !state || parsed instanceof Error) {
				headers.push([
					"Location",
					`/?${new URLSearchParams({ error: "invalid_state", error_description: "La richiesta ha fornito parametri inaspettati: assicurati di non aver aperto più finestre di login o disattivato i cookie" }).toString()}`,
				]);
				return new Response(null, { status: 303, headers });
			}
			if (!code) {
				headers.push([
					"Location",
					`/?${new URLSearchParams({ error: url.searchParams.get("error") ?? "invalid_code", error_description: url.searchParams.get("error_description") ?? "La richiesta non ha restituito il codice di accesso. Riprova più tardi" }).toString()}`,
				]);
				return new Response(null, { status: 303, headers });
			}
			const token = await tokenFromResponse(
				await fetch(RouteBases.api + Routes.oauth2TokenExchange(), {
					body: new URLSearchParams({
						code,
						redirect_uri: new URL(authRedirectPath, url).href,
						grant_type: "authorization_code",
					}).toString(),
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						Authorization: `Basic ${textEncoder.encode(`${env.DISCORD_APPLICATION_ID}:${env.DISCORD_CLIENT_SECRET}`).toBase64()}`,
					},
					method: "POST",
				}),
			);

			if (token instanceof URLSearchParams) {
				headers.push(["Location", `/?${token.toString()}`]);
				return new Response(null, { status: 303, headers });
			}
			headers.push(
				["Location", `${parsed.get("r") ?? "/"}?login_success`],
				[
					"Set-Cookie",
					`token=${await createToken(token)}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
				],
			);
			return new Response(null, { status: 303, headers });
		}
		if (url.pathname === "/interactions") {
			if (request.method === "POST")
				return handler.handleInteraction(request).catch((e) => {
					if (e instanceof Response) return e;
					console.error(e);
					return new Response(null, { status: 500 });
				});
			return create405("POST");
		}
		if (url.pathname === "/color") {
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405();
			const rgb = [
				url.searchParams.get("red"),
				url.searchParams.get("green"),
				url.searchParams.get("blue"),
			].map(Number) as RGB;

			if (rgb.some(isNaN))
				return request.method === "GET" ?
						Response.json(
							{ error: "Missing 'red', 'green' or 'blue' query parameter" },
							{ status: 400 },
						)
					:	new Response(null, {
							status: 400,
							headers: { "content-type": "application/json" },
						});
			return new Response(
				request.method === "GET" ?
					((await createSolidPng(256, 256, ...rgb)) as BodyInit)
				:	null,
				{ headers: { "Content-Type": "image/png" } },
			);
		}
		return new Response(null, { status: 404 });
	},
	scheduled: async ({ cron }) => {
		if (cron === "0 0 * * *")
			await Promise.allSettled([
				env.PREDICTIONS_REMINDERS.create(),
				env.WEBSOCKET.create(),
			]);
		else if (cron === "*/5 * * * *") {
			const { results } = await env.DB.prepare(
				`SELECT *
				FROM SupercellPlayers
				WHERE notifications != 0`,
			).all<Database.SupercellPlayer>();
			const instances = await env.NOTIFICATIONS.createBatch(
				results
					.reduce<Database.SupercellPlayer[][]>((arr, v) => {
						if (!arr.length || arr.at(-1)!.length >= 25) arr.push([]);
						arr.at(-1)!.push(v);
						return arr;
					}, [])
					.map((players) => ({ params: { players } })),
			);

			console.log(
				"Started workflow(s) with IDs",
				...instances.map((r) => r.id),
			);
		}
	},
};

export { Notifications } from "./Notifications";
export { PredictionsReminders } from "./PredictionsReminders";
export { Reminder } from "./Reminder";
export { Shorten } from "./Shorten";
export { Tournament } from "./Tournament";
export { WebSocket } from "./WebSocket";

export default server;
