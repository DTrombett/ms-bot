import { env } from "cloudflare:workers";
import { RouteBases, Routes, type APIUser } from "discord-api-types/v10";
import { renderToReadableStream } from "react-dom/server";
import cssMap from "../dist/cssMap.json";
import Index from "../dist/index";
import Tournaments from "../dist/tournaments";
import * as commands from "./commands/index";
import { CommandHandler } from "./util/CommandHandler";
import { createSolidPng } from "./util/createSolidPng";
import { textEncoder } from "./util/globals";
import { isMobile } from "./util/isMobile";
import normalizeError from "./util/normalizeError";
import { toSearchParams } from "./util/objects";
import type { RGB } from "./util/resolveColor";
import { TimeUnit } from "./util/time";
import {
	createSetCookie,
	createToken,
	parseToken,
	refreshToken,
	tokenFromResponse,
	updateToken,
} from "./util/token";

const handler = new CommandHandler(Object.values(commands));
const authRedirectPath = "/auth/discord/callback";
const create405 = (allow = "GET, HEAD") =>
	new Response(null, { status: 405, headers: { allow } });

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
							styles={cssMap.index}
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
					)
				:	null,
				{
					headers: {
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
							styles={cssMap.tournaments}
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
							mobile={isMobile(request.headers)}
						/>,
					)
				:	null,
				{
					headers: {
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
							"set-cookie": `token=${await createToken(await updateToken(token))}; Path=/; HttpOnly; Secure; SameSite=Lax`,
						},
					});
				else if (token?.r)
					return new Response(null, {
						status: 303,
						headers: {
							location: `${r ?? "/"}?login_success`,
							"set-cookie": `token=${await createToken(await refreshToken(token.r, true))}; Path=/; HttpOnly; Secure; SameSite=Lax`,
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
					`token=${await createToken(token)}; Path=/; HttpOnly; Secure; SameSite=Lax`,
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
					await createSolidPng(256, 256, ...rgb)
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
export { WebSocket } from "./WebSocket";

export default server;
