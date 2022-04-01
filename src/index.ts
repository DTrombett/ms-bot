import { config } from "dotenv";
import express from "express";
import process, { env } from "node:process";
import Constants, { CustomClient } from "./util";

process.on("uncaughtException", (err) => {
	console.error(err);
});

void CustomClient.printToStdout("Starting...");
if (env.DISCORD_TOKEN == null) config();
await CustomClient.logToFile("\n");
console.time(Constants.clientOnlineLabel);

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

app.use((_, res) => {
	res.sendStatus(204);
});
app.listen(3000);
await client.login();
