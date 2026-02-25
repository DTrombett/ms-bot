import { env } from "cloudflare:workers";
import type {
	Params as BrawlParams,
	UserResult as BrawlUserResult,
} from "./BrawlNotifications.ts";
import type {
	Params as ClashParams,
	UserResult as ClashUserResult,
} from "./ClashNotifications.ts";
import * as commands from "./commands/index.ts";
import { CommandHandler } from "./util/CommandHandler.ts";
import { createSolidPng } from "./util/createSolidPng.ts";
import type { RGB } from "./util/resolveColor.ts";

const handler = new CommandHandler(Object.values(commands));
const spotifyKey = await crypto.subtle.importKey(
	"raw",
	Uint8Array.from(atob(env.SPOTIFY_PRIVATE_KEY), (c) => c.charCodeAt(0)),
	{ name: "AES-GCM" },
	false,
	["encrypt", "decrypt"],
);

const server: ExportedHandler<Env> = {
	fetch: async (request) => {
		const url = new URL(request.url);

		if (url.pathname === "/interactions") {
			if (request.method === "POST")
				return handler.handleInteraction(request).catch((e) => {
					if (e instanceof Response) return e;
					console.error(e);
					return new Response(null, { status: 500 });
				});
			return new Response(null, { status: 405 });
		}
		if (url.pathname === "/color") {
			if (request.method !== "GET") return new Response(null, { status: 405 });
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
		if (url.pathname === "/spotify/login") {
			if (request.method !== "GET") return new Response(null, { status: 405 });
			if (!url.searchParams.has("id"))
				return new Response("Missing id", { status: 400 });
			const iv = crypto.getRandomValues(new Uint8Array(12));

			return Response.redirect(
				`https://accounts.spotify.com/authorize?${new URLSearchParams({
					response_type: "code",
					scope: "user-library-read",
					client_id: env.SPOTIFY_CLIENT_ID,
					redirect_uri: env.SPOTIFY_REDIRECT_URI,
					state: `${btoa(
						String.fromCharCode(
							...new Uint8Array(
								await crypto.subtle.encrypt(
									{ name: "AES-GCM", iv },
									spotifyKey,
									new TextEncoder().encode(url.searchParams.toString()),
								),
							),
						),
					)},${btoa(String.fromCharCode(...iv))}`,
				}).toString()}`,
			);
		}
		if (url.pathname === "/spotify/callback") {
			if (request.method !== "GET") return new Response(null, { status: 405 });
			const code = url.searchParams.get("code");
			const [cipherText, iv] = (url.searchParams.get("state") ?? "").split(",");

			if (!code || !cipherText || !iv)
				return new Response(
					`Impossibile collegare il profilo! Debug: code: ${!!code}, cipherText: ${!!cipherText}, iv: ${!!iv}`,
					{ status: 400 },
				);
			const state = new URLSearchParams(
				new TextDecoder().decode(
					new Uint8Array(
						await crypto.subtle.decrypt(
							{
								name: "AES-GCM",
								iv: Uint8Array.from(atob(iv), (c) => c.charCodeAt(0)),
							},
							spotifyKey,
							Uint8Array.from(atob(cipherText), (c) => c.charCodeAt(0)),
						),
					),
				),
			);
			let res = await fetch("https://accounts.spotify.com/api/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code,
					redirect_uri: env.SPOTIFY_REDIRECT_URI,
				}),
			});
			if (!res.ok) return res;
			const now = Math.floor(Date.now() / 1000),
				body = await res.json<Spotify.TokenResponse>();
			res = await fetch("https://api.spotify.com/v1/me", {
				headers: { Authorization: `Bearer ${body.access_token}` },
			});
			if (!res.ok) return res;
			const data = await res.json<Spotify.CurrentUserProfile>();
			await env.DB.prepare(
				`INSERT OR REPLACE INTO SpotifyUsers (id, discordId, accessToken, expirationDate, refreshToken)
				VALUES (?1, ?2, ?3, ?4, ?5)`,
			)
				.bind(
					data.id,
					state.get("id"),
					body.access_token,
					now + body.expires_in,
					body.refresh_token,
				)
				.run();
			return new Response("Profilo collegato con successo!", {
				headers: { "Content-Type": "text/plain" },
			});
		}
		if (url.pathname === "/spotify") {
			if (request.method === "GET")
				return Response.redirect(
					`https://open.spotify.com/user/${env.SPOTIFY_ID}`,
				);
			return new Response(null, { status: 405 });
		}
		if (url.pathname === "/") {
			if (request.method === "GET") return new Response("Ready!");
			return new Response(null, { status: 405 });
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
				`SELECT id,
					brawlTag,
					brawlNotifications,
					brawlTrophies,
					brawlers,
					clashTag,
					clashNotifications,
					cards,
					arena,
					league
				FROM Users
				WHERE (
						brawlTag IS NOT NULL
						AND brawlNotifications != 0
					)
					OR (
						clashTag IS NOT NULL
						AND clashNotifications != 0
					)`,
			).all<BrawlUserResult & ClashUserResult>();
			const brawlBatch: WorkflowInstanceCreateOptions<BrawlParams>[] = results
				.reduce((arr, v) => {
					if (!v.brawlTag || !v.brawlNotifications) return arr;
					if (!arr.length || arr.at(-1)!.length >= 25) arr.push([]);
					arr
						.at(-1)!
						.push({
							brawlNotifications: v.brawlNotifications,
							brawlTag: v.brawlTag,
							brawlTrophies: v.brawlTrophies,
							id: v.id,
							brawlers: v.brawlers,
						});
					return arr;
				}, [] as BrawlUserResult[][])
				.map((users) => ({ params: { users } }));
			const clashBatch: WorkflowInstanceCreateOptions<ClashParams>[] = results
				.reduce((arr, v) => {
					if (!v.clashTag || !v.clashNotifications) return arr;
					if (!arr.length || arr.at(-1)!.length >= 16) arr.push([]);
					arr
						.at(-1)!
						.push({
							clashNotifications: v.clashNotifications,
							clashTag: v.clashTag,
							arena: v.arena,
							cards: v.cards,
							id: v.id,
							league: v.league,
						});
					return arr;
				}, [] as ClashUserResult[][])
				.map((users) => ({ params: { users } }));

			for (const result of await Promise.allSettled([
				brawlBatch.length ?
					env.BRAWL_NOTIFICATIONS.createBatch(brawlBatch)
				:	null,
				clashBatch.length ?
					env.CLASH_NOTIFICATIONS.createBatch(clashBatch)
				:	null,
			]))
				if (result.status === "rejected") console.error(result.reason);
				else
					console.log(
						"Started workflow(s) with IDs",
						...(result.value ?? []).map((r) => r.id),
					);
		}
	},
};

export { BrawlNotifications } from "./BrawlNotifications.ts";
export { ClashNotifications } from "./ClashNotifications.ts";
export { PredictionsReminders } from "./PredictionsReminders.ts";
export { Reminder } from "./Reminder.ts";
export { Shorten } from "./Shorten.ts";
export { WebSocket } from "./WebSocket.ts";

export default server;
