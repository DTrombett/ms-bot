import cssMap from "build:css";
import jsMap from "build:js";
import { env, waitUntil } from "cloudflare:workers";
import { RouteBases, Routes, type APIUser } from "discord-api-types/v10";
import { renderToReadableStream } from "react-dom/server";
import Index from "./app/index.page";
import Tournaments from "./app/tournaments.page";
import Tournament from "./app/tournaments/[id].page";
import Brackets from "./app/tournaments/[id]/brackets.page";
import EditTournament from "./app/tournaments/[id]/edit.page";
import NewTournament from "./app/tournaments/new.page";
import { Brawl } from "./commands/brawl";
import * as commands from "./commands/index";
import { CommandHandler } from "./util/CommandHandler";
import {
	DBMatchStatus,
	DiscordIdRegex,
	RegistrationMode,
	SupercellPlayerType,
} from "./util/Constants";
import { createSolidPng } from "./util/createSolidPng";
import { parseForm, ParseType } from "./util/forms";
import { rest, textDecoder, textEncoder } from "./util/globals";
import { isMobile } from "./util/isMobile";
import normalizeError from "./util/normalizeError";
import { pick, toSearchParams } from "./util/objects";
import { queueHandlers } from "./util/queueHandlers";
import type { RGB } from "./util/resolveColor";
import { create403, create405, JsonStreamResponse } from "./util/responses";
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
import { parseTournamentData } from "./util/tournaments/parseTournamentData";
import { runPatchRequest } from "./util/tournaments/patchMatch";
import { register } from "./util/tournaments/register";
import { unregister } from "./util/tournaments/unregister";
import { UserError } from "./util/UserError";

const handler = new CommandHandler(Object.values(commands));
const authRedirectPath = "/auth/discord/callback";

