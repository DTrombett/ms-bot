import { time, TimestampStyles } from "@discordjs/formatters";
import Cloudflare from "cloudflare";
import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	Routes,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
} from "discord-api-types/v10";
import { rest, type Env } from "./util";

export type Params = {
	url: string;
	duration: number;
	source: string;
	status?: 301 | 302 | 307 | 308;
	preserveQuery?: boolean;
	preservePath?: boolean;
	interaction: {
		application_id: string;
		token: string;
	};
};

export class Shorten extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		const client = new Cloudflare({ apiToken: this.env.CLOUDFLARE_API_TOKEN });

		await step.do<void>(
			"Create short url",
			this.shorten.bind(this, client, event.payload),
		);
		rest.setToken(this.env.DISCORD_TOKEN);
		await step.do<void>(
			"Update message",
			this.updateMessage.bind(this, event.payload),
		);
		if (event.payload.duration === Infinity) return;
		await step.sleep("Sleep", event.payload.duration);
		await step.do<void>(
			"Delete short url",
			this.deleteUrl.bind(
				this,
				client,
				await step.do(
					"Get id",
					this.getId.bind(this, client, event.payload.source),
				),
			),
		);
	}

	private async shorten(client: Cloudflare, options: Params) {
		await client.rules.lists.items.create(this.env.BULK_LIST_ID, {
			account_id: this.env.CLOUDFLARE_ACCOUNT_ID,
			body: [
				{
					redirect: {
						source_url: `s.trombett.org/${options.source}`,
						target_url: options.url,
						preserve_path_suffix: options.preservePath,
						preserve_query_string: options.preserveQuery,
						status_code: options.status,
						subpath_matching: true,
					},
				},
			],
		});
	}

	private async updateMessage(options: Params) {
		const seconds = Math.round((Date.now() + options.duration) / 1000);

		await rest.patch(
			Routes.webhookMessage(
				options.interaction.application_id,
				options.interaction.token,
			),
			{
				body: {
					// When the message is sent the url may not be ready so avoid Discord caching the 404
					content: `Shortened url: <https://s.trombett.org/${options.source}>\n${
						options.duration === Infinity
							? "No expire time"
							: `Valid until ${time(seconds, TimestampStyles.LongDateTime)} (${time(seconds, TimestampStyles.RelativeTime)})`
					}`,
				} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			},
		);
	}

	private async getId(client: Cloudflare, source: string) {
		const { result } = await client.rules.lists.items.list(
			this.env.BULK_LIST_ID,
			{
				account_id: this.env.CLOUDFLARE_ACCOUNT_ID,
				search: `s.trombett.org/${source}`,
			},
		);

		return result.find(
			(r) => r.redirect?.source_url === `s.trombett.org/${source}`,
		)!.id!;
	}

	private async deleteUrl(client: Cloudflare, id: string) {
		await client.rules.lists.items.delete(
			this.env.BULK_LIST_ID,
			{ account_id: this.env.CLOUDFLARE_ACCOUNT_ID },
			{ body: { items: [{ id }] } },
		);
	}
}
