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
import type { ActionMethod } from "../types";

let pool: WorkerPool;

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
	pool ??= workerpool(join(cwd(), "/dist/util/workers/math.js"));
	const result = await pool
		.exec("evaluate", [expr, fraction === "true"])
		.timeout(60_000)
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
