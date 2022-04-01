import { config } from "dotenv";
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
(
	global as typeof globalThis & {
		client: CustomClient;
	}
).client = client;

await client.login();
