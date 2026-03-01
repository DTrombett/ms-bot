import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
	type WorkflowStepConfig,
} from "cloudflare:workers";
import {
	ButtonStyle,
	ComponentType,
	Routes,
	type APIEmbed,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { Clash } from "./commands/clash.ts";
import { bitSetMap } from "./util/bitSets.ts";
import { rest } from "./util/globals.ts";

export type UserResult = Pick<
	User,
	"id" | "clashNotifications" | "arena" | "cards" | "league"
> &
	Required<Pick<User, "clashTag">>;
export type PartialPlayer = Pick<User, "arena" | "cards" | "league"> &
	Pick<Clash.Player, "name">;
export enum NotificationType {
	"All" = 1 << 0,
	"New Arena" = 1 << 1,
	"New Card" = 1 << 2,
	"New Evo" = 1 << 3,
	"New League" = 1 << 4,
}
export type Params = { users: UserResult[] };

export class ClashNotifications extends WorkflowEntrypoint<Env, Params> {
	static config: WorkflowStepConfig = {
		retries: { limit: 1, delay: 5_000, backoff: "constant" },
	};

	override async run(
		{ payload: { users } }: WorkflowEvent<Params>,
		step: WorkflowStep,
	) {
		console.log(`Processing Clash Notifications for ${users.length} users`);
		const results = await Promise.allSettled(
			users.map(async (user) => {
				const { embeds, player } = await step.do(
					`Process user ${user.id}`,
					ClashNotifications.config,
					this.processUser.bind(this, user),
				);

				console.log(`User ${user.id} has ${embeds.length} notification(s)`);
				if (embeds.length)
					await step.do(
						`Send message for user ${user.id}`,
						ClashNotifications.config,
						this.sendMessage.bind(this, user, embeds, player),
					);
				return step.do(
					`Update user ${user.id} data`,
					ClashNotifications.config,
					this.updateUser.bind(this, user, player),
				);
			}),
		);
		const errors = [];

		for (const result of results)
			if (result.status === "rejected") {
				console.error(result.reason);
				errors.push(result.reason);
			}
		if (errors.length)
			throw new Error(
				`Failed to process Clash Notifications for ${errors.length} users`,
				{ cause: errors },
			);
	}

	private async processUser(
		user: UserResult,
	): Promise<{ embeds: APIEmbed[]; player: PartialPlayer }> {
		const player = await Clash.getPlayer(user.clashTag, { cache: false });
		const embeds: APIEmbed[] = [];

		if (
			(user.clashNotifications & NotificationType["New Arena"] ||
				user.clashNotifications & NotificationType["All"]) &&
			user.arena != null &&
			player.arena.id > user.arena
		)
			embeds.push({
				color: 0x5197ed,
				title: "Nuova arena raggiunta!",
				description: `Hai raggiunto **${player.arena.name}** (Arena ${
					player.achievements?.find((a) => a.name === "Road to Glory")?.value ??
					"sconosciuta"
				})!`,
			});
		if (
			(user.clashNotifications & NotificationType["New League"] ||
				user.clashNotifications & NotificationType["All"]) &&
			user.league != null &&
			player.currentPathOfLegendSeasonResult &&
			player.currentPathOfLegendSeasonResult.leagueNumber > user.league
		)
			embeds.push({
				color: 0xee82ee,
				title: "Nuova lega raggiunta!",
				description: `Hai raggiunto la **Lega ${player.currentPathOfLegendSeasonResult.leagueNumber}** in Modalità Classificata!`,
			});
		if (
			user.clashNotifications & NotificationType["New Card"] ||
			user.clashNotifications & NotificationType["New Evo"] ||
			user.clashNotifications & NotificationType["All"]
		) {
			const oldCards = await Promise.try<
				Pick<Clash.PlayerItemLevel, "id" | "evolutionLevel">[],
				Parameters<typeof JSON.parse>
			>(JSON.parse, user.cards ?? "[]").catch(() => {});

			if (oldCards?.length)
				for (const card of player.cards) {
					const oldCard = oldCards.find((b) => b.id === card.id);

					if (
						!oldCard &&
						(card.rarity === "champion" || card.rarity === "legendary") &&
						(user.clashNotifications & NotificationType["New Card"] ||
							user.clashNotifications & NotificationType["All"])
					)
						embeds.push({
							title: `Hai trovato ${
								card.rarity === "champion" ?
									"un nuovo campione"
								:	"una nuova leggendaria"
							}!`,
							description: `Hai sbloccato **${card.name}**!`,
							thumbnail: { url: card.iconUrls?.medium ?? "" },
						});
					if (
						user.clashNotifications & NotificationType["New Evo"] ||
						user.clashNotifications & NotificationType["All"]
					)
						embeds.push(
							...bitSetMap<APIEmbed | null>(
								(card.evolutionLevel ?? 0) ^ (oldCard?.evolutionLevel ?? 0),
								(evo) =>
									evo ?
										{
											color: 0xa312ef,
											title: "Nuova evoluzione sbloccata!",
											description: `Hai sbloccato l'evoluzione per **${card.name}**!`,
											thumbnail: {
												url:
													card.iconUrls?.evolutionMedium ??
													card.iconUrls?.medium ??
													"",
											},
										}
									:	null,
								(hero) =>
									hero ?
										{
											color: 0xffd700,
											title: "Nuovo eroe sbloccato!",
											description: `Hai sbloccato **${card.name}** eroe!`,
											thumbnail: {
												url:
													card.iconUrls?.heroMedium ??
													card.iconUrls?.medium ??
													"",
											},
										}
									:	null,
							),
						);
				}
		}
		return {
			embeds,
			player: {
				name: player.name,
				arena: player.arena.id,
				league: player.currentPathOfLegendSeasonResult?.leagueNumber,
				cards: JSON.stringify(
					player.cards?.map((b) => ({
						id: b.id,
						evolutionLevel: b.evolutionLevel,
					})) ?? [],
				),
			},
		};
	}

	private async sendMessage(
		user: UserResult,
		embeds: APIEmbed[],
		player: Pick<Clash.Player, "name">,
	) {
		await rest.post(Routes.channelMessages(this.env.CLASH_ROYALE_CHANNEL), {
			body: {
				content: `[**${player.name}**](${Clash.buildURL(
					`playerInfo?id=${user.clashTag.slice(1)}`,
				)}) (<@${
					user.id
				}>) ha raggiunto nuovi traguardi!\n-# Usa il comando \`/clash notify\` per gestire le notifiche`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								style: ButtonStyle.Secondary,
								custom_id: `clash-player--${user.clashTag}`,
								label: "Visualizza il profilo",
								emoji: { name: "👤" },
							},
						],
					},
				],
				embeds: embeds.slice(0, 10),
				allowed_mentions: { parse: [] },
			} satisfies RESTPostAPIChannelMessageJSONBody,
		});
	}

	private async updateUser(user: UserResult, player: PartialPlayer) {
		await this.env.DB.prepare(
			`UPDATE Users
				SET arena = ?1,
					league = ?2,
					cards = ?3
				WHERE id = ?4`,
		)
			.bind(player.arena, player.league, player.cards, user.id)
			.run();
	}
}
