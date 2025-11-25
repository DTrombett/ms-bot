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
	type APIContainerComponent,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { Clash } from "./commands/clash.ts";
import { escapeMarkdown } from "./util/formatters.ts";
import { rest } from "./util/rest.ts";

export type UserResult = Pick<
	User,
	"id" | "clashNotifications" | "arena" | "cards" | "league"
> &
	Required<Pick<User, "clashTag">> & { arenaNumber?: number };
export type PartialPlayer = Pick<Clash.Player, "name" | "bestTrophies"> & {
	cards?: Pick<Clash.PlayerItemLevel, "id" | "evolutionLevel">[];
};
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

	private async processUser(
		user: UserResult,
	): Promise<{ components: APIContainerComponent[]; player: PartialPlayer }> {
		const player: PartialPlayer = await Clash.getPlayer(user.clashTag);
		const components: APIContainerComponent[] = [];

		if (
			(user.clashNotifications & NotificationType["New Arena"] ||
				user.clashNotifications & NotificationType["All"]) &&
			user.arena != null
		) {
			const tier =
				ClashNotifications.trophyRoadTiers.findLast(
					(tier) => tier <= player.highestTrophies,
				) ?? 0;

			if (
				tier >
				(ClashNotifications.trophyRoadTiers.findLast(
					(tier) => tier <= user.clashTrophies!,
				) ?? 0)
			)
				components.push({
					type: ComponentType.Container,
					accent_color: player.nameColor
						? parseInt(player.nameColor.slice(4), 16)
						: 0xffffff,
					components: [
						{
							type: ComponentType.Section,
							components: [
								{
									type: ComponentType.TextDisplay,
									content: `## Avanzamento Cammino dei Trofei!\nHai raggiunto il traguardo di **${tier.toLocaleString(
										"it-IT",
									)}** trofei!`,
								},
							],
							accessory: {
								type: ComponentType.Thumbnail,
								media: {
									url: `https://cdn.brawlify.com/profile-icons/regular/${player.icon.id}.png`,
								},
							},
						},
					],
				});
		}
		if (
			user.clashNotifications & NotificationType["New Brawler"] ||
			user.clashNotifications & NotificationType["Brawler Tier Max"] ||
			user.clashNotifications & NotificationType["All"]
		) {
			const oldBrawlers = await Promise.try<
				Pick<Brawl.BrawlerStat, "id" | "rank">[],
				Parameters<typeof JSON.parse>
			>(JSON.parse, user.cards ?? "[]").catch(() => {});

			if (oldBrawlers)
				for (const brawler of player.cards) {
					const rank = oldBrawlers.find((b) => b.id === brawler.id)?.rank;

					if (
						rank == null &&
						(user.clashNotifications & NotificationType["New Brawler"] ||
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
											content: `## Nuovo Brawler sbloccato!\nHai sbloccato **${brawler.name}**!`,
										},
									],
									accessory: {
										type: ComponentType.Thumbnail,
										media: {
											url: `https://cdn.brawlify.com/cards/borderless/${brawler.id}.png`,
										},
									},
								},
							],
						});
					if (
						rank !== 51 &&
						brawler.rank === 51 &&
						(user.clashNotifications & NotificationType["Brawler Tier Max"] ||
							user.clashNotifications & NotificationType["All"])
					)
						components.push({
							type: ComponentType.Container,
							accent_color: 0xd7faff,
							components: [
								{
									type: ComponentType.Section,
									components: [
										{
											type: ComponentType.TextDisplay,
											content: `## Nuovo Brawler al Rank Massimo!\nHai portato **${brawler.name}** a 1.000 trofei!`,
										},
									],
									accessory: {
										type: ComponentType.Thumbnail,
										media: {
											url: `https://cdn.brawlify.com/cards/borderless/${brawler.id}.png`,
										},
									},
								},
							],
						});
				}
		}
		return {
			components,
			player: {
				name: player.name,
				cards: player.cards.map(({ id, rank, name }) => ({
					id,
					rank,
					name,
				})),
				highestTrophies: player.highestTrophies,
				icon: player.icon,
				nameColor: player.nameColor,
			},
		};
	}

	private async sendMessage(
		user: UserResult,
		components: APIContainerComponent[],
		player: Pick<Clash.Player, "name">,
	) {
		await rest.post(Routes.channelMessages(this.env.BRAWL_STARS_CHANNEL), {
			body: {
				flags: MessageFlags.IsComponentsV2,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `[**${escapeMarkdown(
							player.name,
						)}**](https://link.clashroyale.com?clashroyale://playerInfo?id=${user.clashTag.slice(
							1,
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
				SET clashTrophies = ?1,
					cards = ?2
				WHERE id = ?3`,
		)
			.bind(
				player.highestTrophies,
				JSON.stringify(player.cards.map(({ id, rank }) => ({ id, rank }))),
				user.id,
			)
			.run();
	}
}
