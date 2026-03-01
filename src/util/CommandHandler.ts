import { env, waitUntil } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
	Routes,
	type APIInteraction,
	type APIInteractionResponse,
	type APIUser,
	type RoutesDeclarations,
} from "discord-api-types/v10";
import type { Command } from "../Command";
import { rest } from "./globals";
import { hexToUint8Array } from "./strings";
import { TimeUnit } from "./time";

const discordKey = await crypto.subtle.importKey(
	"raw",
	hexToUint8Array(env.DISCORD_PUBLIC_KEY),
	"Ed25519",
	false,
	["verify"],
);

export class CommandHandler {
	static ReplyTypes = {
		reply: InteractionResponseType.ChannelMessageWithSource,
		defer: InteractionResponseType.DeferredChannelMessageWithSource,
		modal: InteractionResponseType.Modal,
		autocomplete: InteractionResponseType.ApplicationCommandAutocompleteResult,
		update: InteractionResponseType.UpdateMessage,
		deferUpdate: InteractionResponseType.DeferredMessageUpdate,
	} as const;
	private static readonly replies = Object.entries(CommandHandler.ReplyTypes);
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
					interaction.data.type === ApplicationCommandType.ChatInput ?
						(c) => c.chatInputData?.name === interaction.data.name
					:	(c) =>
							c.contextMenuData?.some((d) => d.name === interaction.data.name),
				),
			getRunner: (interaction) =>
				interaction.data.type === ApplicationCommandType.ChatInput ? "chatInput"
				: interaction.data.type === ApplicationCommandType.User ? "user"
				: "message",
		},
		[InteractionType.MessageComponent]: {
			findCommand: (interaction) => {
				const [customId] = interaction.data.custom_id.split("-");

				return this.commands.find(
					(c) => (c.customId ?? c.name.toLowerCase()) === customId,
				);
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

				return this.commands.find(
					(c) => (c.customId ?? c.name.toLowerCase()) === customId,
				);
			},
			getRunner: () => "modal",
		},
	};

	constructor(public commands: (typeof Command)[]) {}

	async verifySignature(request: Request): Promise<APIInteraction> {
		const signature = request.headers.get("x-signature-ed25519");
		const timestamp = request.headers.get("x-signature-timestamp");
		if (
			!signature ||
			!timestamp ||
			Date.now() - +timestamp * TimeUnit.Second > 20 * TimeUnit.Second
		) {
			console.log(
				`Timestamp too old: ${Date.now() - +timestamp! * TimeUnit.Second}`,
			);
			throw new Response(null, { status: 401 });
		}
		const body = await request.text();

		if (
			await crypto.subtle.verify(
				"Ed25519",
				discordKey,
				hexToUint8Array(signature),
				new TextEncoder().encode(timestamp + body),
			)
		)
			return JSON.parse(body) as APIInteraction;
		console.log("Invalid signature");
		throw new Response(null, { status: 401 });
	}

	async handleInteraction(request: Request): Promise<Response> {
		const interaction = await this.verifySignature(request);
		if (interaction.type === InteractionType.Ping)
			return Response.json({ type: 1 });
		const Command = this.interactionTypes[interaction.type].findCommand(
			interaction as never,
		);

		if (!Command) return new Response(null, { status: 400 });
		const user = (interaction.member ?? interaction).user!;
		if (Command.private && !env.OWNER_ID.includes(user.id))
			return new Response(null, { status: 403 });
		console.log(
			`Interaction type: ${InteractionType[interaction.type]}, command: ${
				"name" in interaction.data ?
					interaction.data.name
				:	interaction.data.custom_id
			}, user: ${user.username} (${user.id}), channel: ${
				interaction.channel?.name
			} (${interaction.channel?.id})`,
		);
		const { promise, resolve } =
			Promise.withResolvers<APIInteractionResponse>();
		const args: {
			interaction: APIInteraction;
			request: Request;
			user: APIUser;
			subcommand?: string;
			options?: Record<string, string | number | boolean>;
			args?: string[];
			fullRoute: ReturnType<RoutesDeclarations["webhookMessage"]>;
		} = {
			interaction,
			request,
			user,
			fullRoute: Routes.webhookMessage(
				interaction.application_id,
				interaction.token,
			),
		};
		if (
			(interaction.type === InteractionType.ApplicationCommand ||
				interaction.type === InteractionType.ApplicationCommandAutocomplete) &&
			interaction.data.type === ApplicationCommandType.ChatInput
		) {
			let { options } = interaction.data;
			const subcommand: string[] = [];

			args.options = {};
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
		let runner: Runner;

		if (
			args.subcommand &&
			args.subcommand in Command &&
			typeof Command[args.subcommand as never] === "function" &&
			![
				"user",
				"message",
				"component",
				"modal",
				"autocomplete",
				"chatInput",
			].includes(args.subcommand)
		)
			runner = Command[args.subcommand as never];
		else if (
			args.args?.[0] &&
			args.args[0] in Command &&
			Command.supportComponentMethods &&
			typeof Command[args.args[0] as never] === "function"
		)
			runner = Command[args.args.shift() as never];
		else
			runner =
				Command[
					this.interactionTypes[interaction.type].getRunner(
						interaction as never,
					) as never
				];
		waitUntil(
			runner
				.call(
					Command,
					{
						...Object.fromEntries<Reply<InteractionResponseType>>(
							CommandHandler.replies.map(([key, type]) => [
								key,
								(data) => resolve({ type, data } as never),
							]),
						),
						edit: (body) =>
							rest.patch(args.fullRoute, { body }).catch(console.error),
						delete: () => rest.delete(args.fullRoute).catch(console.error),
						followup: (body) =>
							rest
								.post(
									Routes.webhook(interaction.application_id, interaction.token),
									{ body },
								)
								.catch(console.error),
					} as Replies,
					args,
				)
				?.catch(console.error),
		);
		return Response.json(await promise);
	}
}
