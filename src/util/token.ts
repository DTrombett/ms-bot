import { env } from "cloudflare:workers";
import {
	RouteBases,
	Routes,
	type RESTGetAPIGuildMemberResult,
	type RESTGetAPIOAuth2CurrentAuthorizationResult,
	type RESTPostOAuth2AccessTokenResult,
} from "discord-api-types/v10";
import { rest, textDecoder, textEncoder } from "./globals";
import { toSearchParams } from "./objects";
import { TimeUnit } from "./time";

export const createToken = async (jwt: JWT) => {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		await crypto.subtle.importKey(
			"raw",
			Uint8Array.fromBase64(env.SECRET_KEY),
			{ name: "AES-GCM" },
			false,
			["encrypt"],
		),
		textEncoder.encode(toSearchParams(jwt).toString()),
	);
	const token = new Uint8Array(iv.length + ciphertext.byteLength);

	token.set(iv, 0);
	token.set(new Uint8Array(ciphertext), iv.length);
	return token.toBase64({ alphabet: "base64url", omitPadding: true });
};

export const updateToken = async (
	body: RESTPostOAuth2AccessTokenResult | JWT,
): Promise<JWT> => {
	try {
		rest.setToken("access_token" in body ? body.access_token : body.a);
		const authorization = (await rest.get(Routes.oauth2CurrentAuthorization(), {
			authPrefix: "Bearer",
		})) as RESTGetAPIOAuth2CurrentAuthorizationResult;

		return {
			a: "access_token" in body ? body.access_token : body.a,
			d: authorization.user!.global_name ?? undefined,
			e: Math.floor(Date.parse(authorization.expires) / 1000),
			h: authorization.user!.avatar ?? undefined,
			i: authorization.user!.id,
			l: Math.floor(Date.now() / 1000),
			r: "refresh_token" in body ? body.refresh_token : body.r,
			s: authorization.scopes.join(" "),
			u: authorization.user!.username,
		};
	} finally {
		rest.setToken(env.DISCORD_TOKEN);
	}
};

export const refreshToken: {
	<T extends boolean>(
		refreshToken: string,
		mayThrow?: T,
	): Promise<T extends true ? JWT : JWT | URLSearchParams>;
	(refreshToken: string): Promise<JWT | URLSearchParams>;
} = async (refresh_token: string, mayThrow = false) =>
	tokenFromResponse(
		await fetch(RouteBases.api + Routes.oauth2TokenExchange(), {
			body: new URLSearchParams({
				refresh_token,
				grant_type: "refresh_token",
			}).toString(),
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${textEncoder.encode(`${env.DISCORD_APPLICATION_ID}:${env.DISCORD_CLIENT_SECRET}`).toBase64()}`,
			},
			method: "POST",
		}),
		mayThrow,
	);

export const parseToken = async (token?: string) => {
	if (!token) return;
	const decoded = Uint8Array.fromBase64(token, { alphabet: "base64url" });

	return Object.fromEntries(
		new URLSearchParams(
			textDecoder.decode(
				await crypto.subtle.decrypt(
					{ name: "AES-GCM", iv: decoded.slice(0, 12) },
					await crypto.subtle.importKey(
						"raw",
						Uint8Array.fromBase64(env.SECRET_KEY),
						{ name: "AES-GCM" },
						false,
						["decrypt"],
					),
					decoded.slice(12),
				),
			),
		),
	) as object as JWT;
};

export const revokeToken = async (token?: string) => {
	if (token) {
		const parsed = await parseToken(token);

		if (parsed)
			return fetch(RouteBases.api + Routes.oauth2TokenRevocation(), {
				body: new URLSearchParams({
					token: parsed.a,
					token_type_hint: "access_token",
				}).toString(),
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${textEncoder.encode(`${env.DISCORD_APPLICATION_ID}:${env.DISCORD_CLIENT_SECRET}`).toBase64()}`,
				},
				method: "POST",
			}).then(() => {});
	}
};

export const tokenFromResponse: {
	<T extends boolean>(
		res: Response,
		mayThrow?: T,
	): Promise<T extends true ? JWT : JWT | URLSearchParams>;
	(res: Response): Promise<JWT | URLSearchParams>;
} = async (res: Response, mayThrow = false) => {
	try {
		const body = await res
			.json<
				| { error: string; error_description: string }
				| RESTPostOAuth2AccessTokenResult
				| null
			>()
			.catch(() => null);

		if (!res.ok || !body || "error" in body || !body.access_token) {
			const cause = {
				error:
					body && "error" in body && body.error ?
						body.error
					:	"invalid_response",
				error_description:
					body && "error_description" in body && body.error_description ?
						body.error_description
					:	"Il codice di accesso non è valido o è scaduto. Riprova più tardi",
			};

			if (mayThrow) throw new Error(cause.error_description, { cause });
			return new URLSearchParams(cause);
		}
		return await updateToken(body);
	} catch (err) {
		if (mayThrow) throw err;
		console.error(err);
		return new URLSearchParams({
			error: "unknown_error",
			error_description: "Si è verificato un errore sconosciuto",
		});
	}
};

export const createSetCookie = async (
	request: Request,
): Promise<{ setCookie: string; token: JWT | undefined }> => {
	let token = await parseToken(
		request.headers.get("cookie")?.match(/(?:^|;\s*)token=([^;]*)/)?.[1],
	);

	if (token)
		try {
			if (+token.e * 1000 <= Date.now()) {
				if (!token.r) throw new Error("No refresh token");
				token = await refreshToken(token.r, true);
				return {
					setCookie: `token=${await createToken(token)}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
					token,
				};
			}
			if (Date.now() - +token.l * 1000 > TimeUnit.Day) {
				token = await updateToken(token);
				return {
					setCookie: `token=${await createToken(token)}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
					token,
				};
			}
		} catch (err) {
			return {
				setCookie: `token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
				token,
			};
		}
	return { setCookie: "", token };
};

export const isAdmin: {
	(headers: Headers): Promise<boolean>;
	(token: JWT | undefined): Promise<boolean>;
} = async (headersOrToken: Headers | JWT | undefined) => {
	if (!headersOrToken) return false;
	if (!("i" in headersOrToken))
		headersOrToken = await parseToken(
			headersOrToken.get("cookie")?.match(/(?:^|;\s*)token=([^;]*)/)?.[1],
		);
	return !new Set(
		(
			headersOrToken &&
			((await rest
				.get(Routes.guildMember(env.MAIN_GUILD, headersOrToken.i))
				.catch(() => null)) as RESTGetAPIGuildMemberResult | null)
		)?.roles,
	).isDisjointFrom(new Set(env.ALLOWED_ROLES.split(",")));
};
