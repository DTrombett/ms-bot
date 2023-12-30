import {
	APIApplicationCommandInteractionDataStringOption,
	APIMessage,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
	Routes,
} from "discord-api-types/v10";
import { createCommand } from "../util";

export const poll = createCommand({
	data: [
		{
			name: "poll",
			description: "Crea un sondaggio",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "question",
					description: "La domanda da porre",
					type: ApplicationCommandOptionType.String,
					required: true,
					min_length: 1,
					max_length: 256,
				},
			],
		},
	],
	async run(interaction, { reply }) {
		const title = interaction.data.options
			?.find(
				(o): o is APIApplicationCommandInteractionDataStringOption =>
					o.name === "question" &&
					o.type === ApplicationCommandOptionType.String,
			)
			?.value.trim();

		if (!title?.length) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Domanda non valida!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const user = interaction.user ?? interaction.member!.user;

		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				embeds: [
					{
						title,
						author: {
							name: user.username,
							icon_url:
								user.avatar == null
									? this.api.cdn.defaultAvatar(
											user.discriminator === "0"
												? Number(BigInt(user.id) >> 22n) % 6
												: Number(user.discriminator) % 5,
										)
									: this.api.cdn.avatar(user.id, user.avatar, {
											size: 4096,
											extension: "png",
										}),
						},
						color: 0xfd6500,
						description: "- ✅ ** Sì**\n- ❌ ** No**",
						timestamp: new Date().toISOString(),
					},
				],
			},
		});
		const original = (await this.api.get(
			Routes.webhookMessage(interaction.application_id, interaction.token),
		)) as APIMessage;

		await Promise.all([
			this.api.put(
				Routes.channelMessageOwnReaction(
					original.channel_id,
					original.id,
					"✅",
				),
			),
			this.api.put(
				Routes.channelMessageOwnReaction(
					original.channel_id,
					original.id,
					"❌",
				),
			),
		]);
	},
});
