import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import { request } from "https";
import { env } from "node:process";
import CustomClient from "../CustomClient";
import type { ActionMethod, DogResponse } from "../types";
import { createActionId } from "./actions";

/**
 * Get a dog image.
 */
export const dog: ActionMethod<"dog"> = async () =>
	new Promise((resolve) => {
		request(
			{
				method: "GET",
				hostname: "api.thedogapi.com",
				path: "/v1/images/search?size=full&order=RANDOM&limit=1&format=json",
				headers: {
					"x-api-key": env.DOG_API_KEY,
				},
			},
			(res) => {
				let data = "";

				res
					.on("data", (d) => (data += d))
					.once("end", () => {
						const response: DogResponse = JSON.parse(data);

						resolve({
							content: `[Woof!](${response[0].url}) 🐶`,
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
											custom_id: createActionId("dog"),
											emoji: { name: "🐶" },
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
											custom_id: createActionId("dog"),
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
