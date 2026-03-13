import { env } from "cloudflare:workers";
import {
	Routes,
	type RESTGetAPIOAuth2CurrentAuthorizationResult,
	type RESTPostOAuth2AccessTokenResult,
} from "discord-api-types/v10";
import { rest, textEncoder } from "./globals";
import { toSearchParams } from "./objects";

export const updateToken = async (
	body: RESTPostOAuth2AccessTokenResult | JWT,
) => {
	try {
		rest.setToken("access_token" in body ? body.access_token : body.a);
		const [authorization, key] = await Promise.all([
			rest.get(Routes.oauth2CurrentAuthorization(), {
				authPrefix: "Bearer",
			}) as Promise<RESTGetAPIOAuth2CurrentAuthorizationResult>,
			crypto.subtle.importKey(
				"raw",
				Uint8Array.fromBase64(env.SECRET_KEY),
				{ name: "AES-GCM" },
				false,
				["encrypt"],
			),
		]);
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const ciphertext = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv },
			key,
			textEncoder.encode(
				toSearchParams({
					a: "access_token" in body ? body.access_token : body.a,
					d: authorization.user!.global_name ?? undefined,
					e: Math.floor(Date.parse(authorization.expires) / 1000),
					h: authorization.user!.avatar ?? undefined,
					i: authorization.user!.id,
					l: Math.floor(Date.now() / 1000),
					r: "refresh_token" in body ? body.refresh_token : body.r,
					s: authorization.scopes.join(" "),
					u: authorization.user!.username,
				} satisfies JWT).toString(),
			),
		);
		const token = new Uint8Array(iv.length + ciphertext.byteLength);

		token.set(iv, 0);
		token.set(new Uint8Array(ciphertext), iv.length);
		return token.toBase64({ alphabet: "base64url", omitPadding: true });
	} finally {
		rest.setToken(env.DISCORD_TOKEN);
	}
};

export default async (res: Response) => {
	try {
		const body = await res
			.json<
				| { error: string; error_description: string }
				| RESTPostOAuth2AccessTokenResult
				| null
			>()
			.catch(() => null);

		if (!res.ok || !body || "error" in body || !body.access_token)
			return new URLSearchParams({
				error:
					body && "error" in body && body.error ?
						body.error
					:	"invalid_response",
				error_description:
					body && "error_description" in body && body.error_description ?
						body.error_description
					:	"Il codice di accesso non è valido o è scaduto. Riprova più tardi",
			});
		return await updateToken(body);
	} catch (err) {
		console.error(err);
		return new URLSearchParams({
			error: "unknown_error",
			error_description: "Si è verificato un errore sconosciuto",
		});
	}
};