const server: ExportedHandler<Env, QueueMessage> = {
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
						...((
							request.headers
								.get("Cookie")
								?.includes("__Secure-authjs.session-token")
						) ?
							{ "clear-site-data": '"cookies", "storage"' }
						:	null),
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
							guildId,
							bracketsTime,
							categoryId,
							channelName,
							channelsTime,
							endedCategoryId,
							endedChannelName,
							matchMessageLink,
							minPlayers,
							maxPlayers,
							registrationChannel,
							registrationChannelName,
							registrationEnd,
							registrationTemplateLink,
							registrationRole,
							registrationStart,
							roundType,
							workflowId
						)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					)
						.bind(
							tournament.name,
							tournament.flags,
							tournament.game,
							tournament.logChannel,
							tournament.registrationMode,
							tournament.rounds,
							tournament.team,
							tournament.guildId,
							tournament.bracketsTime,
							tournament.categoryId,
							tournament.channelName,
							tournament.channelsTime,
							tournament.endedCategoryId,
							tournament.endedChannelName,
							tournament.matchMessageLink,
							tournament.minPlayers,
							tournament.maxPlayers,
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
												SELECT TRUE FROM SupercellPlayers sp
												WHERE sp.userId = ?1 AND active = TRUE
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
			if (!(await isAdmin(token)))
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
		if ((matchResult = url.pathname.match(/^\/tournaments\/([^/]+)\/?$/))) {
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405();
			const { setCookie, token } = await createSetCookie(request, ["guilds"]);

			if (!token)
				return new Response(null, {
					status: 303,
					headers: {
						location: `/auth/discord/login?to=${encodeURIComponent(url.pathname)}&scope=guilds`,
						"set-cookie": setCookie,
					},
				});
			const [
				{
					results: [tournament],
				},
				{ results: participants },
			] = (await env.DB.batch([
				env.DB.prepare(`SELECT * FROM Tournaments WHERE id = ?`).bind(
					Number(matchResult[1]),
				),
				env.DB.prepare(
					`
						SELECT userId, tag, name
						FROM Participants WHERE tournamentId = ?
					`,
				).bind(Number(matchResult[1])),
			])) as [
				D1Result<Database.Tournament>,
				D1Result<Pick<Database.Participant, "tag" | "userId" | "name">>,
			];
			if (!tournament)
				return new Response(null, {
					status: 303,
					headers: { location: "/tournaments", "set-cookie": setCookie },
				});
			return new Response(
				request.method === "GET" ?
					await renderToReadableStream(
						<Tournament
							styles={cssMap["/tournaments/[id]"]}
							url={url}
							mobile={isMobile(request.headers)}
							tournament={tournament}
							participants={participants}
							admin={await isAdmin(token)}
						/>,
						{ bootstrapModules: jsMap["/tournaments/[id]"] },
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
				/^\/tournaments\/([^/]+)\/brackets\/?$/,
			))
		) {
			// TODO: After improving the build system add cache here in order to speed up brackets
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405();
			const [
				{ setCookie, token },
				[
					{
						results: [tournament],
					},
					{ results: matches },
					{ results: participants },
				],
			] = await Promise.all([
				createSetCookie(request),
				env.DB.batch([
					env.DB.prepare(`SELECT name, id FROM Tournaments WHERE id = ?`).bind(
						Number(matchResult[1]),
					),
					env.DB.prepare(
						`
							SELECT channelId, id, result1,
								result2, status, user1, user2
							FROM Matches WHERE tournamentId = ?
						`,
					).bind(Number(matchResult[1])),
					env.DB.prepare(
						`
							SELECT userId, tag, name
							FROM Participants WHERE tournamentId = ?
						`,
					).bind(Number(matchResult[1])),
				]) as Promise<
					[
						D1Result<Pick<Database.Tournament, "name" | "id">>,
						D1Result<
							Pick<
								Database.Match,
								| "channelId"
								| "id"
								| "result1"
								| "result2"
								| "status"
								| "user1"
								| "user2"
							>
						>,
						D1Result<Pick<Database.Participant, "tag" | "userId" | "name">>,
					]
				>,
			]);

			if (!tournament)
				return new Response(null, {
					status: 303,
					headers: { location: "/tournaments", "set-cookie": setCookie },
				});
			return new Response(
				request.method === "GET" ?
					await renderToReadableStream(
						<Brackets
							styles={cssMap["/tournaments/[id]/brackets"]}
							url={url}
							mobile={isMobile(request.headers)}
							tournament={tournament}
							matches={matches}
							participants={participants}
							embed={request.headers.get("sec-fetch-dest") === "iframe"}
							admin={await isAdmin(token)}
						/>,
						{ bootstrapModules: jsMap["/tournaments/[id]/brackets"] },
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
								guildId = ?,
								bracketsTime = ?,
								categoryId = ?,
								channelName = ?,
								channelsTime = ?,
								endedCategoryId = ?,
								endedChannelName = ?,
								matchMessageLink = ?,
								minPlayers = ?,
								maxPlayers = ?,
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
							tournament.guildId,
							tournament.bracketsTime,
							tournament.categoryId,
							tournament.channelName,
							tournament.channelsTime,
							tournament.endedCategoryId,
							tournament.endedChannelName,
							tournament.matchMessageLink,
							tournament.minPlayers,
							tournament.maxPlayers,
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
			if (!(await isAdmin(token)))
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
				await register(Number(matchResult[1]), {
					userId: token.i,
					mode: RegistrationMode.Dashboard,
				});
				return new Response(null, {
					status: 303,
					headers: {
						"accept-ch": "Sec-CH-UA-Mobile",
						location: "/tournaments",
						"set-cookie": setCookie,
					},
				});
			} catch (err) {
				const error = err instanceof UserError ? err : normalizeError(err);

				return new Response(null, {
					status: 303,
					headers: {
						"accept-ch": "Sec-CH-UA-Mobile",
						"set-cookie": setCookie,
						location: `/tournaments?${toSearchParams({
							error: error.name,
							error_description:
								error instanceof UserError ? error.message : null,
						})}`,
					},
				});
			}
		}
		// TODO: Remove /unregister in favor of DELETE
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
				await unregister(Number(matchResult[1]), {
					userId: token.i,
					mode: RegistrationMode.Dashboard,
				});
				return new Response(null, {
					status: 303,
					headers: {
						"accept-ch": "Sec-CH-UA-Mobile",
						"set-cookie": setCookie,
						location: "/tournaments",
					},
				});
			} catch (err) {
				const error = err instanceof UserError ? err : normalizeError(err);

				return new Response(null, {
					status: 303,
					headers: {
						"accept-ch": "Sec-CH-UA-Mobile",
						"set-cookie": setCookie,
						location: `/tournaments?${toSearchParams({
							error: error.name,
							error_description:
								error instanceof UserError ? error.message : null,
						})}`,
					},
				});
			}
		}
		if (
			(matchResult = url.pathname.match(
				/^\/tournaments\/([^/]+)\/participants\/?$/,
			))
		) {
			if (request.method !== "POST") return create405("POST");
			let body: Promise<FormData | null> | FormData | null = request
				.formData()
				.catch(() => null);
			const { setCookie, token } = await createSetCookie(request);

			if (!token)
				return Response.json(
					{ message: "Effettua nuovamente il login" },
					{
						status: 401,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"set-cookie": setCookie,
						},
					},
				);
			if (!(await isAdmin(token)))
				return Response.json(
					{ message: "Questa azione è riservata agli amministratori" },
					{
						status: 403,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"set-cookie": setCookie,
						},
					},
				);
			body = await body;
			if (!body)
				return Response.json(
					{ message: "Dati non validi" },
					{
						status: 400,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"set-cookie": setCookie,
						},
					},
				);
			const data = parseForm(body, {
				userId: ParseType.Text,
				tag: ParseType.Text,
			});
			if (!data.userId)
				return Response.json(
					{ message: "L'ID utente è obbligatorio" },
					{
						status: 400,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"set-cookie": setCookie,
						},
					},
				);
			try {
				return Response.json(
					pick<
						Awaited<ReturnType<typeof register>>,
						keyof Database.Participant
					>(
						await register(Number(matchResult[1]), {
							userId: data.userId,
							admin: `${token.d ?? token.u} (<@${token.i}>)`,
							tag: data.tag ?? undefined,
						}),
						"name",
						"tag",
						"tournamentId",
						"userId",
					),
					{
						status: 200,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"set-cookie": setCookie,
						},
					},
				);
			} catch (err) {
				if (err instanceof UserError)
					return Response.json(
						{ message: err.message },
						{
							status: 400,
							headers: {
								"accept-ch": "Sec-CH-UA-Mobile",
								"set-cookie": setCookie,
							},
						},
					);
				console.error(err);
				return new Response(null, {
					status: 500,
					headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
				});
			}
		}
		if (
			(matchResult = url.pathname.match(
				/^\/tournaments\/([^/]+)\/participants\/deleteBatch\/?$/,
			))
		) {
			if (request.method !== "POST") return create405("POST");
			let body: Promise<string[] | null> | string[] | null = request
				.json<string[] | null>()
				.catch(() => null);
			const { setCookie, token } = await createSetCookie(request);

			if (!token)
				return Response.json(
					{ message: "Effettua nuovamente il login" },
					{
						status: 401,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"set-cookie": setCookie,
						},
					},
				);
			if (!(await isAdmin(token)))
				return Response.json(
					{
						message: "Solo gli amministratori possono effettuare questa azione",
					},
					{
						status: 403,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"set-cookie": setCookie,
						},
					},
				);
			body = await body;
			if (!Array.isArray(body) || !body.every((i) => DiscordIdRegex.test(i)))
				return Response.json(
					{ message: "Dati non validi" },
					{
						status: 400,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"set-cookie": setCookie,
						},
					},
				);
			if (body.length > 16)
				return Response.json(
					{ message: "Non puoi eliminare più di 16 iscrizioni alla volta" },
					{
						status: 400,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"set-cookie": setCookie,
						},
					},
				);
			try {
				await unregister(Number(matchResult[1]), {
					admin: `${token.d ?? token.u} (<@${token.i}>)`,
					userIds: body,
				});
				return new Response(null, {
					status: 204,
					headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
				});
			} catch (err) {
				if (err instanceof UserError)
					return Response.json(
						{ message: err.message },
						{
							status: 400,
							headers: {
								"accept-ch": "Sec-CH-UA-Mobile",
								"set-cookie": setCookie,
							},
						},
					);
				console.error(err);
				return new Response(null, {
					status: 500,
					headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
				});
			}
		}
		if (
			(matchResult = url.pathname.match(
				/^\/tournaments\/([^/]+)\/participants\/([^/]+)\/?$/,
			))
		) {
			if (request.method !== "DELETE") return create405("DELETE");
			const { setCookie, token } = await createSetCookie(request);

			if (!token)
				return Response.json(
					{ message: "Effettua nuovamente il login" },
					{
						status: 401,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"set-cookie": setCookie,
						},
					},
				);
			const admin = await isAdmin(token);
			if (token.i !== matchResult[2] && !admin)
				return Response.json(
					{
						message: "Solo gli amministratori possono effettuare questa azione",
					},
					{
						status: 403,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"set-cookie": setCookie,
						},
					},
				);
			try {
				await unregister(Number(matchResult[1]), {
					admin: admin ? `${token.d ?? token.u} (<@${token.i}>)` : false,
					userId: matchResult[2]!,
					mode: RegistrationMode.Dashboard,
				});
				return new Response(null, {
					status: 204,
					headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
				});
			} catch (err) {
				if (err instanceof UserError)
					return Response.json(
						{ message: err.message },
						{
							status: 400,
							headers: {
								"accept-ch": "Sec-CH-UA-Mobile",
								"set-cookie": setCookie,
							},
						},
					);
				console.error(err);
				return new Response(null, {
					status: 500,
					headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
				});
			}
		}
		if (
			(matchResult = url.pathname.match(
				/^\/tournaments\/([^/]+)\/matches\/([^/]+)\/abandoned\/?$/,
			))
		) {
			if (request.method !== "DELETE" && request.method !== "POST")
				return create405("POST, DELETE");
			const userId = url.searchParams.get("user");

			return runPatchRequest(
				request,
				Number(matchResult[1]),
				Number(matchResult[2]),
				env.DB.prepare(
					`
						UPDATE Matches
						SET ${
							request.method === "POST" ?
								userId ?
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
								:	`
							result1 = NULL,
							result2 = NULL,
							status = ?4`
							: userId ?
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
						WHERE tournamentId = ?1 AND id = ?2 ${userId ? "AND (?3 = user1 OR ?3 = user2)" : ""}
						RETURNING *
					`,
				).bind(
					Number(matchResult[1]),
					Number(matchResult[2]),
					userId,
					request.method === "POST" ?
						DBMatchStatus.Abandoned
					:	DBMatchStatus.Playing,
				),
			);
		}
		if (
			(matchResult = url.pathname.match(
				/^\/tournaments\/([^/]+)\/matches\/([^/]+)\/?$/,
			))
		) {
			if (request.method !== "PATCH") return create405("PATCH");
			const result1 = url.searchParams.get("result1"),
				result2 = url.searchParams.get("result2"),
				status = url.searchParams.get("status");

			return runPatchRequest(
				request,
				Number(matchResult[1]),
				Number(matchResult[2]),
				env.DB.prepare(
					`
						UPDATE Matches
						SET result1 = COALESCE(?3, result1),
							result2 = COALESCE(?4, result2),
							status  = COALESCE(?5, status)
						WHERE tournamentId = ?1 AND id = ?2
						RETURNING *
					`,
				).bind(
					Number(matchResult[1]),
					Number(matchResult[2]),
					result1 ? +result1 : null,
					result2 ? +result2 : null,
					status ? +status : null,
				),
			);
		}
		if (
			(matchResult = url.pathname.match(
				/^\/tournaments\/([^/]+)\/matchData\/?$/,
			))
		) {
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405();
			try {
				const users = url.searchParams.getAll("user"),
					id = Number(url.searchParams.get("id"));
				const tournamentId = Number(matchResult[1]);
				if (Number.isNaN(tournamentId))
					return JsonStreamResponse.error({
						error: "Torneo non trovato",
						status: 404,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"cache-control": "public",
						},
					});
				if (Number.isNaN(id))
					return JsonStreamResponse.error({
						error: "ID scontro non valido",
						status: 404,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"cache-control": "public",
						},
					});
				const statements: D1PreparedStatement[] = [
					env.DB.prepare(
						`SELECT game, guildId FROM Tournaments WHERE id = ?`,
					).bind(tournamentId),
					env.DB.prepare(
						`SELECT * FROM Matches WHERE tournamentId = ?1 AND id = ?2`,
					).bind(tournamentId, id),
				];

				if (users.length)
					statements.push(
						env.DB.prepare(
							`
									SELECT tag, userId, name FROM Participants
									WHERE tournamentId = ? AND userId IN (${new Array(users.length)
										.fill("?")
										.join(",")})
								`,
						).bind(tournamentId, ...users),
					);
				const [
					{
						results: [tournament],
					},
					{
						results: [match],
					},
					{ results: participants } = { results: [] },
				] = (await env.DB.batch(statements)) as [
					D1Result<Pick<Database.Tournament, "game" | "guildId">>,
					D1Result<Database.Match>,
					(
						| D1Result<Pick<Database.Participant, "tag" | "userId" | "name">>
						| undefined
					),
				];
				if (!tournament)
					return JsonStreamResponse.error({
						error: "Torneo non trovato",
						status: 404,
						headers: {
							"accept-ch": "Sec-CH-UA-Mobile",
							"cache-control": "public",
						},
					});
				const res = new JsonStreamResponse({
					headers: { "accept-ch": "Sec-CH-UA-Mobile" },
				}).sendAll(
					{ event: "match", data: match },
					...participants.map((data) => ({ event: "participant", data })),
				);
				for (const participant of participants) {
					res.send(
						"member",
						rest.get(
							Routes.guildMember(tournament.guildId, participant.userId),
						),
					);
					if (participant.tag)
						res.send(
							"player",
							(tournament.game === SupercellPlayerType.BrawlStars ?
								commands.Brawl
							:	commands.Clash
							).getPlayer(participant.tag),
						);
				}
				return res.end();
			} catch (err) {
				console.error(err);
				return new Response(null, {
					status: 500,
					headers: { "accept-ch": "Sec-CH-UA-Mobile" },
				});
			}
		}
		if (url.pathname === "/auth/discord/login") {
			if (request.method !== "GET" && request.method !== "HEAD")
				return create405();
			let r = url.searchParams.get("to") ?? request.headers.get("Referer");
			const scopes = new Set(url.searchParams.get("scope")?.split(" "));
			if (r && URL.canParse(r)) r = new URL(r).pathname;
			scopes.add("identify");
			try {
				const token = await parseToken(
					request.headers.get("cookie")?.match(/(?:^|;\s*)token=([^;]*)/)?.[1],
					scopes,
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
							scope: Array.from(scopes).join(" "),
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
			await Promise.allSettled([env.PREDICTIONS_REMINDERS.create()]);
		else if (cron === "0 */1 * * *") {
			const { results } = await env.DB.prepare(
				`SELECT * FROM SupercellPlayers WHERE notifications > 0`,
			).run<Database.SupercellPlayer>();
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
	queue: async (batch) => {
		await Promise.all(
			batch.messages.map(async (m) => {
				try {
					await queueHandlers[m.body.t](m as never, batch);
					m.ack();
				} catch (err) {
					m.retry();
					console.error(err);
				}
			}),
		);
	},
};

export { Channels } from "./Channels";
export { DeleteChannels } from "./DeleteChannels";
export { Notifications } from "./Notifications";
export { PredictionsReminders } from "./PredictionsReminders";
export { Reminder } from "./Reminder";
export { Shorten } from "./Shorten";
export { Tournament } from "./Tournament";

export default server;
