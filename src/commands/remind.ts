import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { type CommandOptions } from "../util";

export const remind: CommandOptions<ApplicationCommandType.ChatInput> = {
	data: [
		{
			name: "remind",
			description: "Imposta un promemoria o gestisci quelli esistenti",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "me",
					description: "Imposta un promemoria",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "to",
							description: "Il promemoria da impostare (es. Fare la spesa)",
							type: ApplicationCommandOptionType.String,
							required: true,
							max_length: 1000,
						},
						{
							name: "in",
							description: "Tra quanto tempo te lo dovrò ricordare (es. 1d3h)",
							type: ApplicationCommandOptionType.String,
							required: true,
							max_length: 1024,
						},
					],
				},
				{
					name: "list",
					description: "Elenca i tuoi promemoria",
					type: ApplicationCommandOptionType.Subcommand,
				},
				{
					name: "remove",
					description: "Elimina un promemoria",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "id",
							description: "L'id del promemoria da eliminare",
							type: ApplicationCommandOptionType.String,
							required: true,
							min_length: 8,
							max_length: 8,
						},
					],
				},
			],
		},
	],
	run: async (reply) => {
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: "Comando in manutenzione",
				flags: MessageFlags.Ephemeral,
			},
		});
		// TODO: Re-add database to correctly list and limit workflows
		// const options = new Map<
		// 	string,
		// 	APIApplicationCommandInteractionDataOption
		// >();
		// const [subcommand] = interaction.data
		// 	.options as APIApplicationCommandInteractionDataSubcommandOption[];

		// ok(subcommand);
		// for (const option of subcommand.options!) options.set(option.name, option);
		// if (subcommand.name === "me") {
		// 	const { value: message } = options.get(
		// 		"to",
		// 	) as APIApplicationCommandInteractionDataStringOption;
		// 	const { value: date } = options.get(
		// 		"in",
		// 	) as APIApplicationCommandInteractionDataStringOption;
		// 	const duration = ms(date.replace(/\s+/g, "") as "0") || 0;

		// 	if (duration > 31_536_000_000) {
		// 		reply({
		// 			type: InteractionResponseType.ChannelMessageWithSource,
		// 			data: {
		// 				content: "Non puoi impostare una durata maggiore di 1 anno!",
		// 				flags: MessageFlags.Ephemeral,
		// 			},
		// 		});
		// 		return;
		// 	}
		// 	if (duration < 1_000) {
		// 		reply({
		// 			type: InteractionResponseType.ChannelMessageWithSource,
		// 			data: {
		// 				content: "Non puoi impostare una durata minore di 1 secondo!",
		// 				flags: MessageFlags.Ephemeral,
		// 			},
		// 		});
		// 		return;
		// 	}
		// 	if (message.length > 1_000) {
		// 		reply({
		// 			type: InteractionResponseType.ChannelMessageWithSource,
		// 			data: {
		// 				content:
		// 					"La lunghezza massima di un promemoria è di 1000 caratteri",
		// 				flags: MessageFlags.Ephemeral,
		// 			},
		// 		});
		// 		return;
		// 	}
		// 	const id = Array.from(
		// 		{ length: 8 },
		// 		() => Math.random().toString(36)[2],
		// 	).join("");
		// 	const userId = (interaction.user ?? interaction.member?.user)!.id;
		// 	const result = await env.REMINDER.create({
		// 		id: `${userId}-${id}`,
		// 		params: { message, duration, userId },
		// 	})
		// 		.then(() => {})
		// 		.catch(normalizeError);

		// 	if (result) {
		// 		reply({
		// 			type: InteractionResponseType.ChannelMessageWithSource,
		// 			data: {
		// 				content: `Si è verificato un errore: ${inlineCode(result.message)}`,
		// 				flags: MessageFlags.Ephemeral,
		// 			},
		// 		});
		// 		return;
		// 	}
		// 	reply({
		// 		type: InteractionResponseType.ChannelMessageWithSource,
		// 		data: {
		// 			content: `Promemoria \`${inlineCode(id)}\` impostato correttamente!`,
		// 			flags: MessageFlags.Ephemeral,
		// 		},
		// 	});
		// } else if (subcommand.name === "list") {
		// 	reply({
		// 		type: InteractionResponseType.DeferredChannelMessageWithSource,
		// 		data: { flags: MessageFlags.Ephemeral },
		// 	});
		// 	const client = new Cloudflare({
		// 		apiToken: env.CLOUDFLARE_API_TOKEN,
		// 	});
		// 	const reminderIds: Promise<Cloudflare.Workflows.Instances.InstanceGetResponse>[] =
		// 		[];
		// 	const userId = (interaction.user ?? interaction.member?.user)!.id;

		// 	for await (const instance of client.workflows.instances.list("reminder", {
		// 		account_id: env.CLOUDFLARE_ACCOUNT_ID,
		// 		status: "waiting",
		// 	}))
		// 		if (
		// 			instance.id.startsWith(`${userId}-`) &&
		// 			reminderIds.push(
		// 				client.workflows.instances.get("reminder", instance.id, {
		// 					account_id: env.CLOUDFLARE_ACCOUNT_ID,
		// 				}),
		// 			) === 5
		// 		)
		// 			break;
		// 	const reminders = (await Promise.all(
		// 		reminderIds,
		// 	)) as (Cloudflare.Workflows.Instances.InstanceGetResponse & {
		// 		params: Params;
		// 	})[];

		// 	await rest.patch(
		// 		Routes.webhookMessage(interaction.application_id, interaction.token),
		// 		{
		// 			body: {
		// 				embeds: reminders.length
		// 					? [
		// 							new EmbedBuilder()
		// 								.setTitle("⏰ Promemoria")
		// 								.setColor(0x5865f2)
		// 								.setDescription(
		// 									reminders
		// 										.map((r, i) => {
		// 											const seconds = Math.round(
		// 												(r.params.duration + Date.parse(r.start!)) / 1_000,
		// 											);

		// 											return `${i + 1}. ${time(seconds, TimestampStyles.LongDateTime)} (${time(seconds, TimestampStyles.RelativeTime)})\n${r.params.message.slice(0, 256).split("\n").map(quote).join("\n")}`;
		// 										})
		// 										.join("\n"),
		// 								)
		// 								.toJSON(),
		// 						]
		// 					: undefined,
		// 				content: reminders.length
		// 					? undefined
		// 					: "Non hai impostato alcun promemoria!",
		// 			} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
		// 		},
		// 	);
		// } else if (subcommand.name === "remove") {
		// 	const { value: id } = options.get(
		// 		"id",
		// 	) as APIApplicationCommandInteractionDataStringOption;
		// 	const instance = await env.REMINDER.get(
		// 		`${(interaction.user ?? interaction.member?.user)!.id}-${id}`,
		// 	).catch(() => {});

		// 	if (!instance) {
		// 		reply({
		// 			type: InteractionResponseType.ChannelMessageWithSource,
		// 			data: {
		// 				content: "Promemoria non trovato!",
		// 				flags: MessageFlags.Ephemeral,
		// 			},
		// 		});
		// 		return;
		// 	}
		// 	const error = await instance.terminate().catch(normalizeError);

		// 	if (error) {
		// 		reply({
		// 			type: InteractionResponseType.ChannelMessageWithSource,
		// 			data: {
		// 				content: `Si è verificato un errore: ${inlineCode(error.message)}`,
		// 				flags: MessageFlags.Ephemeral,
		// 			},
		// 		});
		// 		return;
		// 	}
		// 	reply({
		// 		type: InteractionResponseType.ChannelMessageWithSource,
		// 		data: {
		// 			content: "Promemoria rimosso correttamente!",
		// 			flags: MessageFlags.Ephemeral,
		// 		},
		// 	});
		// }
	},
};
