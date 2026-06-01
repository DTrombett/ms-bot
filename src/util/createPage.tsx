import { renderToReadableStream } from "react-dom/server";
import { Head } from "../app/components/layout";
import { findRoute } from "./findRoute";
import { isMobile } from "./isMobile";
import { createSetCookie } from "./token";

// Throwing a ResponseError means that the response can be sent
export class ResponseError extends Error {
	constructor(public body?: PageBody) {
		super();
	}
}

export const createPage = async (
	router: Router,
	request: Request,
	response: ResponseInit & { headers: Headers },
	url: URL,
): Promise<Response> => {
	const methods = new Set(Object.keys(router.route.methods));
	if (!methods.has("default")) {
		if (methods.has("GET")) methods.add("HEAD");
		response.headers.set("Allow", Array.from(methods).join(", "));
	}
	let page = router.route.methods[request.method];

	if (request.method === "HEAD" || response.status === 404)
		page ??= router.route.methods.GET;
	page ??= router.route.methods.default;
	if (!page) {
		response.status = 405;
		return new Response(null, response);
	}
	try {
		const head: HeadOptions = {};
		let result = await Promise.try(
			page.handler.bind(null, {
				head,
				params: router.params,
				request,
				response,
				url,
				authenticate: async ({ force = false } = {}) => {
					const { setCookie, token } = await createSetCookie(request);

					if (setCookie) response.headers.set("set-cookie", setCookie);
					response.headers.append("Vary", "Cookie");
					if (force && !token) {
						response.status = 303;
						response.headers.set(
							"Location",
							`/auth/discord/login?to=${encodeURIComponent(url.pathname)}`,
						);
						throw new ResponseError();
					}
					return token!;
				},
				isMobile: () => {
					response.headers.append("Vary", "Sec-CH-UA-Mobile");
					return isMobile(request.headers);
				},
				json: (data, status) => {
					if (status) response.status = status;
					response.headers.set("Content-Type", "application/json");
					return new Response(JSON.stringify(data), response);
				},
				redirect: (url, status = 302) => {
					response.status = status;
					response.headers.set("Location", url.toString());
					return new Response(null, response);
				},
				sendPage: (path, { method = request.method } = {}) => {
					url = new URL(path, url);
					const router = findRoute(url);

					if (!router) return Promise.reject(new Error("Route not found"));
					return createPage(
						router,
						new Request(url, { ...request, method }),
						response,
						url,
					);
				},
			}),
		).catch((err) =>
			err instanceof ResponseError ? err.body
			: err instanceof Response ? err
			: Promise.reject(err),
		);

		// If the page handler returns a response do not modify it
		if (result instanceof Response) return result;
		else if (typeof result === "undefined") result = null;
		else if (
			typeof result === "number" ||
			typeof result === "bigint" ||
			typeof result === "boolean"
		)
			result = String(result);
		if (
			result &&
			typeof result !== "string" &&
			!ArrayBuffer.isView(result) &&
			!(
				result instanceof ArrayBuffer ||
				result instanceof Blob ||
				result instanceof FormData ||
				result instanceof ReadableStream ||
				result instanceof URLSearchParams
			)
		) {
			if (!response.headers.has("content-type"))
				response.headers.set("content-type", "text/html");
			// TODO: also preload images
			for (const element of router.route.styles)
				if (!element.lazy)
					response.headers.append(
						"Link",
						`<${encodeURI(element.src)}>; rel=preload; as=style`,
					);
			for (const element of router.route.fonts)
				response.headers.append(
					"Link",
					`<${encodeURI(element.src)}>; rel=preload; as=font; crossorigin`,
				);
			for (const element of router.route.scripts)
				if (element.module)
					// TODO: also include imported modules
					response.headers.append(
						"Link",
						`<${encodeURI(element.src)}>; rel=modulepreload`,
					);
			result =
				request.method === "HEAD" ?
					null
				:	await renderToReadableStream(
						<html lang="it">
							<Head {...head} styles={router.route.styles} />
							{result}
						</html>,
						{
							bootstrapModules: router.route.scripts
								.filter((s) => s.module)
								.map((s) => s.src),
							bootstrapScripts: router.route.scripts
								.filter((s) => !s.module)
								.map((s) => s.src),
						},
					);
		} else if (request.method === "HEAD") {
			// Response auto fills content-type for these so we need it only with HEAD
			if (!response.headers.has("content-type"))
				if (typeof result === "string")
					response.headers.set("content-type", "text/plain;charset=UTF-8");
				else if (result instanceof URLSearchParams)
					response.headers.set(
						"content-type",
						"application/x-www-form-urlencoded;charset=UTF-8",
					);
				else if (result instanceof FormData)
					response.headers.set("content-type", "multipart/form-data");
			result = null;
		}
		return new Response(result, response);
	} catch (err) {
		console.error(err);
		return new Response(null, { status: 500 });
	}
};
