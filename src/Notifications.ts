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
	type APIEmbed,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { Clash } from "./commands";
import { Brawl } from "./commands/brawl";
import { bitSetMap } from "./util/bitSets";
import {
	BrawlNotifications,
	ClashNotifications,
	SupercellPlayerType,
} from "./util/Constants";
import { escapeMarkdown } from "./util/formatters";
import { rest } from "./util/globals";

export type Params = { players: Database.SupercellPlayer[] };

export class Notifications extends WorkflowEntrypoint<Env, Params> {
	static readonly brawlTrophyRoadTiers = [
		500, 1_500, 5_000, 10_000, 15_000, 20_000, 25_000, 30_000, 40_000, 50_000,
		60_000, 70_000, 80_000, 90_000, 100_000,
	];

	override async run(
		{ payload: { players } }: WorkflowEvent<Params>,
		step: WorkflowStep,
	) {
		console.log(`Processing Notifications for ${players.length} users`);
		const results = await Promise.allSettled(
			players.map(async (user) => {
				const { body, data } = await step.do(
					`Process ${user.tag} (${SupercellPlayerType[user.type]})`,
					{ retries: { limit: 0, delay: 0 } },
					(user.type === SupercellPlayerType.BrawlStars ?
						// eslint-disable-next-line @typescript-eslint/unbound-method
						this.processBrawlUser
						// eslint-disable-next-line @typescript-eslint/unbound-method
					:	this.processClashUser
					).bind(this, user),
				);

				if (body)
					await step.do(
						`Send message for ${user.tag} (${SupercellPlayerType[user.type]})`,
						{ retries: { limit: 0, delay: 0 } },
						this.sendMessage.bind(this, body, user.type),
					);
				return step.do(
					`Update ${user.tag} (${SupercellPlayerType[user.type]}) data`,
					{ retries: { limit: 4, delay: 300, backoff: "exponential" } },
					this.updatePlayer.bind(this, user, data),
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
				`Failed to process Notifications for ${errors.length} users`,
				{ cause: errors },
			);
	}

	private async processBrawlUser(
		user: Database.SupercellPlayer,
	): Promise<{ body?: RESTPostAPIChannelMessageJSONBody; data: string }> {
		const newPlayer = await Brawl.getPlayer(user.tag, { cache: false }),
			oldPlayer: Brawl.Player | null =
				user.data &&
				(await Promise.try(JSON.parse, user.data).catch(console.error));
		const components: APIContainerComponent[] = [];

		if (!oldPlayer) return { data: JSON.stringify(newPlayer) };
		if (
			user.notifications &
			(BrawlNotifications["Avanzamento nel cammino dei trofei"] |
				BrawlNotifications["All"])
		) {
			const newTier =
					Notifications.brawlTrophyRoadTiers.findLast(
						(tier) => tier <= newPlayer.highestTrophies,
					) ?? 0,
				oldTier =
					Notifications.brawlTrophyRoadTiers.findLast(
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
			(BrawlNotifications["Nuovo Brawler"] |
				BrawlNotifications["Prestigio"] |
				BrawlNotifications["All"])
		)
			for (const brawler of newPlayer.brawlers) {
				const old = oldPlayer.brawlers.find((b) => b.id === brawler.id);

				if (
					old == null &&
					user.notifications &
						(BrawlNotifications["Nuovo Brawler"] | BrawlNotifications["All"])
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
						(BrawlNotifications["Prestigio"] | BrawlNotifications["All"])
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
		return {
			body:
				components.length ?
					{
						flags: MessageFlags.IsComponentsV2,
						components: [
							{
								type: ComponentType.TextDisplay,
								content: `**${escapeMarkdown(newPlayer.name)}** (${newPlayer.tag}) ha raggiunto nuovi traguardi!`,
							},
							...components.slice(0, 9),
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										style: ButtonStyle.Secondary,
										custom_id: `brawl-player--${newPlayer.tag}`,
										label: "Visualizza il profilo",
										emoji: { name: "👤" },
									},
								],
							},
							{
								type: ComponentType.TextDisplay,
								content: `-# <@${user.userId}> usa il comando \`/brawl notify\` per gestire le tue notifiche`,
							},
						],
						allowed_mentions: { parse: [] },
					}
				:	undefined,
			data: JSON.stringify(newPlayer),
		};
	}

	private async processClashUser(
		user: Database.SupercellPlayer,
	): Promise<{ body?: RESTPostAPIChannelMessageJSONBody; data: string }> {
		const newPlayer = await Clash.getPlayer(user.tag, { cache: false }),
			oldPlayer: Clash.Player | null =
				user.data &&
				(await Promise.try(JSON.parse, user.data).catch(console.error));
		const embeds: APIEmbed[] = [];

		if (!oldPlayer) return { data: JSON.stringify(newPlayer) };
		if (
			user.notifications &
				(ClashNotifications["Nuova arena raggiunta"] |
					ClashNotifications["All"]) &&
			newPlayer.arena.id > oldPlayer.arena.id
		)
			embeds.push({
				color: 0x5197ed,
				title: "Nuova arena raggiunta!",
				description: `Hai raggiunto **${newPlayer.arena.name}** (Arena ${
					newPlayer.achievements?.find((a) => a.name === "Road to Glory")
						?.value ?? "sconosciuta"
				})!`,
			});
		if (
			user.notifications &
				(ClashNotifications["Nuova lega raggiunta"] |
					ClashNotifications["All"]) &&
			newPlayer.currentPathOfLegendSeasonResult &&
			newPlayer.currentPathOfLegendSeasonResult.leagueNumber >
				(oldPlayer.currentPathOfLegendSeasonResult?.leagueNumber ?? 0)
		)
			embeds.push({
				color: 0xee82ee,
				title: "Nuova lega raggiunta!",
				description: `Hai raggiunto la **Lega ${newPlayer.currentPathOfLegendSeasonResult.leagueNumber}** in Modalità Classificata!`,
			});
		if (
			user.notifications &
			(ClashNotifications["Nuova carta trovata"] |
				ClashNotifications["Evoluzione sbloccata"] |
				ClashNotifications["All"])
		)
			for (const card of newPlayer.cards) {
				const oldCard = oldPlayer.cards.find((b) => b.id === card.id);

				if (
					!oldCard &&
					(card.rarity === "champion" || card.rarity === "legendary") &&
					user.notifications &
						(ClashNotifications["Nuova carta trovata"] |
							ClashNotifications["All"])
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
					user.notifications &
					(ClashNotifications["Evoluzione sbloccata"] |
						ClashNotifications["All"])
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
		return {
			body:
				embeds.length ?
					{
						content: `[**${newPlayer.name}**](${Clash.buildURL(
							`playerInfo?id=${newPlayer.tag.slice(1)}`,
						)}) (<@${
							user.userId
						}>) ha raggiunto nuovi traguardi!\n-# Usa il comando \`/clash notify\` per gestire le notifiche`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										style: ButtonStyle.Secondary,
										custom_id: `clash-player--${newPlayer.tag}`,
										label: "Visualizza il profilo",
										emoji: { name: "👤" },
									},
								],
							},
						],
						embeds: embeds.slice(0, 10),
						allowed_mentions: { parse: [] },
					}
				:	undefined,
			data: JSON.stringify(newPlayer),
		};
	}

	private async sendMessage(
		body: RESTPostAPIChannelMessageJSONBody,
		type: SupercellPlayerType,
	) {
		await rest.post(
			Routes.channelMessages(
				type === SupercellPlayerType.BrawlStars ?
					this.env.BRAWL_STARS_CHANNEL
				:	this.env.CLASH_ROYALE_CHANNEL,
			),
			{ body },
		);
	}

	private async updatePlayer(user: Database.SupercellPlayer, data: string) {
		await this.env.DB.prepare(
			`UPDATE SupercellPlayers
				SET data = ?1
				WHERE tag = ?2 AND type = ?3`,
		)
			.bind(data, user.tag, user.type)
			.run();
	}
}
