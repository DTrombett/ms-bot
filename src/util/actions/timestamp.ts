import { TimestampStyles } from "@discordjs/builders";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { ActionMethod } from "../types";
import { createActionId } from "./actions";

const styles = Object.values(TimestampStyles);

/**
 * Generate a Discord timestamp!
 * @param _client - The client
 * @param year - The year
 * @param month - The month
 * @param date - The month date
 * @param hours - The hour
 * @param minutes - The minute
 * @param seconds - The second
 */
export const timestamp: ActionMethod<
	"timestamp",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (
	_client,
	year,
	month,
	date = 1,
	hours = 0,
	minutes = 0,
	seconds = 0
) => {
	if (typeof year !== typeof month)
		return {
			ephemeral: true,
			content:
				"Una timestamp personalizzata richiede sia l'anno che il mese! Se non vuoi una timestamp personalizzata non inserire alcun valore.",
		};
	const d = Math.round(
		(year === undefined
			? new Date()
			: new Date(year, month! - 1, date, hours, minutes, seconds)
		).getTime() / 1000
	);

	return {
		content: `<t:${d}> (\`<t:${d}>\`)\n\n${styles
			.map((style) => `<t:${d}:${style}> (\`<t:${d}:${style}>\`)`)
			.join("\n")}`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Genera nuova!",
						custom_id: createActionId("timestamp"),
						style: ButtonStyle.Primary,
						emoji: { name: "⌚" },
					},
				],
			},
		],
	};
};
