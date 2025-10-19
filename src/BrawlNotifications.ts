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
import { Brawl } from "./commands/brawl.ts";
import { escapeMarkdown } from "./util/formatters.ts";
import { rest } from "./util/rest.ts";

export type UserResult = Pick<
	User,
	"id" | "brawlNotifications" | "brawlTrophies" | "brawlers"
> &
	Required<Pick<User, "brawlTag">>;
export type PartialPlayer = Pick<
	Brawl.Player,
	"name" | "highestTrophies" | "nameColor" | "icon"
> & { brawlers: Pick<Brawl.BrawlerStat, "id" | "rank" | "name">[] };
export enum NotificationType {
	"All" = 1 << 0,
	"Brawler Tier Max" = 1 << 1,
	"New Brawler" = 1 << 2,
	"Trophy Road Advancement" = 1 << 3,
}
export type Params = { users: UserResult[] };

export class BrawlNotifications extends WorkflowEntrypoint<Env, Params> {
	static readonly trophyRoadTiers = [
		500, 1_500, 5_000, 10_000, 15_000, 20_000, 25_000, 30_000, 40_000, 50_000,
		60_000, 70_000, 80_000, 90_000, 100_000,
	];
	static config: WorkflowStepConfig = {
		retries: { limit: 1, delay: 5000, backoff: "constant" },
	};

	override async run(
		{ payload: { users } }: WorkflowEvent<Params>,
		step: WorkflowStep,
	) {
		console.log(`Processing Brawl Notifications for ${users.length} users`);
		const results = await Promise.allSettled(
			users.map(async (user) => {
				const { components, player } = await step.do(
					`Process user ${user.id}`,
					BrawlNotifications.config,
					this.processUser.bind(this, user),
				);

				console.log(`User ${user.id} has ${components.length} notification(s)`);
				if (components.length)
					await step.do(
						`Send message for user ${user.id}`,
						BrawlNotifications.config,
						this.sendMessage.bind(this, user, components, player),
					);
				return step.do(
					`Update user ${user.id} data`,
					BrawlNotifications.config,
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
				`Failed to process Brawl Notifications for ${errors.length} users`,
				{ cause: errors },
			);
	}

	private async processUser(
		user: UserResult,
	): Promise<{ components: APIContainerComponent[]; player: PartialPlayer }> {
		const player: PartialPlayer = await Brawl.getPlayer(user.brawlTag);
		const components: APIContainerComponent[] = [];

		if (
			(user.brawlNotifications & NotificationType["Trophy Road Advancement"] ||
				user.brawlNotifications & NotificationType["All"]) &&
			user.brawlTrophies != null
		) {
			const tier =
				BrawlNotifications.trophyRoadTiers.findLast(
					(tier) => tier <= player.highestTrophies,
				) ?? 0;

			if (
				tier >
				(BrawlNotifications.trophyRoadTiers.findLast(
					(tier) => tier <= user.brawlTrophies!,
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
									content: `## Avanzamento Cammino dei Trofei!\nHai raggiunto il traguardo di **${tier.toLocaleString("it-IT")}** trofei!`,
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
			user.brawlNotifications & NotificationType["New Brawler"] ||
			user.brawlNotifications & NotificationType["Brawler Tier Max"] ||
			user.brawlNotifications & NotificationType["All"]
		) {
			const oldBrawlers = await Promise.try<
				Pick<Brawl.BrawlerStat, "id" | "rank">[],
				Parameters<typeof JSON.parse>
			>(JSON.parse, user.brawlers ?? "[]").catch(() => {});

			if (oldBrawlers)
				for (const brawler of player.brawlers) {
					const rank = oldBrawlers.find((b) => b.id === brawler.id)?.rank;

					if (
						rank == null &&
						(user.brawlNotifications & NotificationType["New Brawler"] ||
							user.brawlNotifications & NotificationType["All"])
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
											url: `https://cdn.brawlify.com/brawlers/borderless/${brawler.id}.png`,
										},
									},
								},
							],
						});
					if (
						rank !== 51 &&
						brawler.rank === 51 &&
						(user.brawlNotifications & NotificationType["Brawler Tier Max"] ||
							user.brawlNotifications & NotificationType["All"])
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
											url: `https://cdn.brawlify.com/brawlers/borderless/${brawler.id}.png`,
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
				brawlers: player.brawlers.map(({ id, rank, name }) => ({
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
		player: Pick<Brawl.Player, "name">,
	) {
		await rest.post(Routes.channelMessages(this.env.BRAWL_STARS_CHANNEL), {
			body: {
				flags: MessageFlags.IsComponentsV2,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `**${escapeMarkdown(player.name)}** (${user.brawlTag}) ha raggiunto nuovi traguardi!`,
					},
					...components.slice(0, 9),
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								style: ButtonStyle.Secondary,
								custom_id: `brawl-player--${user.brawlTag}`,
								label: "Visualizza il profilo",
								emoji: { name: "👤" },
							},
						],
					},
					{
						type: ComponentType.TextDisplay,
						content: `-# <@${user.id}> usa il comando \`/brawl notify\` per gestire le tue notifiche`,
					},
				],
				allowed_mentions: { parse: [] },
			} satisfies RESTPostAPIChannelMessageJSONBody,
		});
	}

	private async updateUser(user: UserResult, player: PartialPlayer) {
		await this.env.DB.prepare(
			`UPDATE Users
				SET brawlTrophies = ?1,
					brawlers = ?2
				WHERE id = ?3`,
		)
			.bind(
				player.highestTrophies,
				JSON.stringify(player.brawlers.map(({ id, rank }) => ({ id, rank }))),
				user.id,
			)
			.run();
	}
}
