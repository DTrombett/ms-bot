import pages from "build:routes";
import { env } from "cloudflare:workers";
import { createPage } from "./util/createPage";
import { findRoute } from "./util/findRoute";
import { queueHandlers } from "./util/queueHandlers";

// const handler = new CommandHandler(Object.values(commands));
// const authRedirectPath = "/auth/discord/callback";

const server: ExportedHandler<Env, QueueMessage> = {
	fetch: async (request) => {
		const response: ResponseInit & { headers: Headers } = {
			headers: new Headers({ "accept-ch": "Sec-CH-UA-Mobile" }),
		};
		const url = new URL(request.url);
		let router = findRoute(url);

		if (!router) {
			response.status = 404;
			router = { route: pages["404"].index, params: [] };
		}
		return createPage(router, request, response, url);
		// if (
		// 	(matchResult = url.pathname.match(
		// 		/^\/tournaments\/([^/]+)\/participants\/deleteBatch\/?$/,
		// 	))
		// ) {
		// 	if (request.method !== "POST") return create405("POST");
		// 	let body: Promise<string[] | null> | string[] | null = request
		// 		.json<string[] | null>()
		// 		.catch(() => null);
		// 	const { setCookie, token } = await createSetCookie(request);

		// 	if (!token)
		// 		return Response.json(
		// 			{ message: "Effettua nuovamente il login" },
		// 			{
		// 				status: 401,
		// 				headers: {
		// 					"accept-ch": "Sec-CH-UA-Mobile",
		// 					"set-cookie": setCookie,
		// 				},
		// 			},
		// 		);
		// 	if (!(await isAdmin(token)))
		// 		return Response.json(
		// 			{
		// 				message: "Solo gli amministratori possono effettuare questa azione",
		// 			},
		// 			{
		// 				status: 403,
		// 				headers: {
		// 					"accept-ch": "Sec-CH-UA-Mobile",
		// 					"set-cookie": setCookie,
		// 				},
		// 			},
		// 		);
		// 	body = await body;
		// 	if (!Array.isArray(body) || !body.every((i) => DiscordIdRegex.test(i)))
		// 		return Response.json(
		// 			{ message: "Dati non validi" },
		// 			{
		// 				status: 400,
		// 				headers: {
		// 					"accept-ch": "Sec-CH-UA-Mobile",
		// 					"set-cookie": setCookie,
		// 				},
		// 			},
		// 		);
		// 	if (body.length > 16)
		// 		return Response.json(
		// 			{ message: "Non puoi eliminare più di 16 iscrizioni alla volta" },
		// 			{
		// 				status: 400,
		// 				headers: {
		// 					"accept-ch": "Sec-CH-UA-Mobile",
		// 					"set-cookie": setCookie,
		// 				},
		// 			},
		// 		);
		// 	try {
		// 		await unregister(Number(matchResult[1]), {
		// 			admin: `${token.d ?? token.u} (<@${token.i}>)`,
		// 			userIds: body,
		// 		});
		// 		return new Response(null, {
		// 			status: 204,
		// 			headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
		// 		});
		// 	} catch (err) {
		// 		if (err instanceof UserError)
		// 			return Response.json(
		// 				{ message: err.message },
		// 				{
		// 					status: 400,
		// 					headers: {
		// 						"accept-ch": "Sec-CH-UA-Mobile",
		// 						"set-cookie": setCookie,
		// 					},
		// 				},
		// 			);
		// 		console.error(err);
		// 		return new Response(null, {
		// 			status: 500,
		// 			headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
		// 		});
		// 	}
		// }
		// if (
		// 	(matchResult = url.pathname.match(
		// 		/^\/tournaments\/([^/]+)\/participants\/([^/]+)\/?$/,
		// 	))
		// ) {
		// 	if (request.method !== "DELETE") return create405("DELETE");
		// 	const { setCookie, token } = await createSetCookie(request);

		// 	if (!token)
		// 		return Response.json(
		// 			{ message: "Effettua nuovamente il login" },
		// 			{
		// 				status: 401,
		// 				headers: {
		// 					"accept-ch": "Sec-CH-UA-Mobile",
		// 					"set-cookie": setCookie,
		// 				},
		// 			},
		// 		);
		// 	const admin = await isAdmin(token);
		// 	if (token.i !== matchResult[2] && !admin)
		// 		return Response.json(
		// 			{
		// 				message: "Solo gli amministratori possono effettuare questa azione",
		// 			},
		// 			{
		// 				status: 403,
		// 				headers: {
		// 					"accept-ch": "Sec-CH-UA-Mobile",
		// 					"set-cookie": setCookie,
		// 				},
		// 			},
		// 		);
		// 	try {
		// 		await unregister(Number(matchResult[1]), {
		// 			admin: admin ? `${token.d ?? token.u} (<@${token.i}>)` : false,
		// 			userId: matchResult[2]!,
		// 			mode: RegistrationMode.Dashboard,
		// 		});
		// 		return new Response(null, {
		// 			status: 204,
		// 			headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
		// 		});
		// 	} catch (err) {
		// 		if (err instanceof UserError)
		// 			return Response.json(
		// 				{ message: err.message },
		// 				{
		// 					status: 400,
		// 					headers: {
		// 						"accept-ch": "Sec-CH-UA-Mobile",
		// 						"set-cookie": setCookie,
		// 					},
		// 				},
		// 			);
		// 		console.error(err);
		// 		return new Response(null, {
		// 			status: 500,
		// 			headers: { "accept-ch": "Sec-CH-UA-Mobile", "set-cookie": setCookie },
		// 		});
		// 	}
		// }
		// if (
		// 	(matchResult = url.pathname.match(
		// 		/^\/tournaments\/([^/]+)\/matches\/([^/]+)\/abandoned\/?$/,
		// 	))
		// ) {
		// 	if (request.method !== "DELETE" && request.method !== "POST")
		// 		return create405("POST, DELETE");
		// 	const userId = url.searchParams.get("user");

		// 	return runPatchRequest(
		// 		request,
		// 		Number(matchResult[1]),
		// 		Number(matchResult[2]),
		// 		env.DB.prepare(
		// 			`
		// 				UPDATE Matches
		// 				SET ${
		// 					request.method === "POST" ?
		// 						userId ?
		// 							`
		// 					result1 = CASE
		// 						WHEN user1 = ?3 THEN NULL
		// 						WHEN user2 = ?3 AND status != ?4 THEN COALESCE(result1, 0)
		// 						ELSE result1
		// 					END,
		// 					result2 = CASE
		// 						WHEN user2 = ?3 THEN NULL
		// 						WHEN user1 = ?3 AND status != ?4 THEN COALESCE(result2, 0)
		// 						ELSE result2
		// 					END,
		// 					status = ?4`
		// 						:	`
		// 					result1 = NULL,
		// 					result2 = NULL,
		// 					status = ?4`
		// 					: userId ?
		// 						`
		// 					status = CASE
		// 						WHEN (user1 = ?3 AND result2 IS NOT NULL) OR (user2 = ?3 AND result1 IS NOT NULL) THEN ?4
		// 						ELSE status
		// 					END,
		// 					result1 = CASE
		// 						WHEN user1 = ?3 THEN COALESCE(result1, 0)
		// 						ELSE result1
		// 					END,
		// 					result2 = CASE
		// 						WHEN user2 = ?3 THEN COALESCE(result2, 0)
		// 						ELSE result2
		// 					END`
		// 					:	`
		// 					status = ?4,
		// 					result1 = COALESCE(result1, 0),
		// 					result2 = COALESCE(result2, 0)`
		// 				}
		// 				WHERE tournamentId = ?1 AND id = ?2 ${userId ? "AND (?3 = user1 OR ?3 = user2)" : ""}
		// 				RETURNING *
		// 			`,
		// 		).bind(
		// 			Number(matchResult[1]),
		// 			Number(matchResult[2]),
		// 			userId,
		// 			request.method === "POST" ?
		// 				DBMatchStatus.Abandoned
		// 			:	DBMatchStatus.Playing,
		// 		),
		// 	);
		// }
		// if (
		// 	(matchResult = url.pathname.match(
		// 		/^\/tournaments\/([^/]+)\/matches\/([^/]+)\/?$/,
		// 	))
		// ) {
		// 	if (request.method !== "PATCH") return create405("PATCH");
		// 	const result1 = url.searchParams.get("result1"),
		// 		result2 = url.searchParams.get("result2"),
		// 		status = url.searchParams.get("status");

		// 	return runPatchRequest(
		// 		request,
		// 		Number(matchResult[1]),
		// 		Number(matchResult[2]),
		// 		env.DB.prepare(
		// 			`
		// 				UPDATE Matches
		// 				SET result1 = COALESCE(?3, result1),
		// 					result2 = COALESCE(?4, result2),
		// 					status  = COALESCE(?5, status)
		// 				WHERE tournamentId = ?1 AND id = ?2
		// 				RETURNING *
		// 			`,
		// 		).bind(
		// 			Number(matchResult[1]),
		// 			Number(matchResult[2]),
		// 			result1 ? +result1 : null,
		// 			result2 ? +result2 : null,
		// 			status ? +status : null,
		// 		),
		// 	);
		// }
		// if (
		// 	(matchResult = url.pathname.match(
		// 		/^\/tournaments\/([^/]+)\/matchData\/?$/,
		// 	))
		// ) {
		// 	if (request.method !== "GET" && request.method !== "HEAD")
		// 		return create405();
		// 	try {
		// 		const users = url.searchParams.getAll("user"),
		// 			id = Number(url.searchParams.get("id"));
		// 		const tournamentId = Number(matchResult[1]);
		// 		if (Number.isNaN(tournamentId))
		// 			return JsonStreamResponse.error({
		// 				error: "Torneo non trovato",
		// 				status: 404,
		// 				headers: {
		// 					"accept-ch": "Sec-CH-UA-Mobile",
		// 					"cache-control": "public",
		// 				},
		// 			});
		// 		if (Number.isNaN(id))
		// 			return JsonStreamResponse.error({
		// 				error: "ID scontro non valido",
		// 				status: 404,
		// 				headers: {
		// 					"accept-ch": "Sec-CH-UA-Mobile",
		// 					"cache-control": "public",
		// 				},
		// 			});
		// 		const statements: D1PreparedStatement[] = [
		// 			env.DB.prepare(
		// 				`SELECT game, guildId FROM Tournaments WHERE id = ?`,
		// 			).bind(tournamentId),
		// 			env.DB.prepare(
		// 				`SELECT * FROM Matches WHERE tournamentId = ?1 AND id = ?2`,
		// 			).bind(tournamentId, id),
		// 		];

		// 		if (users.length)
		// 			statements.push(
		// 				env.DB.prepare(
		// 					`
		// 							SELECT tag, userId, name FROM Participants
		// 							WHERE tournamentId = ? AND userId IN (${new Array(users.length)
		// 								.fill("?")
		// 								.join(",")})
		// 						`,
		// 				).bind(tournamentId, ...users),
		// 			);
		// 		const [
		// 			{
		// 				results: [tournament],
		// 			},
		// 			{
		// 				results: [match],
		// 			},
		// 			{ results: participants } = { results: [] },
		// 		] = (await env.DB.batch(statements)) as [
		// 			D1Result<Pick<Database.Tournament, "game" | "guildId">>,
		// 			D1Result<Database.Match>,
		// 			(
		// 				| D1Result<Pick<Database.Participant, "tag" | "userId" | "name">>
		// 				| undefined
		// 			),
		// 		];
		// 		if (!tournament)
		// 			return JsonStreamResponse.error({
		// 				error: "Torneo non trovato",
		// 				status: 404,
		// 				headers: {
		// 					"accept-ch": "Sec-CH-UA-Mobile",
		// 					"cache-control": "public",
		// 				},
		// 			});
		// 		const res = new JsonStreamResponse({
		// 			headers: {
		// 				"accept-ch": "Sec-CH-UA-Mobile",
		// 				"cache-control": "public",
		// 			},
		// 		}).sendAll(
		// 			{ event: "match", data: match },
		// 			...participants.map((data) => ({ event: "participant", data })),
		// 		);
		// 		for (const participant of participants) {
		// 			res.send(
		// 				"member",
		// 				rest.get(
		// 					Routes.guildMember(tournament.guildId, participant.userId),
		// 				),
		// 			);
		// 			if (participant.tag)
		// 				res.send(
		// 					"player",
		// 					(tournament.game === SupercellPlayerType.BrawlStars ?
		// 						commands.Brawl
		// 					:	commands.Clash
		// 					).getPlayer(participant.tag),
		// 				);
		// 		}
		// 		return res.end();
		// 	} catch (err) {
		// 		console.error(err);
		// 		return new Response(null, {
		// 			status: 500,
		// 			headers: { "accept-ch": "Sec-CH-UA-Mobile" },
		// 		});
		// 	}
		// }
		// if (url.pathname === "/auth/discord/login") {
		// 	if (request.method !== "GET" && request.method !== "HEAD")
		// 		return create405();
		// 	let r = url.searchParams.get("to") ?? request.headers.get("Referer");
		// 	const scopes = new Set(url.searchParams.get("scope")?.split(" "));
		// 	if (r && URL.canParse(r)) r = new URL(r).pathname;
		// 	scopes.add("identify");
		// 	try {
		// 		const token = await parseToken(
		// 			request.headers.get("cookie")?.match(/(?:^|;\s*)token=([^;]*)/)?.[1],
		// 			scopes,
		// 		);

		// 		if (token && +token.e * 1000 - 5 * TimeUnit.Minute > Date.now())
		// 			return new Response(null, {
		// 				status: 303,
		// 				headers: {
		// 					location: `${r ?? "/"}?login_success`,
		// 					"set-cookie": `token=${await createToken(await updateToken(token))}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
		// 				},
		// 			});
		// 		else if (token?.r)
		// 			return new Response(null, {
		// 				status: 303,
		// 				headers: {
		// 					location: `${r ?? "/"}?login_success`,
		// 					"set-cookie": `token=${await createToken(await refreshToken(token.r, true))}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
		// 				},
		// 			});
		// 	} catch (err) {
		// 		// If no token is present or it's invalid, re-request authorization
		// 	}
		// 	const state = textEncoder
		// 		.encode(toSearchParams({ s: crypto.randomUUID(), r }).toString())
		// 		.toBase64({ alphabet: "base64url", omitPadding: true });

		// 	return new Response(null, {
		// 		headers: {
		// 			location: `https://discord.com/oauth2/authorize?${new URLSearchParams(
		// 				{
		// 					redirect_uri: new URL(authRedirectPath, url).href,
		// 					client_id: env.DISCORD_APPLICATION_ID,
		// 					response_type: "code",
		// 					scope: Array.from(scopes).join(" "),
		// 					prompt: "none",
		// 					state,
		// 				},
		// 			).toString()}`,
		// 			"set-cookie": `loginState=${state}; Path=/auth/discord/; HttpOnly; Secure; SameSite=Lax`,
		// 		},
		// 		status: 302,
		// 	});
		// }
		// if (url.pathname === "/auth/discord/logout") {
		// 	if (request.method !== "GET" && request.method !== "HEAD")
		// 		return create405();
		// 	let r = url.searchParams.get("to") ?? request.headers.get("Referer");

		// 	if (r && URL.canParse(r)) r = new URL(r).pathname;
		// 	return new Response(null, {
		// 		status: 303,
		// 		headers: {
		// 			location: `${r ?? "/"}?logout`,
		// 			"set-cookie": `token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
		// 		},
		// 	});
		// }
		// if (url.pathname === authRedirectPath) {
		// 	if (request.method !== "GET" && request.method !== "HEAD")
		// 		return create405();
		// 	const code = url.searchParams.get("code"),
		// 		state = url.searchParams.get("state");
		// 	const loginState = request.headers
		// 		.get("cookie")
		// 		?.match(/(?:^|;\s*)loginState=([^;]*)/)?.[1];
		// 	const headers: [string, string][] = [
		// 		[
		// 			"Set-Cookie",
		// 			`loginState=; Path=/auth/discord/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
		// 		],
		// 	];
		// 	const parsed = await Promise.try(
		// 		() =>
		// 			new URLSearchParams(
		// 				textDecoder.decode(
		// 					Uint8Array.fromBase64(state!, { alphabet: "base64url" }),
		// 				),
		// 			),
		// 	).catch(normalizeError);
		// 	if (loginState !== state || !state || parsed instanceof Error) {
		// 		headers.push([
		// 			"Location",
		// 			`/?${new URLSearchParams({ error: "invalid_state", error_description: "La richiesta ha fornito parametri inaspettati: assicurati di non aver aperto più finestre di login o disattivato i cookie" }).toString()}`,
		// 		]);
		// 		return new Response(null, { status: 303, headers });
		// 	}
		// 	if (!code) {
		// 		headers.push([
		// 			"Location",
		// 			`/?${new URLSearchParams({ error: url.searchParams.get("error") ?? "invalid_code", error_description: url.searchParams.get("error_description") ?? "La richiesta non ha restituito il codice di accesso. Riprova più tardi" }).toString()}`,
		// 		]);
		// 		return new Response(null, { status: 303, headers });
		// 	}
		// 	const token = await tokenFromResponse(
		// 		await fetch(RouteBases.api + Routes.oauth2TokenExchange(), {
		// 			body: new URLSearchParams({
		// 				code,
		// 				redirect_uri: new URL(authRedirectPath, url).href,
		// 				grant_type: "authorization_code",
		// 			}).toString(),
		// 			headers: {
		// 				"Content-Type": "application/x-www-form-urlencoded",
		// 				Authorization: `Basic ${textEncoder.encode(`${env.DISCORD_APPLICATION_ID}:${env.DISCORD_CLIENT_SECRET}`).toBase64()}`,
		// 			},
		// 			method: "POST",
		// 		}),
		// 	);

		// 	if (token instanceof URLSearchParams) {
		// 		headers.push(["Location", `/?${token.toString()}`]);
		// 		return new Response(null, { status: 303, headers });
		// 	}
		// 	headers.push(
		// 		["Location", `${parsed.get("r") ?? "/"}?login_success`],
		// 		[
		// 			"Set-Cookie",
		// 			`token=${await createToken(token)}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
		// 		],
		// 	);
		// 	return new Response(null, { status: 303, headers });
		// }
		// if (url.pathname === "/interactions") {
		// 	if (request.method === "POST")
		// 		return handler.handleInteraction(request).catch((e) => {
		// 			if (e instanceof Response) return e;
		// 			console.error(e);
		// 			return new Response(null, { status: 500 });
		// 		});
		// 	return create405("POST");
		// }
		// if (url.pathname === "/color") {
		// 	if (request.method !== "GET" && request.method !== "HEAD")
		// 		return create405();
		// 	const rgb = [
		// 		url.searchParams.get("red"),
		// 		url.searchParams.get("green"),
		// 		url.searchParams.get("blue"),
		// 	].map(Number) as RGB;

		// 	if (rgb.some(isNaN))
		// 		return request.method === "GET" ?
		// 				Response.json(
		// 					{ error: "Missing 'red', 'green' or 'blue' query parameter" },
		// 					{ status: 400 },
		// 				)
		// 			:	new Response(null, {
		// 					status: 400,
		// 					headers: { "content-type": "application/json" },
		// 				});
		// 	return new Response(
		// 		request.method === "GET" ?
		// 			((await createSolidPng(256, 256, ...rgb)) as BodyInit)
		// 		:	null,
		// 		{ headers: { "Content-Type": "image/png" } },
		// 	);
		// }
		// return new Response(null, { status: 404 });
	},
	scheduled: async ({ cron }) => {
		if (cron === "0 0 * * *")
			await Promise.allSettled([env.PREDICTIONS_REMINDERS.create()]);
		else if (cron === "*/5 * * * *") {
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
