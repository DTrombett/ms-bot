import cssMap from "build:css";
import jsMap from "build:js";
import { renderToReadableStream } from "react-dom/server";
import Forbidden from "../app/403.page";
import { isMobile } from "./isMobile";

export const create403 = async (
	request: Request,
	init?: ResponseInit & { headers?: Record<string, string> },
) =>
	new Response(
		request.method === "GET" ?
			await renderToReadableStream(
				<Forbidden
					mobile={isMobile(request.headers)}
					styles={cssMap["/403"]}
				/>,
				{ bootstrapModules: jsMap["/403"] },
			)
		:	null,
		{
			status: 403,
			...init,
			headers: {
				"accept-ch": "Sec-CH-UA-Mobile",
				"content-type": "text/html",
				...init?.headers,
			},
		},
	);

export const create405 = (allow = "HEAD, GET") =>
	new Response(null, { status: 405, headers: { allow } });
