import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ButtonStyle,
	ComponentType,
	Routes,
	type APIContainerComponent,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { Brawl } from "./commands/brawl.ts";
import { escapeMarkdown } from "./util/formatters.ts";
import { rest } from "./util/rest.ts";

type UserResult = Pick<
	User,
	"id" | "brawlNotifications" | "brawlTrophies" | "brawlers"
> &
	Required<Pick<User, "brawlTag">>;
export enum NotificationType {
	"All" = 1 << 0,
	"Brawler Tier Max" = 1 << 1,
	"New Brawler" = 1 << 2,
	"Trophy Road Advancement" = 1 << 3,
}

export class BrawlNotifications extends WorkflowEntrypoint<Env> {
	static readonly trophyRoadTiers = [
		500, 1_500, 5_000, 10_000, 15_000, 20_000, 25_000, 30_000, 40_000, 50_000,
		60_000, 70_000, 80_000, 90_000, 100_000,
	];

	override async run({}: WorkflowEvent<Params>, step: WorkflowStep) {
		const data = await step.do("Read data from db", this.readData.bind(this));

		return Promise.all(
			data.map(async (user) => {
				const { components, player } = await step.do(
					`Process user ${user.id}`,
					this.processUser.bind(this, user),
				);
				const promises: Promise<any>[] = [
					step.do(
						`Update user ${user.id} data`,
						this.updateUser.bind(this, user, player),
					),
				];

				if (components.length)
					promises.push(
						step.do(
							`Send message for user ${user.id}`,
							this.sendMessage.bind(this, user, components, player),
						),
					);
				return Promise.all(promises);
			}),
		);
	}

	private async readData() {
		const { results } = await this.env.DB.prepare(
			`SELECT id,
					brawlTag,
					brawlNotifications,
					brawlTrophies,
					brawlers
				FROM Users
				WHERE brawlTag IS NOT NULL
					AND brawlNotifications != 0
				LIMIT 25`,
		).all<UserResult>();

		return results;
	}

	private async processUser(user: UserResult) {
		const player = await Brawl.getPlayer(user.brawlTag);
		const oldBrawlers = await Promise.try<
			Pick<Brawl.BrawlerStat, "id" | "rank">[],
			Parameters<typeof JSON.parse>
		>(JSON.parse, user.brawlers ?? "[]").catch(() => []);
		const components: APIContainerComponent[] = [];

		if (
			(user.brawlNotifications & NotificationType["Trophy Road Advancement"] ||
				user.brawlNotifications & NotificationType["All"]) &&
			user.brawlTrophies != null
		) {
			const tier =
				BrawlNotifications.trophyRoadTiers.findLast(
					(tier) => tier < player.highestTrophies,
				) ?? 0;

			if (
				tier >
				(BrawlNotifications.trophyRoadTiers.findLast(
					(tier) => tier < user.brawlTrophies!,
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
		)
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
										url: `https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`,
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
										url: "https://cdn.brawlify.com/tiers/regular/51.png",
									},
								},
							},
						],
					});
			}
		return {
			components,
			player: {
				name: player.name,
				brawlers: player.brawlers,
				highestTrophies: player.highestTrophies,
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
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `**${escapeMarkdown(player.name)}** (${user.brawlTag}) ha raggiunto nuovi traguardi!`,
					},
					...components,
					{
						type: ComponentType.TextDisplay,
						content: `-# Messaggio inviato per conto di <@${user.id}>.\n-# Usa il comando \`/brawl notify\` per gestire le tue notifiche`,
					},
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
				],
				allowed_mentions: { parse: [] },
			} satisfies RESTPostAPIChannelMessageJSONBody,
		});
	}

	private async updateUser(
		user: UserResult,
		player: Pick<Brawl.Player, "name" | "brawlers" | "highestTrophies">,
	) {
		await this.env.DB.prepare(
			`UPDATE Users
				SET brawlTrophies = ?1,
					brawlers = ?2
				WHERE id = ?3`,
		)
			.bind(
				player.highestTrophies,
				JSON.stringify(
					player.brawlers.map((b) => ({ id: b.id, rank: b.rank })),
				),
				user.id,
			)
			.run();
	}
}
