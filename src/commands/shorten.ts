import Cloudflare from "cloudflare";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import nacl from "tweetnacl";
import {
	CommandOptions,
	normalizeError,
	resolveCommandOptions,
	rest,
} from "../util";

export const shorten = {
	data: [
		{
			name: "shorten",
			description: "Shorten a url",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "create",
					description: "Create a new short url",
					options: [
						{
							type: ApplicationCommandOptionType.String,
							name: "url",
							description: "The destination address",
							required: true,
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "source",
							description: "The path of the url (default: random 8 bytes)",
						},
						{
							type: ApplicationCommandOptionType.Integer,
							name: "status",
							description: "The status code to send (default: 301)",
							choices: [
								{ name: "301", value: 301 },
								{ name: "302", value: 302 },
								{ name: "307", value: 307 },
								{ name: "308", value: 308 },
							],
						},
						{
							type: ApplicationCommandOptionType.Boolean,
							name: "preserve-query",
							description: "Preserve the source query (default: false)",
						},
						{
							type: ApplicationCommandOptionType.Boolean,
							name: "preserve-path",
							description: "Preserve the path suffix (default: false)",
						},
					],
				},
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "delete",
					description: "Delete a short url",
					options: [
						{
							type: ApplicationCommandOptionType.String,
							name: "id",
							description: "The path or the complete url",
						},
					],
				},
			],
		},
	],
	isPrivate: true,
	run: async (reply, { env, interaction }) => {
		const { subcommand, options } = resolveCommandOptions(
			shorten.data,
			interaction,
		);
		const client = new Cloudflare({ apiToken: env.CLOUDFLARE_API_TOKEN });

		if (subcommand === "create") {
			reply({
				type: InteractionResponseType.DeferredChannelMessageWithSource,
				data: { flags: MessageFlags.Ephemeral },
			});
			const source_url = `s.trombett.org/${options.source ?? Buffer.from(nacl.randomBytes(8)).toString("base64url")}`;
			const err = await client.rules.lists.items
				.create(env.BULK_LIST_ID, {
					account_id: env.CLOUDFLARE_ACCOUNT_ID,
					body: [
						{
							redirect: {
								source_url,
								target_url: options.url,
								preserve_path_suffix: options["preserve-path"],
								preserve_query_string: options["preserve-query"],
								status_code: options.status,
								subpath_matching: true,
							},
						},
					],
				})
				.then(() => {})
				.catch(normalizeError);

			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						// When the message is sent the url is still not ready so <> avoid Discord trying to resolve it and caching the 404
						content: err ? err.message : `<https://${source_url}>`,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		} else
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { flags: MessageFlags.Ephemeral, content: "Not implemented" },
			});
	},
} as const satisfies CommandOptions<ApplicationCommandType.ChatInput>;
