import { textEncoder } from "./globals";

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
	static override error(
		error?: Error | string,
		init: Omit<ResponseInit, "status"> = {},
	) {
		return new this(init)
			.send(
				"error",
				error === undefined ? undefined
				: typeof error === "string" ? { message: error }
				: { message: error.message, name: error.name },
			)
			.end();
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
					`event: ${event}${data === undefined ? "" : `\ndata: ${JSON.stringify(data)}`}\n\n`,
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
			.then(this.controller.close.bind(this.controller))
			.finally(this.promises.clear.bind(this.promises));
		return this;
	}
}
