import {
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
	type APIInteraction,
	type APIInteractionResponse,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { hexToUint8Array } from "../strings";
import { Awaitable, Env } from "../types";
import { ReplyTypes, type Command, type Replies, type Reply } from "./types";

export class CommandHandler {
	#key?: CryptoKey;

	private interactionTypes: {
		[K in Exclude<InteractionType, InteractionType.Ping>]: {
			findCommand: (
				interaction: APIInteraction & { type: K },
			) =>
				| Command<
						RESTPostAPIChatInputApplicationCommandsJSONBody,
						RESTPostAPIContextMenuApplicationCommandsJSONBody[]
				  >
				| undefined;
		};
	} = {
		[InteractionType.ApplicationCommand]: {
			findCommand: (interaction) =>
				this.commands.find(
					interaction.data.type === ApplicationCommandType.ChatInput
						? (c) => c.chatInputData?.name === interaction.data.name
						: (c) =>
								c.contextMenuData?.some(
									(d) => d.name === interaction.data.name,
								),
				),
		},
		[InteractionType.MessageComponent]: {
			findCommand: (interaction) => {
				const [customId] = interaction.data.custom_id.split("-");

				return this.commands.find((c) => c.customId === customId);
			},
		},
		[InteractionType.ApplicationCommandAutocomplete]: {
			findCommand: (interaction) =>
				this.commands.find(
					(c) => c.chatInputData?.name === interaction.data.name,
				),
		},
		[InteractionType.ModalSubmit]: {
			findCommand: (interaction) => {
				const [customId] = interaction.data.custom_id.split("-");

				return this.commands.find((c) => c.customId === customId);
			},
		},
	};

	constructor(
		public commands: Command<
			RESTPostAPIChatInputApplicationCommandsJSONBody,
			RESTPostAPIContextMenuApplicationCommandsJSONBody[]
		>[],
	) {}

	async handleInteraction(
		request: Request,
		env: Env,
		context: ExecutionContext,
	): Promise<Response> {
		let body: Awaitable<string> = request.text();
		{
			const signature = request.headers.get("x-signature-ed25519");
			const timestamp = request.headers.get("x-signature-timestamp");

			if (!signature || !timestamp) return new Response(null, { status: 401 });
			if (
				!(await crypto.subtle.verify(
					"Ed25519",
					(this.#key ??= await crypto.subtle.importKey(
						"raw",
						hexToUint8Array(env.DISCORD_PUBLIC_KEY),
						"Ed25519",
						false,
						["verify"],
					)),
					hexToUint8Array(signature),
					new TextEncoder().encode(timestamp + (body = await body)),
				))
			)
				return new Response(null, { status: 401 });
		}
		const interaction: APIInteraction = JSON.parse(body);

		if (interaction.type === InteractionType.Ping)
			return new Response(JSON.stringify({ type: InteractionType.Ping }), {
				headers: { "Content-Type": "application/json" },
			});
		const command = this.interactionTypes[interaction.type].findCommand(
			interaction as never,
		);
		if (!command) return new Response(null, { status: 400 });
		const user = (interaction.member ?? interaction).user!;
		if (command.private && !env.OWNER_ID.includes(user.id))
			return new Response(null, { status: 403 });
		console.log(
			`Interaction type: ${InteractionType[interaction.type]}, command: ${"name" in interaction.data ? interaction.data.name : interaction.data.custom_id}, user: ${user.username} (${user.id}), channel: ${interaction.channel?.name} (${interaction.channel?.id})`,
		);
		const { promise, resolve } =
			Promise.withResolvers<APIInteractionResponse>();
		const args = { interaction, request };
		context.waitUntil(
			command.chatInput?.call(
				Object.assign(command, { ctx: context, env }),
				Object.fromEntries<Reply<InteractionResponseType>>(
					Object.entries(ReplyTypes).map(([key, type]) => [
						key,
						(data) => resolve({ type, data }),
					]),
				) as Replies,
				args,
			) ?? Promise.resolve(),
		);
		return new Response(JSON.stringify(await promise), {
			headers: { "Content-Type": "application/json" },
		});
	}
}
