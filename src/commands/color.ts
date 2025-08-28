import { inlineCode } from "@discordjs/formatters";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	type RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import {
	cssRound,
	resolveColor,
	resolveCommandOptions,
	type Color,
	type CommandOptions,
} from "../util";

export const color = {
	data: [
		{
			name: "color",
			description: "Scopri un colore!",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "name",
					description:
						"Nome del colore (es. red, #ff0000, rgb(255 0 0), hsl(0 100% 50%), hwb(0 0% 100%))",
					type: ApplicationCommandOptionType.String,
					required: true,
				},
			],
		},
	],
	run: async (reply, { interaction, host }) => {
		const { options } = resolveCommandOptions(color.data, interaction);
		let resolvedColor: Color;

		try {
			resolvedColor = resolveColor(options.name);
		} catch (err) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: `Colore non valido: ${inlineCode((err as Error).message)}`,
				} satisfies RESTPostAPIWebhookWithTokenJSONBody,
			});
			return;
		}
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				embeds: [
					{
						title: resolvedColor.name ?? resolvedColor.hex,
						fields: [
							{
								name: "HEX",
								value: resolvedColor.hex,
								inline: true,
							},
							{
								name: "RGB",
								value: `${resolvedColor.rgb.join(", ")}`,
								inline: true,
							},
							{
								name: "CMYK",
								value: `${cssRound(resolvedColor.cmyk[0])}%, ${cssRound(resolvedColor.cmyk[1])}%, ${cssRound(resolvedColor.cmyk[2])}%, ${cssRound(resolvedColor.cmyk[3])}%`,
								inline: true,
							},
							{
								name: "HWB",
								value: `${cssRound(resolvedColor.hwb[0])}°, ${cssRound(resolvedColor.hwb[1])}%, ${cssRound(resolvedColor.hwb[2])}%`,
								inline: true,
							},
							{
								name: "HSV",
								value: `${cssRound(resolvedColor.hsv[0])}°, ${cssRound(resolvedColor.hsv[1])}%, ${cssRound(resolvedColor.hsv[2])}%`,
								inline: true,
							},
							{
								name: "HSL",
								value: `${cssRound(resolvedColor.hsl[0])}°, ${cssRound(resolvedColor.hsl[1])}%, ${cssRound(resolvedColor.hsl[2])}%`,
								inline: true,
							},
						],
						color:
							(resolvedColor.rgb[0] << 16) +
							(resolvedColor.rgb[1] << 8) +
							resolvedColor.rgb[2],
						thumbnail: {
							url: `https://${host}/color?red=${resolvedColor.rgb[0]}&green=${resolvedColor.rgb[1]}&blue=${resolvedColor.rgb[2]}`,
							height: 256,
							width: 256,
						},
					},
				],
			} satisfies RESTPostAPIWebhookWithTokenJSONBody,
		});
	},
} as const satisfies CommandOptions<ApplicationCommandType.ChatInput>;
