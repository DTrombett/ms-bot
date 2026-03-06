import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ButtonStyle,
	ComponentType,
	Routes,
	type APIEmbed,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { Clash } from "./commands/clash";
import { bitSetMap } from "./util/bitSets";
import { SupercellPlayerType } from "./util/Constants";
import { rest } from "./util/globals";

export enum NotificationType {
	"All" = 1 << 0,
	"New Arena" = 1 << 1,
	"New Card" = 1 << 2,
	"New Evo" = 1 << 3,
	"New League" = 1 << 4,
}
export type Params = { players: Database.SupercellPlayer[] };

export class ClashNotifications extends WorkflowEntrypoint<Env, Params> {
	override async run(
		{ payload: { players } }: WorkflowEvent<Params>,
		step: WorkflowStep,
	) {
		console.log(`Processing Clash Notifications for ${players.length} users`);
		const results = await Promise.allSettled(
			players.map(async (user) => {
				const { embeds, player } = await step.do(
					`Process user ${user.userId}`,
					{ retries: { limit: 0, delay: 0 } },
					this.processUser.bind(this, user),
				);

				console.log(`User ${user.userId} has ${embeds.length} notification(s)`);
				if (embeds.length)
					await step.do(
						`Send message for user ${user.userId}`,
						{ retries: { limit: 0, delay: 0 } },
						this.sendMessage.bind(this, user.userId, embeds, player),
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
				`Failed to process Clash Notifications for ${errors.length} users`,
				{ cause: errors },
			);
	}

	private async processUser(
		user: Database.SupercellPlayer,
	): Promise<{ embeds: APIEmbed[]; player: Clash.Player }> {
		const newPlayer = await Clash.getPlayer(user.tag, { cache: false }),
			oldPlayer: Clash.Player | null =
				user.data &&
				(await Promise.try(JSON.parse, user.data).catch(console.error));
		const embeds: APIEmbed[] = [];

		if (!oldPlayer) return { embeds: [], player: newPlayer };
		if (
			user.notifications &
				(NotificationType["New Arena"] | NotificationType["All"]) &&
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
				(NotificationType["New League"] | NotificationType["All"]) &&
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
			(NotificationType["New Card"] |
				NotificationType["New Evo"] |
				NotificationType["All"])
		)
			for (const card of newPlayer.cards) {
				const oldCard = oldPlayer.cards.find((b) => b.id === card.id);

				if (
					!oldCard &&
					(card.rarity === "champion" || card.rarity === "legendary") &&
					user.notifications &
						(NotificationType["New Card"] | NotificationType["All"])
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
					(NotificationType["New Evo"] | NotificationType["All"])
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
		return { embeds, player: newPlayer };
	}

	private async sendMessage(
		id: string,
		embeds: APIEmbed[],
		player: Clash.Player,
	) {
		await rest.post(Routes.channelMessages(this.env.CLASH_ROYALE_CHANNEL), {
			body: {
				content: `[**${player.name}**](${Clash.buildURL(
					`playerInfo?id=${player.tag.slice(1)}`,
				)}) (<@${
					id
				}>) ha raggiunto nuovi traguardi!\n-# Usa il comando \`/clash notify\` per gestire le notifiche`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								style: ButtonStyle.Secondary,
								custom_id: `clash-player--${player.tag}`,
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

	private async updatePlayer(player: Clash.Player) {
		await this.env.DB.prepare(
			`UPDATE SupercellPlayer
				SET data = ?1,
				WHERE tag = ?2 AND type = ?3`,
		)
			.bind(JSON.stringify(player), player.tag, SupercellPlayerType.ClashRoyale)
			.run();
	}
}
