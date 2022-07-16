import { env } from "node:process";
import { createEvent, CustomClient } from "../util";

export const event = createEvent({
	name: "debug",
	on:
		env.NODE_ENV !== "production"
			? (info) => {
					CustomClient.printToStdout(info);
			  }
			: undefined,
});
