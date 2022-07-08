import { env } from "node:process";
import { createEvent, CustomClient } from "../util";

const dev = env.NODE_ENV !== "production";

export const event = createEvent({
	name: "debug",
	on: dev
		? (info) => {
				CustomClient.printToStdout(info);
		  }
		: undefined,
});
