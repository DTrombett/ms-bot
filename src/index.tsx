import { env } from "cloudflare:workers";
import { RouteBases, Routes } from "discord-api-types/v10";
import { renderToReadableStream } from "react-dom/server";
import cssMap from "../dist/cssMap.json";
import Index from "../dist/index";
import * as commands from "./commands/index";
import { CommandHandler } from "./util/CommandHandler";
import { createSolidPng } from "./util/createSolidPng";
import type { RGB } from "./util/resolveColor";

const handler = new CommandHandler(Object.values(commands));
const authRedirectPath = "/auth/callback/discord";
const redirect_uri = `http://localhost:8787${authRedirectPath}`;
const create405 = (allow = "GET") =>
	new Response(null, { status: 405, headers: { allow } });

const server: ExportedHandler<Env> = {
	fetch: async (request) => {
		const url = new URL(request.url);

		if (url.pathname === "/") {
			if (request.method === "GET")
				return new Response(
					await renderToReadableStream(<Index styles={cssMap.index} />),
					{
						headers: {
							"content-type": "text/html",
							"cache-control": "max-age=300",
						},
					},
				);
			return create405();
		}
		if (url.pathname === "/auth/login/discord") {
			const state = crypto.randomUUID();

			return new Response(null, {
				headers: {
					location: `https://discord.com/oauth2/authorize?${new URLSearchParams(
						{
							client_id: env.DISCORD_APPLICATION_ID,
							prompt: "none",
							response_type: "code",
							scope: "identify",
							redirect_uri,
							state,
						},
					).toString()}`,
					"set-cookie": `loginState=${state}; Path=${authRedirectPath}; HttpOnly; Secure; SameSite=Lax`,
				},
				status: 302,
			});
		}
		if (url.pathname === authRedirectPath) {
			const code = url.searchParams.get("code"),
				state = url.searchParams.get("state");
			const loginState = request.headers
				.get("cookie")
				?.match(/(?:^|;\s*)loginState=([^;]*)/)?.[1];
			const headers: [string, string][] = [
				[
					"Set-Cookie",
					`loginState=; Path=${authRedirectPath}; HttpOnly; Secure; SameSite=Lax`,
				],
			];
			if (loginState !== state || !state) {
				headers.push([
					"Location",
					`/?${new URLSearchParams({ error: "invalid_state", error_description: "La richiesta ha fornito parametri inaspettati: assicurati di non aver aperto più finestre di login" }).toString()}`,
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
			const res = await fetch(RouteBases.api + Routes.oauth2TokenExchange(), {
				body: new URLSearchParams({
					code,
					redirect_uri,
					grant_type: "authorization_code",
				}).toString(),
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${btoa(`${env.DISCORD_APPLICATION_ID}:${env.DISCORD_CLIENT_SECRET}`)}`,
				},
				method: "POST",
			});
			const body = await res
				.json<
					| { error: string; error_description: string }
					| {
							token_type: string;
							access_token: string;
							expires_in: number;
							refresh_token: string;
							scope: string;
					  }
					| null
				>()
				.catch(() => null);

			if (
				!res.ok ||
				!body ||
				"error" in body ||
				!body.access_token ||
				!body.expires_in
			) {
				headers.push([
					"Location",
					`/?${new URLSearchParams({ error: body && "error" in body && body.error ? body.error : "invalid_response", error_description: body && "error_description" in body && body.error_description ? body.error_description : "Il codice di accesso non è valido o è scaduto. Riprova più tardi" }).toString()}`,
				]);
				return new Response(null, { status: 303, headers });
			}
			console.log(body);
			headers.push(["Location", "/?login_success"]);
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
			if (request.method !== "GET") return create405();
			const rgb = [
				url.searchParams.get("red"),
				url.searchParams.get("green"),
				url.searchParams.get("blue"),
			].map(Number) as RGB;

			if (rgb.some(isNaN))
				return Response.json(
					{ error: "Missing 'red', 'green' or 'blue' query parameter" },
					{ status: 400 },
				);
			return new Response(await createSolidPng(256, 256, ...rgb), {
				headers: { "Content-Type": "image/png" },
			});
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
