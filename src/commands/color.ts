import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	MessageFlags,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
	Command,
	cssRound,
	resolveColor,
	type ChatInputArgs,
	type ChatInputReplies,
} from "../util";

export class Color extends Command {
	static override chatInputData = {
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
	} as const satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	override async chatInput(
		{ reply }: ChatInputReplies,
		{
			options: { name },
			request: { url },
		}: ChatInputArgs<typeof Color.chatInputData>,
	) {
		const resolvedColor = await Promise.try(resolveColor, name).catch(
			(err: Error) =>
				reply({
					content: `Colore non valido: \`${err.message}\``,
					flags: MessageFlags.Ephemeral,
				}),
		);

		if (resolvedColor)
			reply({
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
								value: resolvedColor.rgb.join(", "),
								inline: true,
							},
							{
								name: "CMYK",
								value: resolvedColor.cmyk
									.map((v) => `${cssRound(v)}%`)
									.join(", "),
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
							url: `https://${new URL(url).host}/color?red=${resolvedColor.rgb[0]}&green=${resolvedColor.rgb[1]}&blue=${resolvedColor.rgb[2]}`,
							height: 256,
							width: 256,
						},
					},
				],
			});
	}
}
