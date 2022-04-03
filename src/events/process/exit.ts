import type { Server } from "node:http";
import type { EventOptions } from "../../util";
import { CustomClient, EventType } from "../../util";

declare const server: Server;

export const event: EventOptions<EventType.Process, "exit"> = {
	name: "exit",
	type: EventType.Process,
	once(code) {
		void CustomClient.printToStderr(
			`Process exiting with code ${code}...`,
			true
		);
		this.client.destroy();
		server.close();
	},
};
