import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type { WebhookEditMessageOptions } from "discord.js";
import { env } from "node:process";
import CustomClient from "../CustomClient";
import { fetch } from "../fetch";
import type { ActionMethod, CatResponse } from "../types";
import { ContentType } from "../types";
import { createActionId } from "./actions";

/**
 * Get a cat image.
 */
export const cat: ActionMethod<"cat", WebhookEditMessageOptions> = () =>
	fetch<CatResponse, ContentType.Json>(
		"https://api.thecatapi.com/v1/images/search?size=full&order=RANDOM&limit=1&format=json",
		{
			method: "GET",
			headers: {
				"x-api-key": env.CAT_API_KEY,
			},
			type: ContentType.Json,
		}
	)
		.then<Awaited<ReturnType<typeof cat>>>(({ data }) => ({
			content: `[Meow!](${data[0].url}) 🐱`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							url: data[0].url,
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
