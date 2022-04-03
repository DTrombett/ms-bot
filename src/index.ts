import { config } from "dotenv";
import express from "express";
import type { Server } from "node:http";
import { env } from "node:process";
import Constants, { CustomClient } from "./util";

void CustomClient.printToStdout("Starting...");
if (env.DISCORD_TOKEN == null) config();
console.time(Constants.clientOnlineLabel);
await CustomClient.logToFile("\n");

const client = new CustomClient();
const app = express();
(
	global as typeof globalThis & {
		client: typeof client;
	}
).client = client;
(
	global as typeof globalThis & {
		app: typeof app;
	}
).app = app;
(
	global as typeof globalThis & {
		server: Server;
	}
).server = app.listen(3000);

app.use((_, res) => {
	res.sendStatus(204);
});
await client.login();
