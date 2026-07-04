export default class {
	readonly eventSource: EventSource;
	private listeners: Record<string, ((...args: any[]) => void)[]> = {};
	constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
		this.eventSource = new EventSource(url, eventSourceInitDict);
		this.eventSource.onerror = (ev) => {
			this.eventSource.close();
			for (const callback of this.listeners.close ?? []) callback(ev);
		};
	}
	on(
		type: "error",
		callback: (error: { name?: string; message: string }) => void,
	): this;
	on(type: "close", callback: (ev: Event) => void): this;
	on<T>(type: string, callback: (data: T) => void): this;
	on(type: string, callback: (data?: any) => void) {
		if (type === "close") (this.listeners.close ??= []).push(callback);
		else
			this.eventSource.addEventListener(type, (event: MessageEvent<string>) =>
				callback(JSON.parse(event.data)),
			);
		return this;
	}
	finished(): Promise<void> {
		if (this.eventSource.readyState === EventSource.CLOSED)
			return Promise.resolve();
		return new Promise((resolve, reject) => {
			this.on("close", resolve);
			this.on("error", (error) =>
				reject(
					Object.defineProperty(new Error(error.message), "name", {
						value: error.name ?? "Error",
					}),
				),
			);
		});
	}
}
