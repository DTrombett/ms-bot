import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import { Colors } from "discord.js";
import { join } from "node:path";
import { cwd } from "node:process";
import type { WorkerPool } from "workerpool";
import { pool as workerpool } from "workerpool";
import CustomClient from "../CustomClient";
import type { ActionMethod } from "../types";

let pool: WorkerPool,
	ready = false;

/**
 * Calculate a mathematical expression.
 * @param _client - The client
 * @param expr - The expression to calculate
 * @param fraction - Whether to return a fraction
 */
export const calc: ActionMethod<
	"calc",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (_client, expr, fraction) => {
	if (!ready) {
		void (pool ??= workerpool(join(cwd(), "dist/util/workers/math.js"), {
			maxWorkers: 1,
		}))
			.exec("evaluate", ["0"])
			.then(() => (ready = true))
			.catch(CustomClient.printToStderr);
		return {
			content:
				"La calcolatrice è in fase di inizializzazione, riprova tra qualche secondo...",
		};
	}

	const result = await pool
		.exec("evaluate", [expr, fraction === "true"])
		.timeout(2_000)
		.catch((err: unknown) => err);
	const error = typeof result !== "string";

	return {
		embeds: [
			{
				title: "Calcolatrice",
				fields: [
					{
						name: "📝 Operazione",
						value: `\`${expr}\``,
					},
					{
						name: `📝 ${error ? "Errore" : "Risultato"}`,
						value: error
							? result instanceof Error
								? result.message
								: "Errore"
							: result.slice(0, 1024),
					},
				],
				color: error ? Colors.Red : Colors.Blurple,
				timestamp: new Date().toISOString(),
			},
		],
		ephemeral: error,
	};
};
