import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
	type WorkflowStepConfig,
} from "cloudflare:workers";
import {
	ButtonStyle,
	ComponentType,
	MessageFlags,
	Routes,
	type APIMessageTopLevelComponent,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { Clash } from "./commands/clash.ts";
import { bitSetMap } from "./util/bitSets.ts";
import { rest } from "./util/rest.ts";

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
				const { components, player } = await step.do(
					`Process user ${user.id}`,
					ClashNotifications.config,
					this.processUser.bind(this, user),
				);

				console.log(`User ${user.id} has ${components.length} notification(s)`);
				if (components.length)
					await step.do(
						`Send message for user ${user.id}`,
						ClashNotifications.config,
						this.sendMessage.bind(this, user, components, player),
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

	private async processUser(user: UserResult): Promise<{
		components: APIMessageTopLevelComponent[];
		player: PartialPlayer;
	}> {
		const player = await Clash.getPlayer(user.clashTag);
		const components: APIMessageTopLevelComponent[] = [];

		if (
			(user.clashNotifications & NotificationType["New Arena"] ||
				user.clashNotifications & NotificationType["All"]) &&
			user.arena != null &&
			player.arena.id > user.arena
		)
			components.push({
				type: ComponentType.Container,
				accent_color: 0x5197ed,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `## Nuova arena raggiunta!\nHai raggiunto **${
							player.arena.name
						}** (Arena ${
							player.achievements?.find((a) => a.name === "Road to Glory")
								?.value ?? "sconosciuta"
						})!`,
					},
				],
			});
		if (
			(user.clashNotifications & NotificationType["New League"] ||
				user.clashNotifications & NotificationType["All"]) &&
			user.league != null &&
			player.currentPathOfLegendSeasonResult &&
			player.currentPathOfLegendSeasonResult.leagueNumber > user.league
		)
			components.push({
				type: ComponentType.Container,
				accent_color: 0xee82ee,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `## Nuova lega raggiunta!\nHai raggiunto la **Lega ${player.currentPathOfLegendSeasonResult.leagueNumber}** in modalità classificata!`,
					},
				],
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

			if (oldCards)
				for (const card of player.cards) {
					const oldCard = oldCards.find((b) => b.id === card.id);

					if (
						!oldCard &&
						(card.rarity === "champion" || card.rarity === "legendary") &&
						(user.clashNotifications & NotificationType["New Card"] ||
							user.clashNotifications & NotificationType["All"])
					)
						components.push({
							type: ComponentType.Container,
							components: [
								{
									type: ComponentType.Section,
									components: [
										{
											type: ComponentType.TextDisplay,
											content: `## Hai trovato ${
												card.rarity === "champion"
													? "un nuovo campione"
													: "una nuova leggendaria"
											}!\nHai sbloccato **${card.name}**!`,
										},
									],
									accessory: {
										type: ComponentType.Thumbnail,
										media: { url: card.iconUrls?.medium ?? "" },
									},
								},
							],
						});
					if (
						user.clashNotifications & NotificationType["New Evo"] ||
						user.clashNotifications & NotificationType["All"]
					)
						components.push(
							...bitSetMap<APIMessageTopLevelComponent | null>(
								(card.evolutionLevel ?? 0) ^ (oldCard?.evolutionLevel ?? 0),
								(evo) =>
									evo
										? {
												type: ComponentType.Container,
												accent_color: 0xa312ef,
												components: [
													{
														type: ComponentType.Section,
														components: [
															{
																type: ComponentType.TextDisplay,
																content: `## Nuova evoluzione sbloccata!\nHai sbloccato l'evoluzione per **${card.name}**!`,
															},
														],
														accessory: {
															type: ComponentType.Thumbnail,
															media: {
																url:
																	card.iconUrls?.evolutionMedium ??
																	card.iconUrls?.medium ??
																	"",
															},
														},
													},
												],
										  }
										: null,
								(hero) =>
									hero
										? {
												type: ComponentType.Container,
												accent_color: 0xffd700,
												components: [
													{
														type: ComponentType.Section,
														components: [
															{
																type: ComponentType.TextDisplay,
																content: `## Nuovo eroe sbloccato!\nHai sbloccato **${card.name}** eroe!`,
															},
														],
														accessory: {
															type: ComponentType.Thumbnail,
															media: {
																url:
																	card.iconUrls?.heroMedium ??
																	card.iconUrls?.medium ??
																	"",
															},
														},
													},
												],
										  }
										: null,
							),
						);
				}
		}
		return {
			components,
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
		components: APIMessageTopLevelComponent[],
		player: Pick<Clash.Player, "name">,
	) {
		await rest.post(Routes.channelMessages(this.env.CLASH_ROYALE_CHANNEL), {
			body: {
				flags: MessageFlags.IsComponentsV2,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `[**${player.name}**](${Clash.buildURL(
							`playerInfo?id=${user.clashTag.slice(1)}`,
						)}) ha raggiunto nuovi traguardi!`,
					},
					...components.slice(0, 9),
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
					{
						type: ComponentType.TextDisplay,
						content: `-# <@${user.id}> usa il comando \`/clash notify\` per gestire le tue notifiche`,
					},
				],
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
