import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ButtonStyle,
	ComponentType,
	MessageFlags,
	Routes,
	type APIContainerComponent,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { Brawl } from "./commands/brawl";
import { SupercellPlayerType } from "./util/Constants";
import { escapeMarkdown } from "./util/formatters";
import { rest } from "./util/globals";

export enum NotificationType {
	"All" = 1 << 0,
	"Prestige" = 1 << 1,
	"New Brawler" = 1 << 2,
	"Trophy Road Advancement" = 1 << 3,
}
export type Params = { players: Database.SupercellPlayer[] };

export class BrawlNotifications extends WorkflowEntrypoint<Env, Params> {
	static readonly trophyRoadTiers = [
		500, 1_500, 5_000, 10_000, 15_000, 20_000, 25_000, 30_000, 40_000, 50_000,
		60_000, 70_000, 80_000, 90_000, 100_000,
	];

	override async run(
		{ payload: { players } }: WorkflowEvent<Params>,
		step: WorkflowStep,
	) {
		console.log(`Processing Brawl Notifications for ${players.length} users`);
		const results = await Promise.allSettled(
			players.map(async (user) => {
				const { components, player } = await step.do(
					`Process user ${user.userId}`,
					{ retries: { limit: 0, delay: 0 } },
					this.processUser.bind(this, user),
				);

				console.log(
					`User ${user.userId} has ${components.length} notification(s)`,
				);
				if (components.length)
					await step.do(
						`Send message for user ${user.userId}`,
						{ retries: { limit: 0, delay: 0 } },
						this.sendMessage.bind(this, user.userId, components, player),
					);
				return step.do(
					`Update user ${user.userId} data`,
					{ retries: { limit: 4, delay: 300, backoff: "exponential" } },
					this.updatePlayer.bind(this, player),
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
		user: Database.SupercellPlayer,
	): Promise<{ components: APIContainerComponent[]; player: Brawl.Player }> {
		const newPlayer = await Brawl.getPlayer(user.tag, { cache: false }),
			oldPlayer: Brawl.Player | null =
				user.data &&
				(await Promise.try(JSON.parse, user.data).catch(console.error));
		const components: APIContainerComponent[] = [];

		if (!oldPlayer) return { components: [], player: newPlayer };
		if (
			user.notifications &
			(NotificationType["Trophy Road Advancement"] | NotificationType["All"])
		) {
			const newTier =
					BrawlNotifications.trophyRoadTiers.findLast(
						(tier) => tier <= newPlayer.highestTrophies,
					) ?? 0,
				oldTier =
					BrawlNotifications.trophyRoadTiers.findLast(
						(tier) => tier <= oldPlayer.highestTrophies,
					) ?? 0;

			if (newTier > oldTier)
				components.push({
					type: ComponentType.Container,
					accent_color:
						newPlayer.nameColor ?
							parseInt(newPlayer.nameColor.slice(4), 16)
						:	0xffffff,
					components: [
						{
							type: ComponentType.Section,
							components: [
								{
									type: ComponentType.TextDisplay,
									content: `## Avanzamento Cammino dei Trofei!\nHai raggiunto il traguardo di **${newTier.toLocaleString("it-IT")}** trofei!`,
								},
							],
							accessory: {
								type: ComponentType.Thumbnail,
								media: {
									url: `https://cdn.brawlify.com/profile-icons/regular/${newPlayer.icon.id}.png`,
								},
							},
						},
					],
				});
		}
		if (
			user.notifications &
			(NotificationType["New Brawler"] |
				NotificationType["Prestige"] |
				NotificationType["All"])
		)
			for (const brawler of newPlayer.brawlers) {
				const old = oldPlayer.brawlers.find((b) => b.id === brawler.id);

				if (
					old == null &&
					user.notifications &
						(NotificationType["New Brawler"] | NotificationType["All"])
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
					brawler.prestigeLevel > (old?.prestigeLevel ?? 0) &&
					user.notifications &
						(NotificationType["Prestige"] | NotificationType["All"])
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
										content: `## Nuovo Prestigio sbloccato!\nHai sbloccato il prestigio **${brawler.prestigeLevel}** per **${brawler.name}**!`,
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
		return { components, player: newPlayer };
	}

	private async sendMessage(
		id: string,
		components: APIContainerComponent[],
		player: Brawl.Player,
	) {
		await rest.post(Routes.channelMessages(this.env.BRAWL_STARS_CHANNEL), {
			body: {
				flags: MessageFlags.IsComponentsV2,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `**${escapeMarkdown(player.name)}** (${player.tag}) ha raggiunto nuovi traguardi!`,
					},
					...components.slice(0, 9),
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								style: ButtonStyle.Secondary,
								custom_id: `brawl-player--${player.tag}`,
								label: "Visualizza il profilo",
								emoji: { name: "👤" },
							},
						],
					},
					{
						type: ComponentType.TextDisplay,
						content: `-# <@${id}> usa il comando \`/brawl notify\` per gestire le tue notifiche`,
					},
				],
				allowed_mentions: { parse: [] },
			} satisfies RESTPostAPIChannelMessageJSONBody,
		});
	}

	private async updatePlayer(player: Brawl.Player) {
		await this.env.DB.prepare(
			`UPDATE SupercellPlayer
				SET data = ?1,
				WHERE tag = ?2 AND type = ?3`,
		)
			.bind(JSON.stringify(player), player.tag, SupercellPlayerType.BrawlStars)
			.run();
	}
}
