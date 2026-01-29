import { waitUntil } from "cloudflare:workers";

const blackListedRequestHeaders = ["Authorization"];

export const fetchCache = async (
	input: RequestInfo | URL,
	init: RequestInit<RequestInitCfProperties> = {},
	ttl: number = 20,
) => {
	init.cf ??= {};
	init.cf.cacheEverything = true;
	const request = new Request(input, init);
	const removedHeaders = new Headers();

	for (const name of blackListedRequestHeaders)
		if (request.headers.has(name)) {
			removedHeaders.set(name, request.headers.get(name)!);
			request.headers.delete(name);
		}
	let res = await caches.default.match(request);

	if (!res) {
		const reqClone = request.clone();
		for (const [name, value] of removedHeaders)
			reqClone.headers.set(name, value);
		res = await fetch(reqClone);
		const resClone = res.clone();
		const cacheHeader = res.headers.get("Cache-Control");

		if (
			cacheHeader?.startsWith("no-") ||
			cacheHeader?.startsWith("private") ||
			cacheHeader?.startsWith("must-")
		)
			resClone.headers.set(
				"Cache-Control",
				`public, max-age=${cacheHeader.match(/max-age=(\d+)/)?.[1] ?? ttl}`,
			);
		waitUntil(caches.default.put(request, resClone));
	}
	return res;
};
