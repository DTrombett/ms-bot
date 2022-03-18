import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import { request } from "https";
import { env } from "node:process";
import CustomClient from "../CustomClient";
import type { ActionMethod, CatResponse } from "../types";
import { createActionId } from "./actions";

/**
 * Get a cat image.
 */
export const cat: ActionMethod<"cat"> = async () =>
	new Promise((resolve) => {
		request(
			{
				method: "GET",
				hostname: "api.thecatapi.com",
				path: "/v1/images/search?size=full&order=RANDOM&limit=1&format=json",
				headers: {
					"x-api-key": env.CAT_API_KEY,
				},
			},
			(res) => {
				let data = "";

				res
					.on("data", (d) => (data += d))
					.once("end", () => {
						const response: CatResponse = JSON.parse(data);

						resolve({
							content: `[Meow!](${response[0].url}) 🐱`,
							components: [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.Button,
											url: response[0].url,
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
						});
					})
					.once("error", (error) => {
						void CustomClient.printToStderr(error);
						resolve({
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
							ephemeral: true,
						});
					});
			}
		).end();
	});
