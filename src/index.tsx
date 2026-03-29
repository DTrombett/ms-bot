import cssMap from "build:css";
import jsMap from "build:js";
import { env, waitUntil } from "cloudflare:workers";
import {
	RouteBases,
	Routes,
	type APIUser,
	type RESTGetAPIGuildMemberResult,
} from "discord-api-types/v10";
import { renderToReadableStream } from "react-dom/server";
import Index from "./app/index.page";
import Tournaments from "./app/tournaments.page";
import EditTournament from "./app/tournaments/[id]/edit.page";
import NewTournament from "./app/tournaments/new.page";
import { Brawl } from "./commands/brawl";
import * as commands from "./commands/index";
import { CommandHandler } from "./util/CommandHandler";
import { RegistrationMode, TournamentFlags } from "./util/Constants";
import { createSolidPng } from "./util/createSolidPng";
import { rest, textDecoder, textEncoder } from "./util/globals";
import { isMobile } from "./util/isMobile";
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
import { createRegistrationMessage } from "./util/tournaments/createRegistrationMessage";
import { parseTournamentData } from "./util/tournaments/parseTournamentData";

const handler = new CommandHandler(Object.values(commands));
const authRedirectPath = "/auth/discord/callback";

const server: ExportedHandler<Env> = {
	fetch: async (request) => {
		const url = new URL(request.url);
		let matchResult: RegExpMatchArray | null;

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
			if (request.method === "POST")
				try {
					const tournament = await parseTournamentData(request, url.pathname);
					if (tournament instanceof Response) return tournament;
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
							registrationChannelName,
							registrationEnd,
							registrationTemplateLink,
							registrationRole,
							registrationStart,
							roundType,
							workflowId
						)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					)
						.bind(
							tournament.name,
							tournament.flags,
							tournament.game,
							tournament.logChannel,
							tournament.registrationMode,
							tournament.rounds,
							tournament.team,
							tournament.bracketsTime,
							tournament.categoryId,
							tournament.channelName,
							tournament.channelsTime,
							tournament.endedCategoryId,
							tournament.endedChannelName,
							tournament.matchMessageLink,
							tournament.minPlayers,
							tournament.registrationChannel,
							tournament.registrationChannelName,
							tournament.registrationEnd,
							tournament.registrationTemplateLink,
							tournament.registrationRole,
							tournament.registrationStart,
							tournament.roundType,
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
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405("HEAD, GET, POST");
			const { setCookie, token } = await createSetCookie(request);

			return new Response(
				request.method === "GET" ?
					await renderToReadableStream(
						<Tournaments
							styles={cssMap[url.pathname]}
							url={url}
							admin={await isAdmin(token)}
							tournaments={(token?.i ?
								env.DB.prepare(
									`
										SELECT t.*, p.userId IS NOT NULL AS isRegistered,
											EXISTS (
												SELECT 1 FROM SupercellPlayers sp WHERE sp.userId = ?1
											) AS hasPlayer
										FROM Tournaments t
										LEFT JOIN Participants p ON p.tournamentId = t.id AND p.userId = ?1
									`,
								).bind(token.i)
							:	env.DB.prepare(`SELECT * FROM Tournaments`)
							)
								.run<
									Database.Tournament & {
										isRegistered?: boolean;
										hasPlayer?: boolean;
									}
								>()
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
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405();
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
		if (
			(matchResult = url.pathname.match(/^\/tournaments\/([^/]+)\/edit\/?$/))
		) {
			if (request.method === "POST")
				try {
					const tournament = await parseTournamentData(request, url.pathname);
					if (tournament instanceof Response) return tournament;
					const id = await env.DB.prepare(
						`
							UPDATE Tournaments SET
								name = ?,
								flags = ?,
								game = ?,
								logChannel = ?,
								registrationMode = ?,
								rounds = ?,
								team = ?,
								bracketsTime = ?,
								categoryId = ?,
								channelName = ?,
								channelsTime = ?,
								endedCategoryId = ?,
								endedChannelName = ?,
								matchMessageLink = ?,
								minPlayers = ?,
								registrationChannel = ?,
								registrationChannelName = ?,
								registrationEnd = ?,
								registrationTemplateLink = ?,
								registrationRole = ?,
								registrationStart = ?,
								roundType = ?
							WHERE id = ?
							RETURNING workflowId
						`,
					)
						.bind(
							tournament.name,
							tournament.flags,
							tournament.game,
							tournament.logChannel,
							tournament.registrationMode,
							tournament.rounds,
							tournament.team,
							tournament.bracketsTime,
							tournament.categoryId,
							tournament.channelName,
							tournament.channelsTime,
							tournament.endedCategoryId,
							tournament.endedChannelName,
							tournament.matchMessageLink,
							tournament.minPlayers,
							tournament.registrationChannel,
							tournament.registrationChannelName,
							tournament.registrationEnd,
							tournament.registrationTemplateLink,
							tournament.registrationRole,
							tournament.registrationStart,
							tournament.roundType,
							Number(matchResult[1]),
						)
						.first<Database.Tournament["workflowId"]>("workflowId");

					if (id)
						waitUntil(
							env.TOURNAMENT.get(id).then((workflowInstance) =>
								workflowInstance.restart(),
							),
						);
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
							location: `${url.pathname}?error=${encodeURIComponent((err as Error).name)}`,
						},
					});
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
			const tournament = await env.DB.prepare(
				`SELECT * FROM Tournaments WHERE id = ?`,
			)
				.bind(Number(matchResult[1]))
				.first<Database.Tournament>();

			if (!tournament)
				return new Response(null, {
					status: 303,
					headers: { location: "/tournaments", "set-cookie": setCookie },
				});
			return new Response(
				request.method === "GET" ?
					await renderToReadableStream(
						<EditTournament
							styles={cssMap["/tournaments/[id]/edit"]}
							url={url}
							mobile={isMobile(request.headers)}
							modesPromise={Brawl.getModes().catch(
								(err) => void console.error(err),
							)}
							tournament={tournament}
						/>,
						{ bootstrapModules: jsMap["/tournaments/[id]/edit"] },
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
		if (
			(matchResult = url.pathname.match(
				/^\/tournaments\/([^/]+)\/register\/?$/,
			))
		) {
			if (request.method !== "POST") return create405("POST");
			const { setCookie, token } = await createSetCookie(request);
			if (!token)
				return new Response(null, {
					status: 303,
					headers: {
						location: `/auth/discord/login?to=${encodeURIComponent(request.headers.get("Referer") ?? "/tournaments")}`,
						"set-cookie": setCookie,
					},
				});
			try {
				const tournament = await env.DB.prepare(
					`
						SELECT t.name, t.flags, t.team,
						(
							SELECT sp.tag
							FROM SupercellPlayers sp
							WHERE sp.userId = ?1 AND sp.type = t.game
							ORDER BY sp.active DESC
							LIMIT 1
						) AS tag
						FROM Tournaments t
						WHERE
							t.id = ?2
							AND (t.registrationMode & ?3) != 0
							AND t.registrationStart < unixepoch('now')
							AND t.registrationEnd > unixepoch('now')
					`,
				)
					.bind(token.i, matchResult[1], RegistrationMode.Dashboard)
					.first<
						Pick<Database.Tournament, "name" | "flags" | "team"> &
							Pick<Database.SupercellPlayer, "tag">
					>();

				if (!tournament)
					return new Response(null, {
						status: 303,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							location: `/tournaments?error=closed&error_description=${encodeURIComponent("Le iscrizioni per questo torneo non sono più disponibili")}`,
						},
					});
				if (tournament.team > 1)
					return new Response(null, {
						status: 303,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							location: `/tournaments?error=team&error_description=${encodeURIComponent("Per iscriversi a questo torneo è necessario un team")}`,
						},
					});
				if (!tournament.tag && tournament.flags & TournamentFlags.TagRequired)
					return new Response(null, {
						status: 303,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							location: `/tournaments?error=tag&error_description=${encodeURIComponent("Per iscriversi a questo torneo è necessario avere un tag salvato")}`,
						},
					});
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
					).bind(matchResult[1], token.i, tournament.tag),
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
					).bind(matchResult[1]),
				]);
				const data = result?.results[0];
				if (!data)
					return new Response(null, {
						status: 303,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							location: `/tournaments?error=tData&error_description=${encodeURIComponent("Non è stato possibile completare l'iscrizione! Riprova o contatta un moderatore")}`,
						},
					});
				await Promise.all([
					rest.put(
						Routes.guildMemberRole(
							env.MAIN_GUILD,
							token.i,
							data.registrationRole!,
						),
						{ reason: `Iscrizione al torneo ${tournament.name}` },
					),
					rest.patch(
						Routes.channelMessage(
							data.registrationChannel!,
							data.registrationMessage!,
						),
						{
							body: await createRegistrationMessage(
								Number(matchResult[1]),
								data.registrationTemplateLink!,
								data.participantCount,
								tournament.name,
								data.minPlayers,
							),
						},
					),
				]);
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
						location: `${url.pathname}?error=${encodeURIComponent((err as Error).name)}`,
					},
				});
			}
		}
		if (
			(matchResult = url.pathname.match(
				/^\/tournaments\/([^/]+)\/unregister\/?$/,
			))
		) {
			if (request.method !== "POST") return create405("POST");
			const { setCookie, token } = await createSetCookie(request);
			if (!token)
				return new Response(null, {
					status: 303,
					headers: {
						location: `/auth/discord/login?to=${encodeURIComponent(request.headers.get("Referer") ?? "/tournaments")}`,
						"set-cookie": setCookie,
					},
				});
			try {
				const tournament = await env.DB.prepare(
					`
						SELECT t.registrationRole, t.name, t.registrationChannel, t.registrationMessage, t.minPlayers, t.registrationTemplateLink, p.userId IS NOT NULL AS participationExists,
							(
								SELECT COUNT(*)
								FROM Participants
								WHERE tournamentId = t.id
							) AS participantCount
						FROM Tournaments t
						LEFT JOIN Participants p
							ON p.tournamentId = t.id AND p.userId = ?1
						WHERE
							t.id = ?2
							AND (t.registrationMode & ?3) != 0
							AND t.registrationStart < unixepoch('now')
							AND t.registrationEnd > unixepoch('now')
					`,
				)
					.bind(token.i, matchResult[1], RegistrationMode.Dashboard)
					.first<
						Pick<
							Database.Tournament,
							| "registrationRole"
							| "name"
							| "registrationChannel"
							| "registrationMessage"
							| "minPlayers"
							| "registrationTemplateLink"
						> & { participantCount: number; participationExists: boolean }
					>();

				if (!tournament)
					return new Response(null, {
						status: 303,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							location: `/tournaments?error=closed&error_description=${encodeURIComponent("Le iscrizioni per questo torneo non sono più disponibili")}`,
						},
					});
				if (!tournament.participationExists)
					return new Response(null, {
						status: 303,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							location: `/tournaments?error=notRegistered&error_description=${encodeURIComponent("Non risulti iscritto a questo torneo!")}`,
						},
					});
				await Promise.all([
					rest.delete(
						Routes.guildMemberRole(
							env.MAIN_GUILD,
							token.i,
							tournament.registrationRole!,
						),
						{ reason: `Rimozione iscrizione al torneo ${tournament.name}` },
					),
					rest.patch(
						Routes.channelMessage(
							tournament.registrationChannel!,
							tournament.registrationMessage!,
						),
						{
							body: await createRegistrationMessage(
								Number(matchResult[1]),
								tournament.registrationTemplateLink!,
								tournament.participantCount - 1,
								tournament.name,
								tournament.minPlayers,
							),
						},
					),
					env.DB.prepare(
						`
							DELETE FROM Participants
							WHERE tournamentId = ?1 AND userId = ?2
						`,
					)
						.bind(matchResult[1], token.i)
						.run(),
				]);
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
						location: `${url.pathname}?error=${encodeURIComponent((err as Error).name)}`,
					},
				});
			}
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
				() =>
					new URLSearchParams(
						textDecoder.decode(
							Uint8Array.fromBase64(state!, { alphabet: "base64url" }),
						),
					),
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
