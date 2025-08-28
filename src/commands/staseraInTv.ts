import { EmbedBuilder } from "@discordjs/builders";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import { JSDOM } from "jsdom";
import { resolveCommandOptions, rest, type CommandOptions } from "../util";

export const staseraInTv = {
	data: [
		{
			name: "stasera-in-tv",
			description: "Che programmi ci sono stasera in TV?",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					description: "Il tipo di serata",
					name: "serata",
					type: ApplicationCommandOptionType.String,
					choices: [
						{ name: "1ª Serata (default)", value: "index" },
						{ name: "2ª Serata", value: "seconda_serata_stasera" },
						{ name: "Notte", value: "programmi_tv_notte_stasera" },
					],
				},
				{
					description: "La categoria di programmi",
					name: "categoria",
					type: ApplicationCommandOptionType.Number,
					choices: [
						{ name: "Sport", value: 5 },
						{ name: "Kids", value: 6 },
						{ name: "Docs", value: 7 },
						{ name: "Sky", value: 8 },
					],
				},
			],
		},
	],
	run: async (reply, { interaction }) => {
		reply({ type: InteractionResponseType.DeferredChannelMessageWithSource });
		const { options } = resolveCommandOptions(staseraInTv.data, interaction);
		const html = await fetch(
			`https://www.staseraintv.com/${options.serata ?? "index"}${options.categoria ?? 1}.html`,
		).then((res) => res.text());
		const { document, HTMLAnchorElement } = new JSDOM(html).window;

		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: {
					embeds: [...document.querySelectorAll(".thumbprevbox")].map((el) => {
						const canale = el.querySelector(".stb1");

						return new EmbedBuilder()
							.setAuthor({
								name: `${canale?.textContent.trim()}`,
								url:
									canale instanceof HTMLAnchorElement ? canale.href : undefined,
							})
							.setTitle(
								el
									.querySelector("table table table:nth-child(2)")
									?.textContent.trim() ?? null,
							)
							.setDescription(
								el
									.querySelector(".prgpreviewtext")
									?.childNodes[0]?.textContent?.trim() ?? null,
							)
							.setThumbnail(el.querySelector("img")?.src ?? null)
							.setFooter({
								text: `Inizio programma: ${el.querySelector("big")?.textContent.trim()} - Canale ${el.querySelector(".numerocanale")?.textContent.trim()}`,
							})
							.toJSON();
					}),
				} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			},
		);
	},
} as const satisfies CommandOptions<ApplicationCommandType.ChatInput>;
