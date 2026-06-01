import { env } from "cloudflare:workers";
import { RouteBases, Routes } from "discord-api-types/v10";
import { textDecoder, textEncoder } from "../../../util/globals";
import normalizeError from "../../../util/normalizeError";
import { createToken, tokenFromResponse } from "../../../util/token";

export const GET: PageHandler = async ({
	url,
	request,
	response,
	redirect,
}) => {
	const code = url.searchParams.get("code"),
		state = url.searchParams.get("state");
	const loginState = request.headers
		.get("cookie")
		?.match(/(?:^|;\s*)loginState=([^;]*)/)?.[1];
	const headers: [string, string][] = [
		...response.headers,
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
		response.headers = new Headers(headers);
		return redirect(
			`/?${new URLSearchParams({ error: "invalid_state", error_description: "La richiesta ha fornito parametri inaspettati: assicurati di non aver aperto più finestre di login o disattivato i cookie" }).toString()}`,
			303,
		);
	}
	if (!code) {
		response.headers = new Headers(headers);
		return redirect(
			`/?${new URLSearchParams({ error: url.searchParams.get("error") ?? "invalid_code", error_description: url.searchParams.get("error_description") ?? "La richiesta non ha restituito il codice di accesso. Riprova più tardi" }).toString()}`,
			303,
		);
	}
	const token = await tokenFromResponse(
		await fetch(RouteBases.api + Routes.oauth2TokenExchange(), {
			body: new URLSearchParams({
				code,
				redirect_uri: url.href,
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
		response.headers = new Headers(headers);
		return redirect(`/?${token.toString()}`, 303);
	}
	headers.push([
		"Set-Cookie",
		`token=${await createToken(token)}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
	]);
	response.headers = new Headers(headers);
	return redirect(`${parsed.get("r") ?? "/"}?login_success`, 303);
};
