import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
	type APIApplicationCommandOption,
	type APIInteraction,
	type APIInteractionResponse,
} from "discord-api-types/v10";
import { hexToUint8Array } from "../strings";
import { Awaitable } from "../types";
import type { Command } from "./Command";
import {
	ReplyTypes,
	type BaseArgs,
	type CommandRunners,
	type CreateObject,
	type Replies,
	type Reply,
} from "./types";

export class CommandHandler {
	#key?: CryptoKey;

	private interactionTypes: {
		[K in Exclude<InteractionType, InteractionType.Ping>]: {
			findCommand: (
				interaction: APIInteraction & { type: K },
			) => typeof Command | undefined;
			getRunner: (interaction: APIInteraction & { type: K }) => CommandRunners;
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
			getRunner: (interaction) =>
				interaction.data.type === ApplicationCommandType.ChatInput
					? "chatInput"
					: interaction.data.type === ApplicationCommandType.User
						? "user"
						: "message",
		},
		[InteractionType.MessageComponent]: {
			findCommand: (interaction) => {
				const [customId] = interaction.data.custom_id.split("-");

				return this.commands.find((c) => c.customId === customId);
			},
			getRunner: () => "component",
		},
		[InteractionType.ApplicationCommandAutocomplete]: {
			findCommand: (interaction) =>
				this.commands.find(
					(c) => c.chatInputData?.name === interaction.data.name,
				),
			getRunner: () => "autocomplete",
		},
		[InteractionType.ModalSubmit]: {
			findCommand: (interaction) => {
				const [customId] = interaction.data.custom_id.split("-");

				return this.commands.find((c) => c.customId === customId);
			},
			getRunner: () => "modal",
		},
	};

	private built: Record<string, Command> = {};

	constructor(public commands: (typeof Command)[]) {}

	async handleInteraction(
		request: Request,
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
		const Command = this.interactionTypes[interaction.type].findCommand(
			interaction as never,
		);
		if (!Command) return new Response(null, { status: 400 });
		const user = (interaction.member ?? interaction).user!;
		if (Command.private && !env.OWNER_ID.includes(user.id))
			return new Response(null, { status: 403 });
		const command = (this.built[Command.name] ??= new Command(this));
		console.log(
			`Interaction type: ${InteractionType[interaction.type]}, command: ${"name" in interaction.data ? interaction.data.name : interaction.data.custom_id}, user: ${user.username} (${user.id}), channel: ${interaction.channel?.name} (${interaction.channel?.id})`,
		);
		const { promise, resolve } =
			Promise.withResolvers<APIInteractionResponse>();
		const args = {
			interaction,
			request,
			user,
			subcommand: undefined as string | undefined,
			options: {} as Record<string, string | number | boolean>,
			args: [] as string[],
		};
		if (
			(interaction.type === InteractionType.ApplicationCommand ||
				interaction.type === InteractionType.ApplicationCommandAutocomplete) &&
			interaction.data.type === ApplicationCommandType.ChatInput
		) {
			let { options } = interaction.data;
			const subcommand: string[] = [];

			while (
				options?.[0]?.type === ApplicationCommandOptionType.SubcommandGroup ||
				options?.[0]?.type === ApplicationCommandOptionType.Subcommand
			) {
				subcommand.push(options[0].name);
				[{ options }] = options;
			}
			if (subcommand.length) args.subcommand = subcommand.join(" ");
			for (const element of options ?? [])
				if ("value" in element) args.options[element.name] = element.value;
		}
		if ("custom_id" in interaction.data)
			args.args = interaction.data.custom_id.split("-").slice(1);
		context.waitUntil(
			(
				command[
					this.interactionTypes[interaction.type].getRunner(
						interaction as never,
					)
				] as (
					replies: Replies,
					args: BaseArgs &
						CreateObject<APIApplicationCommandOption[], string | undefined> & {
							args: string[];
						},
				) => Promise<any>
			)(
				Object.fromEntries<Reply<InteractionResponseType>>(
					Object.entries(ReplyTypes).map(([key, type]) => [
						key,
						(data) => resolve({ type, data } as never),
					]),
				) as Replies,
				args,
			),
		);
		return new Response(JSON.stringify(await promise), {
			headers: { "Content-Type": "application/json" },
		});
	}
}
