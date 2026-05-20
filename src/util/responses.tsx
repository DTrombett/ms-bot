import cssMap from "build:css";
import jsMap from "build:js";
import { renderToReadableStream } from "react-dom/server";
import Forbidden from "../app/403.page";
import { textEncoder } from "./globals";
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

export class JsonStreamResponse extends Response {
	promises = new Set<Promise<void>>();
	controller: ReadableStreamDefaultController<Uint8Array>;
	constructor(init: ResponseInit = {}) {
		if (!(init.headers instanceof Headers))
			init.headers = new Headers(init.headers);
		if (!init.headers.has("content-type"))
			init.headers.set("content-type", "text/event-stream");
		let controller!: ReadableStreamDefaultController;

		super(new ReadableStream({ start: (c) => (controller = c) }), init);
		this.controller = controller;
	}
	send(event: string, data: any): this;
	send(event: string, data: Promise<any>): this;
	send(event: string, data: any) {
		if (data instanceof Promise)
			this.promises.add(
				(data = data
					.then(this.send.bind(this, event))
					.then(() => {})
					.finally(() => this.promises.delete(data as Promise<void>))),
			);
		else
			this.controller.enqueue(
				textEncoder.encode(
					`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
				),
			);
		return this;
	}
	sendAll(...events: { event: string; data: any }[]) {
		for (const { event, data } of events) this.send(event, data);
		return this;
	}
	end(): this {
		void Promise.allSettled(this.promises)
			.then(this.controller?.close.bind(this.controller))
			.finally(this.promises.clear.bind(this.promises));
		return this;
	}
}
