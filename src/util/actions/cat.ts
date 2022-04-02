import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type { WebhookEditMessageOptions } from "discord.js";
import { env } from "node:process";
import CustomClient from "../CustomClient";
import type { ActionMethod, CatResponse } from "../types";
import { createActionId } from "./actions";

/**
 * Get a cat image.
 */
export const cat: ActionMethod<"cat", WebhookEditMessageOptions> = () =>
	fetch(
		"https://api.thecatapi.com/v1/images/search&order=RANDOM&limit=1&format=json",
		{
			method: "GET",
			headers: {
				"x-api-key": env.CAT_API_KEY!,
			},
		}
	)
		.then<CatResponse>((res) => res.json())
		.then<Awaited<ReturnType<typeof cat>>>(([{ url }]) => ({
			content: `[Meow!](${url}) 🐱`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							url,
							style: ButtonStyle.Link,
							label: "Apri l'originale",
						},
						{
							type: ComponentType.Button,
							style: ButtonStyle.Success,
							label: "Un altro!",
							custom_id: createActionId("cat"),
							emoji: { name: "🐱" },
						},
					],
				},
			],
		}))
		.catch((error) => {
			void CustomClient.printToStderr(error);
			return {
				content: "Errore nella richiesta.",
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								style: ButtonStyle.Danger,
								label: "Riprova",
								custom_id: createActionId("cat"),
							},
						],
					},
				],
			};
		});
