import { env, waitUntil } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	type APIActionRowComponent,
	type APIButtonComponent,
	type APIEmbed,
	type APIMessageTopLevelComponent,
	type APISectionComponent,
	type APITextDisplayComponent,
	type Locale,
	type RESTPatchAPIInteractionOriginalResponseJSONBody,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { NotificationType } from "../ClashNotifications.ts";
import Command from "../Command.ts";
import { bitSetMap } from "../util/bitSets.ts";
import capitalize from "../util/capitalize.ts";
import { escapeMarkdown } from "../util/formatters.ts";
import { percentile } from "../util/maths.ts";
import { ok } from "../util/node.ts";
import { template, toUpperCase } from "../util/strings.ts";
import { formatShortTime, TimeUnit } from "../util/time.ts";
import { Brawl } from "./brawl.ts";

enum LevelOffset {
	COMMON,
	RARE = 2,
	EPIC = 5,
	LEGENDARY = 8,
	CHAMPION = 10,
}
enum ClanType {
	OPEN = "Aperto",
	INVITEONLY = "Su invito",
	CLOSED = "Chiuso",
}
enum MemberEmoji {
	LEADER = "👑",
	ADMIN = "💼",
	COLEADER = "⭐",
	ELDER = "🔰",
	MEMBER = "👤",
	NOTMEMBER = "❌",
}
enum MemberRole {
	LEADER,
	ADMIN,
	COLEADER,
	ELDER,
	MEMBER,
	NOTMEMBER,
}
enum ResolvedMemberRole {
	LEADER = "Presidente",
	ADMIN = "Admin",
	COLEADER = "Vicepresidente",
	ELDER = "Anziano",
	MEMBER = "Membro",
	NOTMEMBER = "Non membro",
}
enum CardRarity {
	COMMON,
	RARE,
	EPIC,
	LEGENDARY,
	CHAMPION,
}
enum ResolvedCardRarity {
	COMMON = "Comune",
	RARE = "Rara",
	EPIC = "Epica",
	LEGENDARY = "Leggendaria",
	CHAMPION = "Campione",
}
enum BattleType {
	"pvp" = "PvP",
	"pve" = "PvE",
	"clanmate" = "Amichevole nel clan",
	"tournament" = "Torneo",
	"friendly" = "Amichevole",
	"survival" = "Sopravvivenza",
	"pvp2v2" = "PvP 2v2",
	"clanmate2v2" = "Amichevole 2v2 nel clan",
	"challenge2v2" = "Challenge 2v2",
	"clanwarCollectionDay" = "clanwarCollectionDay",
	"clanwarWarDay" = "Guerra tra clan",
	"casual1v1" = "1v1 casual",
	"casual2v2" = "2v2 casual",
	"boatBattle" = "Attacco alla nave",
	"boatBattlePractice" = "Allenamento attacco alla nave",
	"riverRacePvp" = "1v1 guerra tra clan",
	"riverRaceDuel" = "Duello",
	"riverRaceDuelColosseum" = "Duello nell'arena",
	"tutorial" = "Tutorial",
	"pathOfLegend" = "Classificata",
	"seasonalBattle" = "Battaglia stagionale",
	"practice" = "Allenamento",
	"trail" = "Classica",
	"unknown" = "Sconosciuto",
}

export class Clash extends Command {
	static "NOTIFICATION_TYPES" = [
		"All",
		"New Arena",
		"New Card",
		"New Evo",
		"New League",
	] as const;
	private static readonly "ERROR_MESSAGES" = {
		400: "Parametri non validi forniti.",
		403: "Accesso all'API negato.",
		404: "Dati non trovati.",
		429: "Limite di richieste API raggiunto.",
		500: "Errore interno dell'API.",
		503: "Manutenzione in corso!",
	};
	private static readonly "EMOJIS" = {
		starLevel: "1441845434153697392",
		blueCrown: "1441876288251101367",
		redCrown: "1441876632800329820",
		battle: "1441877350697668679",
		cards: "1442124435162136667",
		clan: "1442125625052889128",
		experienceIcon: "1442127173434736761",
		arena: "1442133142419935352",
		tower: "1442138907410956511",
		trader: "1442140198036312258",
		pathOfLegends: "1442178291699286087",
		tournament: "1442195961496473802",
		friends: "1442230918952648875",
		wildShard: "1442922861147979786",
		badges: "1443279126134788289",
		blueKingCry: "1443671305269412104",
		redKingCry: "1443671303365066823",
		blueKingHappy: "1443671301393748019",
		redKingHappy: "1443671298944401519",
		princessTower: "1443674549290926131",
		princessTowerGray: "1443676355773337690",
		heroBox: "1445138667273195663",
		wildShardGray: "1445144897739952168",
		heroBoxGray: "1445144557724504176",
	};
	private static readonly "CARDS_ORDER" = {
		Nome: (a, b) => a.name.localeCompare(b.name),
		Livello: (a, b) =>
			a.level +
			LevelOffset[toUpperCase(a.rarity)] -
			b.level -
			LevelOffset[toUpperCase(b.rarity)],
		Elisir: (a, b) => (a.elixirCost ?? 0) - (b.elixirCost ?? 0),
		Rarità: (a, b) =>
			CardRarity[toUpperCase(a.rarity)] - CardRarity[toUpperCase(b.rarity)],
	} satisfies Record<
		string,
		(a: Clash.PlayerItemLevel, b: Clash.PlayerItemLevel) => number
	>;
	private static readonly "MEMBERS_ORDER" = {
		"Più trofei": (a, b) => b.trophies - a.trophies,
		"Meno trofei": (a, b) => a.trophies - b.trophies,
		"Nome": (a, b) => a.name.localeCompare(b.name),
		"Ruolo": (a, b) =>
			MemberRole[toUpperCase(a.role)] - MemberRole[toUpperCase(b.role)],
		"Più donazioni": (a, b) => b.donations - a.donations,
		"Meno donazioni": (a, b) => a.donations - b.donations,
		"Ultimo accesso": (a, b) =>
			Clash.parseAPIDate(a.lastSeen) - Clash.parseAPIDate(b.lastSeen),
	} satisfies Record<
		string,
		(a: Clash.ClanMember, b: Clash.ClanMember) => number
	>;
	static override "chatInputData" = {
		name: "clash",
		description: "Interagisci con Clash Royale!",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "notify",
				description: "Gestisci le notifiche per il tuo profilo Clash Royale",
				type: ApplicationCommandOptionType.SubcommandGroup,
				options: [
					{
						name: "enable",
						description: "Abilita un tipo di notifica",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "type",
								description: "Tipo di notifica da abilitare",
								type: ApplicationCommandOptionType.String,
								required: true,
								choices: this.NOTIFICATION_TYPES.map((type) => ({
									name: type,
									value: type,
								})),
							},
						],
					},
					{
						name: "disable",
						description: "Disabilita un tipo di notifica",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "type",
								description: "Tipo di notifica da disabilitare",
								type: ApplicationCommandOptionType.String,
								required: true,
								choices: this.NOTIFICATION_TYPES.map((type) => ({
									name: type,
									value: type,
								})),
							},
						],
					},
					{
						name: "view",
						description: "Visualizza le impostazioni di notifica",
						type: ApplicationCommandOptionType.Subcommand,
					},
				],
			},
			{
				name: "player",
				description: "Visualizza un giocatore Clash Royale",
				type: ApplicationCommandOptionType.SubcommandGroup,
				options: [
					{
						name: "view",
						description: "Vedi i dettagli di un giocatore!",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "tag",
								description:
									"Il tag giocatore (es. #22RJCYLUY). Di default viene usato quello salvato",
								type: ApplicationCommandOptionType.String,
							},
						],
					},
					{
						name: "collection",
						description:
							"Vedi le carte e gli emblemi posseduti da un giocatore",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "tag",
								description:
									"Il tag giocatore (es. #22RJCYLUY). Di default viene usato quello salvato",
								type: ApplicationCommandOptionType.String,
							},
							{
								name: "order",
								description: "Come ordinare le carte (default. Nome)",
								type: ApplicationCommandOptionType.String,
								choices: Object.keys(this.CARDS_ORDER).map((k) => ({
									name: k,
									value: k,
								})),
							},
						],
					},
				],
			},
			{
				name: "clan",
				description: "Visualizza un clan Clash Royale",
				type: ApplicationCommandOptionType.SubcommandGroup,
				options: [
					{
						name: "view",
						description: "Vedi i dettagli di un clan!",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "tag",
								description:
									"Il tag del clan (es. #2UPUQCYLR). Di default viene usato quello del profilo salvato",
								type: ApplicationCommandOptionType.String,
							},
						],
					},
					{
						name: "members",
						description: "Vedi i membri di un clan",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "tag",
								description:
									"Il tag del clan (es. #2UPUQCYLR). Di default viene usato quello del profilo salvato",
								type: ApplicationCommandOptionType.String,
							},
							{
								name: "order",
								description: "Come ordinare i membri (default. Nome)",
								type: ApplicationCommandOptionType.String,
								choices: Object.keys(this.MEMBERS_ORDER).map((k) => ({
									name: k,
									value: k,
								})),
							},
						],
					},
				],
			},
		],
	} as const satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	static "calculateFlags" = (flags = 0) =>
		flags & NotificationType.All
			? "**tutti i tipi**"
			: flags
			? Object.values(NotificationType)
					.filter(
						(v): v is number => typeof v === "number" && (flags & v) !== 0,
					)
					.map((v) => `**${NotificationType[v]}**`)
					.join(", ")
			: "**nessun tipo**";
	private static "pagination" = <T>(
		array: T[],
		pageLength: number,
		customId: string,
		currentPage: number,
	): { page: T[]; component: APIActionRowComponent<APIButtonComponent> } => {
		const pages = Math.ceil(array.length / pageLength);

		return {
			page: array.slice(
				currentPage * pageLength,
				(currentPage + 1) * pageLength,
			),
			component: {
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						emoji: { name: "⬅️" },
						custom_id: `${customId}-${currentPage - 1}`,
						disabled: !currentPage,
						style: ButtonStyle.Primary,
					},
					{
						type: ComponentType.Button,
						label: `Pagina ${currentPage + 1} di ${pages}`,
						custom_id: "-",
						disabled: true,
						style: ButtonStyle.Secondary,
					},
					{
						type: ComponentType.Button,
						emoji: { name: "➡️" },
						custom_id: `${customId}-${currentPage + 1}`,
						disabled: currentPage >= pages - 1,
						style: ButtonStyle.Primary,
					},
				],
			},
		};
	};
	private static "collectionRow" = (
		id: string,
		player: Clash.Player,
		type: "cards" | "supportCards" | "badges" | "achievements",
	): APIActionRowComponent<APIButtonComponent> => ({
		type: ComponentType.ActionRow,
		components: (
			[
				{
					custom_id: `clash-cards-${id}-${player.tag}`,
					style: ButtonStyle.Primary,
					type: ComponentType.Button,
					emoji: { id: "1442124435162136667" },
					label: "Carte",
				},
				{
					custom_id: `clash-supportCards-${id}-${player.tag}`,
					style: ButtonStyle.Primary,
					type: ComponentType.Button,
					emoji: { id: "1442138907410956511" },
					label: "Truppe delle torri",
				},
				{
					custom_id: `clash-badges-${id}-${player.tag}`,
					style: ButtonStyle.Primary,
					type: ComponentType.Button,
					emoji: { id: "1443279126134788289" },
					label: "Emblemi",
				},
				{
					custom_id: `clash-achievements-${id}-${player.tag}`,
					style: ButtonStyle.Primary,
					type: ComponentType.Button,
					emoji: { name: "🏅" },
					label: "Obiettivi",
				},
			] as const
		).filter((b) => !b.custom_id.startsWith(`clash-${type}-`)),
	});
	static "createCardComponents" = (
		player: Clash.Player,
		userId: string,
		card: Clash.PlayerItemLevel,
		locale: Locale,
		order: keyof (typeof Clash)["CARDS_ORDER"] = "Nome",
		page = 0,
		supportCard = false,
	): APIMessageTopLevelComponent[] => [
		{
			type: ComponentType.Container,
			components: [
				{
					type: ComponentType.TextDisplay,
					content: template`
					## ${card.name}
					<:level:${this.EMOJIS.experienceIcon}> Livello: **${
						card.level + LevelOffset[toUpperCase(card.rarity)]
					}/${card.maxLevel + LevelOffset[toUpperCase(card.rarity)]}**
					<:starlevel:${this.EMOJIS.starLevel}> Livello stella: **${card.starLevel ?? 0}**
					💎 Rarità: **${ResolvedCardRarity[toUpperCase(card.rarity)]}**
					<:cards:${this.EMOJIS.cards}> Carte possedute: **${card.count.toLocaleString(
						locale,
					)}**
					💧 Costo elisir: **${card.elixirCost ?? "N/A"}**
					${1}${bitSetMap(
						card.maxEvolutionLevel ?? 0,
						(evo) =>
							`<:evo:${this.EMOJIS.wildShard}> Evoluzione: **${
								evo ? ((card.evolutionLevel ?? 0) & 1 ? "Sì" : "No") : "N/A"
							}**`,
						(hero) =>
							`<:hero:${this.EMOJIS.heroBox}> Eroe: **${
								hero ? ((card.evolutionLevel ?? 0) & 2 ? "Sì" : "No") : "N/A"
							}**`,
					).join("\n")}
					`,
				},
				{
					type: ComponentType.MediaGallery,
					items: [
						{
							media: {
								url:
									card.evolutionLevel && card.iconUrls?.evolutionMedium
										? card.iconUrls.evolutionMedium
										: card.iconUrls?.medium ?? "",
							},
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							emoji: { name: "⬅️" },
							label: "Torna alla lista",
							custom_id: `clash-${
								supportCard ? "supportCards" : "cards"
							}-${userId}-${player.tag}-${order}-${page}`,
							style: ButtonStyle.Secondary,
						},
					],
				},
			],
		},
	];
	static "createCardsComponents" = (
		player: Clash.Player,
		url: string,
		id: string,
		order: keyof (typeof Clash)["CARDS_ORDER"] = "Nome",
		currentPage = 0,
		supportCards = false,
	): APIMessageTopLevelComponent[] => {
		const { component, page } = this.pagination(
			player.cards.sort(Clash.CARDS_ORDER[order]),
			8,
			`clash-${supportCards ? "supportCards" : "cards"}-${id}-${
				player.tag
			}-${order}`,
			currentPage,
		);

		return [
			{
				type: ComponentType.Container,
				components: [
					{
						type: ComponentType.MediaGallery,
						items: [{ media: { url: new URL("/bg.png", url).href } }],
					},
					...page.map(
						(card): APISectionComponent => ({
							type: ComponentType.Section,
							components: [
								{
									type: ComponentType.TextDisplay,
									content: `[**${card.name}**](${this.buildURL(
										`cardInfo?id=${card.id}`,
									)})${card.elixirCost ? ` 💧${card.elixirCost}` : ""} ${
										card.starLevel
											? `  <:starlevel:${this.EMOJIS.starLevel}> ${card.starLevel}`
											: ""
									} ${bitSetMap(
										card.maxEvolutionLevel ?? 0,
										(evo) =>
											evo
												? (card.evolutionLevel ?? 0) & 1
													? `<:evo:${this.EMOJIS.wildShard}>`
													: `<:evo:${this.EMOJIS.wildShardGray}>`
												: "",
										(hero) =>
											hero
												? (card.evolutionLevel ?? 0) & 2
													? `<:hero:${this.EMOJIS.heroBox}>`
													: `<:hero:${this.EMOJIS.heroBoxGray}>`
												: "",
									)
										.filter(Boolean)
										.join(" ")}\n${
										ResolvedCardRarity[toUpperCase(card.rarity)]
									}  <:level:${this.EMOJIS.experienceIcon}> ${
										card.level + (LevelOffset[toUpperCase(card.rarity)] ?? 0)
									}  <:cards:${this.EMOJIS.cards}> ${card.count}`,
								},
							],
							accessory: {
								type: ComponentType.Button,
								style: ButtonStyle.Secondary,
								custom_id: `clash-card-${id}-${player.tag}-${card.id}-${order}-${currentPage}`,
								label: "Dettagli",
							},
						}),
					),
					component,
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.StringSelect,
								options: Object.keys(Clash.CARDS_ORDER).map((k) => ({
									label: k,
									value: k,
									default: order === k,
								})),
								custom_id: `clash-${
									supportCards ? "supportCards" : "cards"
								}-${id}-${player.tag}--${currentPage}`,
								placeholder: "Ordina per...",
							},
						],
					},
					this.collectionRow(
						id,
						player,
						supportCards ? "supportCards" : "cards",
					),
				],
			},
		];
	};
	static "createBadgesComponents" = (
		player: Clash.Player,
		url: string,
		id: string,
		locale: string,
		currentPage = 0,
	): APIMessageTopLevelComponent[] => {
		const { page, component } = this.pagination(
			player.badges ?? [],
			6,
			`clash-badges-${id}-${player.tag}`,
			currentPage,
		);

		return [
			{
				type: ComponentType.Container,
				components: [
					{
						type: ComponentType.MediaGallery,
						items: [{ media: { url: new URL("/bg.png", url).href } }],
					},
					...page.map(
						(badge): APISectionComponent => ({
							type: ComponentType.Section,
							components: [
								{
									type: ComponentType.TextDisplay,
									content: template`
										### ${badge.name}
										📈 Progresso: **${(badge.progress ?? 1).toLocaleString(locale)}${
										badge.target
											? `/${(badge.target ?? 1).toLocaleString(locale)}`
											: ""
									}**
										⭐ Livello: **${badge.level ? `${badge.level}/${badge.maxLevel}` : "N/A"}**
										`,
								},
							],
							accessory: {
								type: ComponentType.Thumbnail,
								media: { url: badge.iconUrls?.large ?? "" },
							},
						}),
					),
					component,
					this.collectionRow(id, player, "badges"),
				],
			},
		];
	};
	static "createAchievementsComponents" = (
		player: Clash.Player,
		url: string,
		id: string,
		locale: string,
		currentPage = 0,
	): APIMessageTopLevelComponent[] => {
		const { page, component } = this.pagination(
			player.achievements ?? [],
			6,
			`clash-achievements-${id}-${player.tag}`,
			currentPage,
		);

		return [
			{
				type: ComponentType.Container,
				components: [
					{
						type: ComponentType.MediaGallery,
						items: [{ media: { url: new URL("/bg.png", url).href } }],
					},
					...page.map(
						(ach): APITextDisplayComponent => ({
							type: ComponentType.TextDisplay,
							content: template`
								**__${ach.name}__** ${"⭐".repeat(ach.stars ?? 0)}
								${ach.info}**${ach.info}**
								Progresso: **${(ach.value ?? 1).toLocaleString(locale)}${
								ach.target ? `/${(ach.target ?? 1).toLocaleString(locale)}` : ""
							}**
								${ach.completionInfo}${ach.completionInfo}
								`,
						}),
					),
					component,
					this.collectionRow(id, player, "achievements"),
				],
			},
		];
	};
	static "createMembersComponents" = (
		clan: Clash.Clan,
		locale: string,
		id: string,
		order: keyof (typeof Clash)["MEMBERS_ORDER"] = "Più trofei",
		currentPage = 0,
	): APIMessageTopLevelComponent[] => {
		const { page, component } = this.pagination(
			clan.memberList.sort(Clash.MEMBERS_ORDER[order]),
			10,
			`clash-members-${id}-${clan.tag}-${order}`,
			currentPage,
		);
		const memberTrophies: number[] = [];
		const memberLevels: number[] = [];

		for (const member of clan.memberList) {
			memberTrophies.push(member.trophies);
			memberLevels.push(member.expLevel);
		}
		memberLevels.sort((a, b) => b - a);
		memberTrophies.sort((a, b) => b - a);
		return [
			{
				type: ComponentType.Container,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: template`
						### [${clan.name} (${clan.tag})](${this.buildURL(
							`clanInfo?id=${clan.tag.slice(1)}`,
						)})
						Trofei medi: **${Math.round(
							clan.memberList.reduce((p, c) => p + c.trophies, 0) /
								clan.memberList.length,
						).toLocaleString(locale)}**
						Mediana: **${Math.round(percentile(memberTrophies, 0.5)).toLocaleString(
							locale,
						)}**
						75° Percentile: **${Math.round(percentile(memberTrophies, 0.75)).toLocaleString(
							locale,
						)}**
						Livello medio: **${Math.round(percentile(memberLevels, 0.5)).toLocaleString(
							locale,
						)}**
						`,
					},
					...page.map(
						(member, i): APISectionComponent => ({
							type: ComponentType.Section,
							components: [
								{
									type: ComponentType.TextDisplay,
									content: `${i + currentPage * 5 + 1}. **${escapeMarkdown(
										member.name,
									)}**  <:donations:${
										this.EMOJIS.trader
									}> ${member.donations.toLocaleString(
										locale,
									)}  🏆 ${member.trophies.toLocaleString(locale)}\n${
										MemberEmoji[toUpperCase(member.role)]
									} ${
										ResolvedMemberRole[toUpperCase(member.role)]
									}  🕓 <t:${Math.round(
										Clash.parseAPIDate(member.lastSeen) / 1000,
									)}:R>`,
								},
							],
							accessory: {
								type: ComponentType.Button,
								style: ButtonStyle.Secondary,
								custom_id: `clash-player-${id}-${member.tag}`,
								label: "Dettagli",
							},
						}),
					),
					component,
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.StringSelect,
								options: Object.keys(Clash.MEMBERS_ORDER).map((k) => ({
									label: k,
									value: k,
									default: order === k,
								})),
								custom_id: `clash-members-${id}-${clan.tag}--${currentPage}`,
								placeholder: "Ordina per...",
							},
						],
					},
				],
			},
		];
	};
	static "createPlayerEmbed" = (
		player: Clash.Player,
		locale: Locale,
		playerId?: string,
	): APIEmbed => {
		let trophyProgress: {
				arena?: Clash.Arena;
				trophies?: number;
				bestTrophies?: number;
			} = player,
			mergeTactics:
				| {
						arena: Clash.Arena;
						trophies: number;
						bestTrophies: number;
				  }
				| undefined;
		const daysPlayed =
			player.badges?.find((b) => b.name === "YearsPlayed")?.progress ?? 0;
		const ranked = (
			[
				"currentPathOfLegendSeasonResult",
				"lastPathOfLegendSeasonResult",
				"bestPathOfLegendSeasonResult",
			] as const
		).map(
			(k) =>
				player[k] &&
				[
					player[k].trophies
						? `<:medal:${this.EMOJIS.pathOfLegends}>${player[k].trophies}`
						: `Lega ${player[k].leagueNumber}`,
					player[k].rank && `#${player[k].rank}`,
				]
					.filter(Boolean)
					.join(", "),
		);

		for (const [k, v] of Object.entries(player.progress))
			if (
				k.startsWith("seasonal-trophy-road-") &&
				v.bestTrophies >= player.bestTrophies
			)
				trophyProgress = v;
			else if (k.startsWith("AutoChess")) mergeTactics = v;
		return {
			title: `${escapeMarkdown(player.name)} (${player.tag})`,
			url: this.buildURL(`playerInfo?id=${player.tag.slice(1)}`),
			thumbnail: player.currentFavouriteCard?.iconUrls?.medium
				? { url: player.currentFavouriteCard.iconUrls.medium }
				: undefined,
			color: 0x5197ed,
			description: template`
			${
				trophyProgress.trophies != null && trophyProgress.bestTrophies != null
			}🏆 **Trofei**: ${trophyProgress.trophies?.toLocaleString(
				locale,
			)}/${trophyProgress.bestTrophies?.toLocaleString(locale)}
			${player.currentPathOfLegendSeasonResult?.trophies}<:ranked:${
				this.EMOJIS.pathOfLegends
			}> **Classificata**: ${player.currentPathOfLegendSeasonResult?.trophies}
			${mergeTactics}⭐ **Tattiche Royale**: ${mergeTactics?.trophies.toLocaleString(
				locale,
			)}/${mergeTactics?.bestTrophies.toLocaleString(locale)} (${
				mergeTactics?.arena.name
			})
			${trophyProgress.arena}<:arena:${this.EMOJIS.arena}> **Arena**: ${
				trophyProgress.arena?.name
			}
			${player.expLevel && player.expPoints != null}<:level:${
				this.EMOJIS.experienceIcon
			}> **Livello**: ${player.expLevel} (${player.expPoints?.toLocaleString(
				locale,
			)} XP)
			${player.starPoints != null}<:starlevel:${
				this.EMOJIS.starLevel
			}> **Punti stella**: ${player.starPoints?.toLocaleString(locale)}
			${daysPlayed}<:battle:${this.EMOJIS.battle}> **Media partite**: ${(
				(player.battleCount ?? 0) / daysPlayed
			).toLocaleString(locale, {
				maximumFractionDigits: 1,
			})}/giorno
			${player.currentFavouriteCard}⭐ **Carta preferita**: ${
				player.currentFavouriteCard?.name
			} 💧${player.currentFavouriteCard?.elixirCost}
			${playerId}👤 **Discord**: <@${playerId}>
			${daysPlayed}Account creato <t:${Math.round(
				(Date.now() - daysPlayed * TimeUnit.Day) / 1000,
			)}:R>
				`,
			fields: [
				{
					name: `<:clan:${this.EMOJIS.clan}> Clan`,
					value: player.clan
						? template`
							[${player.clan.name}](${this.buildURL(`clanInfo?id=${player.clan.tag}`)}) (${
								player.clan.tag
						  })
							${player.role}**Ruolo**: ${capitalize(player.role ?? "")}`
						: "*Nessun clan*",
				},
				{
					name: `<:cards:${this.EMOJIS.cards}> Mazzo battaglia`,
					value: template`${player.currentDeck
						.map(
							(c) =>
								`${c.name} (<:level:${this.EMOJIS.experienceIcon}> ${
									c.level + (LevelOffset[toUpperCase(c.rarity)] ?? 0)
								})`,
						)
						.reduce(
							(acc, cur, i, { length }) => {
								acc[Math.floor((2 * i) / length)]?.push(cur);
								return acc;
							},
							[[], []] as string[][],
						)
						.map((c) => c.join(", "))
						.join("\n")}
						Costo medio: **${(
							player.currentDeck.reduce(
								(sum, c) => sum + (c.elixirCost ?? 0),
								0,
							) / player.currentDeck.length
						).toLocaleString(locale, {
							maximumFractionDigits: 1,
						})}**💧 - [Copia](${this.buildURL(
						`copyDeck?deck=${player.currentDeck
							.map((c) => c.id)
							.join(";")}&l=Royals&id=${player.tag.slice(1)}`,
					)})`,
				},
				{
					name: `<:collection:${this.EMOJIS.cards}> Collezione`,
					value: template`
					${player.badges}<:badges:${
						this.EMOJIS.badges
					}> Emblemi: **${player.badges?.length.toLocaleString(locale)}**
					${player.cards}<:cards:${
						this.EMOJIS.cards
					}> Carte: **${player.cards?.length.toLocaleString(locale)}**
					${player.cards}<:level:${
						this.EMOJIS.experienceIcon
					}> Liv. medio: **${Math.round(
						percentile(
							player.cards
								?.map(
									(c) => c.level + (LevelOffset[toUpperCase(c.rarity)] ?? 0),
								)
								.sort((a, b) => b - a) ?? [],
							0.5,
						),
					)}**
					${player.supportCards}<:tower:${
						this.EMOJIS.tower
					}> Truppe torri: **${player.supportCards?.length.toLocaleString(
						locale,
					)}**
					`,
					inline: true,
				},
				{
					name: `<:donations:${this.EMOJIS.trader}> Donazioni`,
					value: template`
					${
						player.totalDonations != null
					}Totali: **${player.totalDonations?.toLocaleString(locale)}**
					${daysPlayed && player.totalDonations != null}Media: **${(
						(player.totalDonations ?? 0) / daysPlayed
					).toLocaleString(locale, {
						maximumFractionDigits: 1,
					})}/g**
					${player.donations != null}Settimanali: **${player.donations?.toLocaleString(
						locale,
					)}**
					${
						player.donationsReceived != null
					}Ricevute: **${player.donationsReceived?.toLocaleString(locale)}**
					`,
					inline: true,
				},
				{
					name: `<:tournament:${this.EMOJIS.tournament}> Sfide`,
					value: template`
						${player.challengeMaxWins != null}<:blueCrown:${
						this.EMOJIS.blueCrown
					}> Record vittorie: **${player.challengeMaxWins?.toLocaleString(
						locale,
					)}**
						${player.challengeCardsWon != null}<:cards:${
						this.EMOJIS.cards
					}> Carte vinte: **${player.challengeCardsWon?.toLocaleString(
						locale,
					)}**
						${player.tournamentBattleCount != null}<:battle:${
						this.EMOJIS.battle
					}> Batt. in tornei: **${player.tournamentBattleCount?.toLocaleString(
						locale,
					)}**
						${player.tournamentCardsWon != null}<:cards:${
						this.EMOJIS.cards
					}> Carte vinte: **${player.tournamentCardsWon?.toLocaleString(
						locale,
					)}**
						`,
					inline: true,
				},
				{
					name: "👑 Statistiche Royale",
					value: template`
						${player.wins != null}<:blueCrown:${
						this.EMOJIS.blueCrown
					}> Vittorie: **${player.wins?.toLocaleString(locale)}** (${(
						((player.wins ?? 0) / (player.battleCount || Infinity)) *
						100
					).toLocaleString(locale, { maximumFractionDigits: 2 })}%)
						${player.threeCrownWins != null}<:blueCrown:${
						this.EMOJIS.blueCrown
					}> 3 corone: **${player.threeCrownWins?.toLocaleString(locale)}** (${(
						((player.threeCrownWins ?? 0) / (player.wins || Infinity)) *
						100
					).toLocaleString(locale, { maximumFractionDigits: 2 })}%)
						${player.losses != null}<:redCrown:${
						this.EMOJIS.redCrown
					}> Sconfitte: **${player.losses?.toLocaleString(locale)}** (${(
						((player.losses ?? 0) / (player.battleCount || Infinity)) *
						100
					).toLocaleString(locale, { maximumFractionDigits: 2 })}%)
						${player.battleCount != null}<:battle:${
						this.EMOJIS.battle
					}> Battaglie totali: **${player.battleCount?.toLocaleString(locale)}**
						`,
					inline: true,
				},
				{
					name: `<:ranked:${this.EMOJIS.pathOfLegends}> Modalità Classificata`,
					value: template`
					${ranked[0]}Attuale: **${ranked[0]}**
					${ranked[1]}Ultima stagione: **${ranked[1]}**
					${ranked[2]}Stagione migliore: **${ranked[2]}**
					${
						player.legacyTrophyRoadHighScore != null
					}Record leghe vecchie: **${player.legacyTrophyRoadHighScore?.toLocaleString(
						locale,
					)}** 🏆
						`,
					inline: true,
				},
			],
		};
	};
	static "createClanMessage" = (
		clan: Clash.Clan,
		locale: Locale,
	): RESTPatchAPIInteractionOriginalResponseJSONBody => {
		const now = Date.now();
		const memberTrophies: number[] = [];
		const memberLevels: number[] = [];
		const staff: {
			leader: Pick<Clash.ClanMember, "name" | "tag">;
			coLeader: Pick<Clash.ClanMember, "name" | "tag">[];
			elder: Pick<Clash.ClanMember, "name" | "tag">[];
		} = {
			leader: { name: "", tag: "" },
			coLeader: [],
			elder: [],
		};

		for (const member of clan.memberList) {
			const role = toUpperCase(member.role);

			memberTrophies.push(member.trophies);
			memberLevels.push(member.expLevel);
			if (role === "LEADER") staff.leader = member;
			else if (role === "COLEADER")
				staff.coLeader.push({
					name: member.name,
					tag: member.tag,
				});
			else if (role === "ELDER")
				staff.elder.push({
					name: member.name,
					tag: member.tag,
				});
		}
		memberLevels.sort((a, b) => b - a);
		memberTrophies.sort((a, b) => b - a);
		return {
			embeds: [
				{
					title: `${clan.name} (${clan.tag})`,
					url: this.buildURL(`clanInfo?id=${clan.tag.slice(1)}`),
					color: 0x5197ed,
					description: Clash.sanitizeDescription(clan),
					fields: [
						{
							name: "📊 Dati generali",
							value: template`
							${clan.type}Tipo: **${ClanType[toUpperCase(clan.type)!]}**
							Posizione: **${clan.location?.name ?? "World"}**
							Membri: **${memberTrophies.length.toLocaleString(locale)}**
							Inattivi: **${
								clan.memberList.filter(
									(m) => now - Clash.parseAPIDate(m.lastSeen) > TimeUnit.Week,
								).length
							}**
							`,
							inline: true,
						},
						{
							name: "🏆 Punti",
							value: template`
							${clan.clanWarTrophies}Trofei guerra: **${clan.clanWarTrophies?.toLocaleString(
								locale,
							)}**
							${clan.clanScore}Punteggio: **${clan.clanScore?.toLocaleString(locale)}**
							Trofei richiesti: **${(clan.requiredTrophies ?? 0).toLocaleString(locale)}**
							Donazioni settimanali: **${(clan.donationsPerWeek ?? 0).toLocaleString(
								locale,
							)}**
							`,
							inline: true,
						},
						{
							name: `<:friends:${this.EMOJIS.friends}> Membri`,
							value: template`
							Trofei medi: **${Math.round(
								clan.memberList.reduce((p, c) => p + c.trophies, 0) /
									clan.memberList.length,
							).toLocaleString(locale)}**
							Mediana: **${Math.round(percentile(memberTrophies, 0.5)).toLocaleString(
								locale,
							)}**
							75° Percentile: **${Math.round(percentile(memberTrophies, 0.75)).toLocaleString(
								locale,
							)}**
							Livello medio: **${Math.round(percentile(memberLevels, 0.5)).toLocaleString(
								locale,
							)}**
							`,
							inline: true,
						},
						{
							name: "👥 Staff",
							value: template`
							${staff.leader.tag}Presidente: [${staff.leader.name}](${this.buildURL(
								`playerInfo?id=${staff.leader.tag.slice(1)}`,
							)})
							${staff.coLeader.length}Vicepresidenti: ${staff.coLeader
								.slice(0, 4)
								.map(
									(m) =>
										`[${m.name}](${this.buildURL(
											`playerInfo?id=${m.tag.slice(1)}`,
										)})`,
								)
								.join(", ")}
							${staff.elder.length}Anziani: ${staff.elder
								.slice(0, 4)
								.map(
									(m) =>
										`[${m.name}](${this.buildURL(
											`playerInfo?id=${m.tag.slice(1)}`,
										)})`,
								)
								.join(", ")}
							`.slice(0, 1024),
						},
					],
				},
			],
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.StringSelect,
							custom_id: "clash-player",
							placeholder: "Visualizza un membro...",
							options: clan.memberList.slice(0, 25).map((m) => ({
								label: `${m.clanRank}. ${m.name}`,
								value: m.tag,
								description: `➡️${m.donations} 🏆${m.trophies.toLocaleString(
									locale,
								)} 🕓${formatShortTime(
									now - Clash.parseAPIDate(m.lastSeen),
								)} fa`,
								emoji: {
									name: MemberEmoji[toUpperCase(m.role)] ?? "👤",
								},
							})),
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `clash-members--${clan.tag}---1`,
							style: ButtonStyle.Primary,
							label: "Lista Membri",
							emoji: { id: "1442230918952648875" },
						},
						{
							type: ComponentType.Button,
							custom_id: `clash-war--${clan.tag}`,
							style: ButtonStyle.Primary,
							label: "Guerra",
							emoji: { id: "1442125625052889128" },
						},
						{
							type: ComponentType.Button,
							custom_id: `clash-pastwar--${clan.tag}`,
							style: ButtonStyle.Primary,
							label: "Guerre passate",
							emoji: { name: "🏁" },
						},
					],
				},
			],
		};
	};
	static "createPlayerMessage" = (
		player: Clash.Player,
		userId: string,
		locale: Locale,
		playerId?: string,
		commandId?: string,
		link?: boolean,
	): RESTPatchAPIInteractionOriginalResponseJSONBody => {
		const components: APIActionRowComponent<APIButtonComponent>[] = [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						custom_id: `clash-cards--${player.tag}---1`,
						label: "Collezione",
						emoji: { id: "1442124435162136667" },
						style: ButtonStyle.Primary,
					},
				],
			},
		];

		if (link)
			components[0]!.components.unshift({
				type: ComponentType.Button,
				custom_id: `clash-link-${userId}-${player.tag}-${commandId || "0"}`,
				label: "Salva",
				emoji: { name: "🔗" },
				style: ButtonStyle.Success,
			});
		else if (link === false)
			components[0]!.components.unshift({
				type: ComponentType.Button,
				custom_id: `clash-unlink-${userId}-${player.tag}-${commandId || "0"}`,
				label: "Scollega",
				emoji: { name: "⛓️‍💥" },
				style: ButtonStyle.Danger,
			});
		if (player.clan.tag)
			components[0]!.components.push({
				type: ComponentType.Button,
				custom_id: `clash-clan--${player.clan.tag}`,
				label: "Clan",
				emoji: { id: "1442125625052889128" },
				style: ButtonStyle.Primary,
			});
		components[0]!.components.push({
			type: ComponentType.Button,
			custom_id: `clash-log-${userId}-${player.tag}`,
			label: "Battaglie",
			emoji: { name: "📜" },
			style: ButtonStyle.Primary,
		});
		return {
			embeds: [this.createPlayerEmbed(player, locale, playerId)],
			components,
		};
	};
	private static "parseAPIDate" = (d: string) =>
		Date.UTC(
			+d.slice(0, 4),
			+d.slice(4, 6) - 1,
			+d.slice(6, 8),
			+d.slice(9, 11),
			+d.slice(11, 13),
			+d.slice(13, 15),
		);
	private static "sanitizeDescription" = (clan: Clash.Clan) =>
		clan.description
			.replaceAll("|", " | ")
			.replace(
				/(?:\p{Extended_Pictographic}|\p{Regional_Indicator})+/gu,
				(s) => `${s} `,
			);
	static async "callApi"<T>(path: string, errors: Record<number, string> = {}) {
		Object.assign(errors, Clash.ERROR_MESSAGES);
		const request = new Request(
			new URL(path, "https://api.clashroyale.com/v1/"),
		);
		let res = await caches.default.match(request);

		if (!res) {
			const clone = request.clone();

			clone.headers.set(
				"Authorization",
				`Bearer ${env.CLASH_ROYALE_API_TOKEN}`,
			);
			res = await env.CLASH_ROYALE.fetch(clone);
			waitUntil(caches.default.put(request, res.clone()));
		}
		if (res.ok) return res.json<T>();
		const body = await res.text();
		const json = await Promise.try<{ message: string }, [string]>(
			JSON.parse,
			body,
		).catch(() => {});

		console.error(json ?? body);
		throw new Error(
			errors[res.status] ??
				`Errore interno: \`${json?.message ?? "Unknown error"}\``,
		);
	}
	static "getPlayer" = async (tag: string, edit?: BaseReplies["edit"]) => {
		try {
			tag = Brawl.normalizeTag(tag);
			return await Clash.callApi<Clash.Player>(
				`players/${encodeURIComponent(tag)}`,
				{
					404: "Giocatore non trovato.",
				},
			);
		} catch (err) {
			if (edit)
				throw await edit({
					content:
						err instanceof Error
							? err.message
							: "Non è stato possibile recuperare il profilo. Riprova più tardi.",
				});
			throw err;
		}
	};
	static "getBattleLog" = async (tag: string, edit?: BaseReplies["edit"]) => {
		try {
			tag = Brawl.normalizeTag(tag);
			return await Clash.callApi<Clash.BattleList>(
				`players/${encodeURIComponent(tag)}/battlelog`,
				{
					404: "Giocatore non trovato.",
				},
			);
		} catch (err) {
			if (edit)
				throw await edit({
					content:
						err instanceof Error
							? err.message
							: "Non è stato possibile recuperare il registro battaglie. Riprova più tardi.",
				});
			throw err;
		}
	};
	static "getClan" = async (tag: string, edit?: BaseReplies["edit"]) => {
		try {
			tag = Brawl.normalizeTag(tag);
			return await Clash.callApi<Clash.Clan>(
				`clans/${encodeURIComponent(tag)}`,
				{ 404: "Clan non trovato." },
			);
		} catch (err) {
			if (edit)
				throw await edit({
					content:
						err instanceof Error
							? err.message
							: "Non è stato possibile recuperare il clan. Riprova più tardi.",
				});
			throw err;
		}
	};
	static override async "chatInput"(
		replies: ChatInputReplies,
		args: ChatInputArgs<typeof Clash.chatInputData>,
	) {
		return this[
			`${args.subcommand.split(" ")[0] as "player" | "clan"}Command`
		]?.(replies, args as never);
	}
	static "playerCommand" = async (
		{ reply, defer, edit }: ChatInputReplies,
		{
			options,
			subcommand,
			user: { id },
			request: { url },
			interaction: {
				data: { id: commandId },
				locale,
			},
		}: ChatInputArgs<typeof Clash.chatInputData, `${"player"} ${string}`>,
	) => {
		const userId = options.tag ? undefined : id;
		options.tag ??=
			(await env.DB.prepare("SELECT clashTag FROM Users WHERE id = ?")
				.bind(id)
				.first("clashTag")) ?? undefined;
		if (!options.tag)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: `Non hai ancora collegato un profilo Clash Royale! Specifica il tag giocatore come parametro e poi clicca su **Salva**.`,
			});
		try {
			options.tag = Brawl.normalizeTag(options.tag);
		} catch (err) {
			return reply({
				flags: MessageFlags.Ephemeral,
				content:
					err instanceof Error ? err.message : "Il tag fornito non è valido.",
			});
		}
		defer();

		if (subcommand === "player view") {
			const [player, playerId] = await Promise.all([
				this.getPlayer(options.tag, edit),
				userId ??
					env.DB.prepare("SELECT id FROM Users WHERE clashTag = ?")
						.bind(options.tag)
						.first<string>("id"),
			]);

			return edit(
				this.createPlayerMessage(
					player,
					id,
					locale,
					playerId ?? undefined,
					commandId,
					userId ? false : playerId !== id,
				),
			);
		}
		if (subcommand === "player collection")
			return edit({
				components: this.createCardsComponents(
					await this.getPlayer(options.tag, edit),
					url,
					id,
					options.order,
				),
				flags: MessageFlags.IsComponentsV2,
			});
		throw new Error("Unknown command");
	};
	static "clanCommand" = async (
		{ defer, edit }: ChatInputReplies,
		{
			options,
			subcommand,
			user: { id },
			interaction: {
				locale,
				data: { id: commandId },
			},
		}: ChatInputArgs<typeof Clash.chatInputData, `${"clan"} ${string}`>,
	) => {
		defer();
		if (!options.tag) {
			const playerTag = await env.DB.prepare(
				"SELECT clashTag FROM Users WHERE id = ?",
			)
				.bind(id)
				.first<string>("clashTag");

			if (playerTag)
				options.tag = (await this.getPlayer(playerTag, edit)).clan.tag;
		}
		if (!options.tag)
			return edit({
				content: `Non hai ancora collegato un profilo Clash Royale! Specifica il tag del clan come parametro o collega un profilo con </clash profile:${commandId}>.`,
			});
		const clan = await this.getClan(options.tag, edit);

		if (subcommand === "clan view")
			return edit(this.createClanMessage(clan, locale));
		if (subcommand === "clan members")
			return edit({
				components: this.createMembersComponents(
					clan,
					locale,
					id,
					options.order,
				),
				flags: MessageFlags.IsComponentsV2,
			});
	};
	static "notify enable" = async (
		{ reply }: ChatInputReplies,
		{
			options: { type },
			user: { id },
			interaction: {
				data: { id: commandId },
			},
		}: ChatInputArgs<typeof Clash.chatInputData, "notify enable">,
	) => {
		const result = await env.DB.prepare(
			`INSERT INTO Users (id, clashNotifications)
				VALUES (?1, ?2)
				ON CONFLICT(id) DO UPDATE
				SET clashNotifications = Users.clashNotifications | ?2
				RETURNING clashNotifications, clashTag`,
		)
			.bind(id, NotificationType[type])
			.first<{ clashNotifications: number; clashTag: string | null }>();

		return reply({
			flags: MessageFlags.Ephemeral,
			content: template`
			Notifiche abilitate per il tipo **${type}**!
			Attualmente hai attivato le notifiche per ${this.calculateFlags(
				result?.clashNotifications,
			)}.
			${!result?.clashTag}-# Non hai ancora collegato un profilo Clash Royale! Usa il comando </clash profile:${commandId}> e clicca su **Salva** per iniziare a ricevere le notifiche.
			`,
		});
	};
	static "notify disable" = async (
		{ reply }: ChatInputReplies,
		{
			options: { type },
			user: { id },
			interaction: {
				data: { id: commandId },
			},
		}: ChatInputArgs<typeof Clash.chatInputData, "notify disable">,
	) => {
		const result = await env.DB.prepare(
			`UPDATE Users
				SET clashNotifications = Users.clashNotifications & ~?1
				WHERE id = ?2
				RETURNING clashNotifications, clashTag`,
		)
			.bind(NotificationType[type], id)
			.first<{ clashNotifications: number; clashTag: string | null }>();

		return reply({
			flags: MessageFlags.Ephemeral,
			content: template`
			Notifiche disabilitate per il tipo **${type}**!
			Attualmente hai attivato le notifiche per ${this.calculateFlags(
				result?.clashNotifications,
			)}.
			${!result?.clashTag}-# Non hai ancora collegato un profilo Clash Royale! Usa il comando </clash profile:${commandId}> e clicca su **Salva** per iniziare a ricevere le notifiche.
			`,
		});
	};
	static "notify view" = async (
		{ reply }: ChatInputReplies,
		{
			user: { id },
			interaction: {
				data: { id: commandId },
			},
		}: ChatInputArgs<typeof Clash.chatInputData, "notify view">,
	) => {
		const result = await env.DB.prepare(
			"SELECT clashNotifications, clashTag FROM Users WHERE id = ?",
		)
			.bind(id)
			.first<{ clashNotifications: number; clashTag: string | null }>();

		return reply({
			flags: MessageFlags.Ephemeral,
			content: template`
			Notifiche attive per i seguenti tipi: ${this.calculateFlags(
				result?.clashNotifications,
			)}.
			${!result?.clashTag}-# Non hai ancora collegato un profilo Clash Royale! Usa il comando </clash profile:${commandId}> e clicca su **Salva** per iniziare a ricevere le notifiche.
			`,
		});
	};
	static override async "component"(
		replies: ComponentReplies,
		args: ComponentArgs,
	) {
		const [action, userId] = args.args.splice(0, 2);

		if (!userId || args.user.id === userId)
			return this[`${action as "player"}Component`]?.(replies, args);
		return replies.reply({
			flags: MessageFlags.Ephemeral,
			content: "Questa azione non è per te!",
		});
	}
	static "linkComponent" = async (
		{ edit, deferUpdate }: ComponentReplies,
		{
			args: [tag, commandId],
			user: { id },
			interaction: {
				message: { components },
			},
		}: ComponentArgs,
	) => {
		deferUpdate();
		const player = await this.getPlayer(tag!, edit);
		let progress = Object.entries(player.progress).find(([k]) =>
			k.startsWith("seasonal-trophy-road-"),
		)?.[1];

		if (!progress || progress.bestTrophies < player.bestTrophies)
			progress = player;
		await env.DB.prepare(
			`INSERT INTO Users (id, clashTag, arena, league, cards)
				VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO
				UPDATE
				SET clashTag = excluded.clashTag,
					arena = excluded.arena,
					league = excluded.league,
					cards = excluded.cards`,
		)
			.bind(
				id,
				tag,
				progress.arena.id,
				player.currentPathOfLegendSeasonResult?.leagueNumber,
				JSON.stringify(
					player.cards?.map((b) => ({
						id: b.id,
						evolutionLevel: b.evolutionLevel,
					})) ?? [],
				),
			)
			.run();
		if (components?.[0]?.type === ComponentType.ActionRow)
			components[0].components[0] = {
				type: ComponentType.Button,
				custom_id: `clash-unlink-${id}-${tag}-${commandId || "0"}`,
				label: "Scollega",
				emoji: { name: "⛓️‍💥" },
				style: ButtonStyle.Danger,
			};
		return edit({
			content: `Profilo collegato con successo!\nUsa </clash notify enable:${
				commandId || "0"
			}> per attivare le notifiche.`,
			components,
		});
	};
	static "unlinkComponent" = async (
		{ update }: ComponentReplies,
		{
			args: [tag, commandId],
			user: { id },
			interaction: {
				message: { components },
			},
		}: ComponentArgs,
	) => {
		await env.DB.prepare(
			`UPDATE Users
				SET clashTag = NULL,
					clashTrophies = NULL,
					cards = NULL
				WHERE id = ?`,
		)
			.bind(id)
			.run();
		if (components?.[0]?.type === ComponentType.ActionRow)
			components[0].components[0] = {
				type: ComponentType.Button,
				custom_id: `clash-link-${id}-${tag}-${commandId || "0"}`,
				label: "Salva",
				emoji: { name: "🔗" },
				style: ButtonStyle.Success,
			};
		return update({ content: "Profilo scollegato con successo!", components });
	};
	static "cardsComponent" = async (
		{ defer, deferUpdate, edit }: ComponentReplies,
		{
			interaction: { data },
			request,
			args: [tag, order, page, replyFlag],
			user: { id },
		}: ComponentArgs,
	) => {
		if (replyFlag) defer({ flags: MessageFlags.Ephemeral });
		else deferUpdate();
		return edit({
			components: this.createCardsComponents(
				await this.getPlayer(tag!, edit),
				request.url,
				id,
				((data.component_type === ComponentType.StringSelect
					? data.values[0]
					: order) as keyof (typeof Clash)["CARDS_ORDER"] | "") || undefined,
				Number(page) || undefined,
			),
			flags: MessageFlags.IsComponentsV2,
		});
	};
	static "badgesComponent" = async (
		{ defer, deferUpdate, edit }: ComponentReplies,
		{
			interaction: { locale },
			request,
			args: [tag, page, replyFlag],
			user: { id },
		}: ComponentArgs,
	) => {
		if (replyFlag) defer({ flags: MessageFlags.Ephemeral });
		else deferUpdate();
		return edit({
			components: this.createBadgesComponents(
				await this.getPlayer(tag!, edit),
				request.url,
				id,
				locale,
				Number(page) || undefined,
			),
			flags: MessageFlags.IsComponentsV2,
		});
	};
	static "achievementsComponent" = async (
		{ defer, deferUpdate, edit }: ComponentReplies,
		{
			interaction: { locale },
			request,
			args: [tag, page, replyFlag],
			user: { id },
		}: ComponentArgs,
	) => {
		if (replyFlag) defer({ flags: MessageFlags.Ephemeral });
		else deferUpdate();
		return edit({
			components: this.createAchievementsComponents(
				await this.getPlayer(tag!, edit),
				request.url,
				id,
				locale,
				Number(page) || undefined,
			),
			flags: MessageFlags.IsComponentsV2,
		});
	};
	static "supportCardsComponent" = async (
		{ defer, deferUpdate, edit }: ComponentReplies,
		{
			interaction: { data },
			request,
			args: [tag, order, page, replyFlag],
			user: { id },
		}: ComponentArgs,
	) => {
		if (replyFlag) defer({ flags: MessageFlags.Ephemeral });
		else deferUpdate();
		const player = await this.getPlayer(tag!, edit);

		player.cards = player.supportCards ?? [];
		return edit({
			components: this.createCardsComponents(
				player,
				request.url,
				id,
				((data.component_type === ComponentType.StringSelect
					? data.values[0]
					: order) as keyof (typeof Clash)["CARDS_ORDER"] | "") || undefined,
				Number(page) || undefined,
				true,
			),
			flags: MessageFlags.IsComponentsV2,
		});
	};
	static "membersComponent" = async (
		{ defer, deferUpdate, edit }: ComponentReplies,
		{
			interaction: { data, locale },
			args: [tag, order, page, replyFlag],
			user: { id },
		}: ComponentArgs,
	) => {
		if (replyFlag) defer({ flags: MessageFlags.Ephemeral });
		else deferUpdate();
		return edit({
			components: this.createMembersComponents(
				await this.getClan(tag!, edit),
				locale,
				id,
				((data.component_type === ComponentType.StringSelect
					? data.values[0]
					: order) as keyof (typeof Clash)["MEMBERS_ORDER"] | "") || undefined,
				Number(page) || undefined,
			),
			flags: MessageFlags.IsComponentsV2,
		});
	};
	static "cardComponent" = async (
		{ deferUpdate, edit }: ComponentReplies,
		{
			args: [tag, card, order, page],
			user: { id },
			interaction: { locale },
		}: ComponentArgs,
	) => {
		deferUpdate();
		const player = await this.getPlayer(tag!, edit);
		const cardId = Number(card);
		let item = player.cards.find((b) => b.id === cardId);
		let supportCard = false;

		if (!item) {
			item = player.supportCards?.find((b) => b.id === cardId);
			supportCard = true;
		}
		if (item)
			return edit({
				components: this.createCardComponents(
					player,
					id,
					item,
					locale,
					(order as keyof (typeof Clash)["CARDS_ORDER"] | "") || undefined,
					Number(page) || undefined,
					supportCard,
				),
			});
	};
	static "playerComponent" = async (
		{ defer, edit, deferUpdate }: ComponentReplies,
		{
			user: { id },
			interaction: { data, locale },
			args: [tag, updateFlag],
		}: ComponentArgs,
	) => {
		if (data.component_type === ComponentType.StringSelect) [tag] = data.values;
		ok(tag);
		if (updateFlag) deferUpdate();
		else defer({ flags: MessageFlags.Ephemeral });
		const [player, playerId] = await Promise.all([
			this.getPlayer(tag, edit),
			env.DB.prepare("SELECT id FROM Users WHERE clashTag = ?")
				.bind(tag)
				.first<string>("id"),
		]);

		return edit(
			this.createPlayerMessage(
				player,
				id,
				locale,
				playerId ?? undefined,
				undefined,
				playerId !== id && (!playerId || undefined),
			),
		);
	};
	static "clanComponent" = async (
		{ defer, edit }: ComponentReplies,
		{ args: [tag], interaction: { locale } }: ComponentArgs,
	) => {
		defer({ flags: MessageFlags.Ephemeral });
		return edit(this.createClanMessage(await this.getClan(tag!, edit), locale));
	};
	static "logComponent" = async (
		{ defer, deferUpdate, edit }: ComponentReplies,
		{
			interaction: { locale },
			args: [tag, currentPage, replyFlag],
			user: { id },
		}: ComponentArgs,
	) => {
		if (replyFlag) defer({ flags: MessageFlags.Ephemeral });
		else deferUpdate();
		const battleLog = await this.getBattleLog(tag!, edit);

		const { page, component } = this.pagination(
			battleLog,
			1,
			`clash-log-${id}-${tag}`,
			Number(currentPage) || 0,
		);
		return edit({
			embeds: page.map((battle) => ({
				color:
					battle.team[0]!.crowns > battle.opponent[0]!.crowns
						? 0x2fceff
						: 0xff0063,
				description: template`
				### <:blueCrown:${this.EMOJIS.blueCrown}> ${battle.team[0]!.crowns} - ${
					battle.opponent[0]!.crowns
				} <:redCrown:${this.EMOJIS.redCrown}>
				**Tipo di battaglia**: ${
					BattleType[battle.type] ?? battle.type ?? "Sconosciuto"
				}
				${battle.gameMode?.name}**Modalità**: ${battle.gameMode?.name.replace("_", " ")}
				${battle.arena?.name}**Arena**: ${battle.arena?.name}
				`,
				fields: [
					...battle.team.slice(0, 2).map((player) => ({
						name: `${player.name} (${player.tag})`,
						value: template`
						Clan: ${
							player.clan
								? `[${player.clan?.name ?? "*Nessun Clan*"}](${this.buildURL(
										`clanInfo?id=${player.clan?.tag?.slice(1)}`,
								  )})`
								: "*Nessun Clan*"
						}
						Trofei: 🏆 **${player.startingTrophies?.toLocaleString(locale) ?? 0}**
						Elisir perso: 💧 **${player.elixirLeaked.toLocaleString(locale)}**
						<:tower:${
							player.princessTowersHitPoints?.[0]
								? this.EMOJIS.princessTower
								: this.EMOJIS.princessTowerGray
						}> **${
							player.princessTowersHitPoints?.[0]?.toLocaleString(locale) ?? 0
						}**  <:king:${
							player.kingTowerHitPoints
								? this.EMOJIS.blueKingHappy
								: this.EMOJIS.blueKingCry
						}> **${
							player.kingTowerHitPoints?.toLocaleString(locale) ?? 0
						}**  <:tower:${
							player.princessTowersHitPoints?.[1]
								? this.EMOJIS.princessTower
								: this.EMOJIS.princessTowerGray
						}> **${
							player.princessTowersHitPoints?.[1]?.toLocaleString(locale) ?? 0
						}**
						${1}${player.cards
							.map(
								(c) =>
									`${c.name} (<:level:${this.EMOJIS.experienceIcon}> ${
										c.level + (LevelOffset[toUpperCase(c.rarity)] ?? 0)
									})`,
							)
							.reduce(
								(acc, cur, i, { length }) => {
									acc[Math.floor((2 * i) / length)]?.push(cur);
									return acc;
								},
								[[], []] as string[][],
							)
							.map((c) => c.join(", "))
							.join("\n")}
						Costo medio: **${(
							player.cards.reduce((sum, c) => sum + (c.elixirCost ?? 0), 0) /
							player.cards.length
						).toLocaleString(locale, {
							maximumFractionDigits: 1,
						})}**💧 - [Copia](${this.buildURL(
							`copyDeck?deck=${player.cards
								.map((c) => c.id)
								.join(";")}&l=Royals&id=${player.tag.slice(1)}`,
						)})
						`,
					})),
					...battle.opponent.slice(0, 2).map((player) => ({
						name: `${player.name} (${player.tag})`,
						value: template`
						Clan: ${
							player.clan
								? `[${player.clan?.name ?? "*Nessun Clan*"}](${this.buildURL(
										`clanInfo?id=${player.clan?.tag?.slice(1)}`,
								  )})`
								: "*Nessun Clan*"
						}
						Trofei: 🏆 **${player.startingTrophies?.toLocaleString(locale) ?? 0}**
						Elisir perso: 💧 **${player.elixirLeaked.toLocaleString(locale)}**
						<:tower:${
							player.princessTowersHitPoints?.[0]
								? this.EMOJIS.princessTower
								: this.EMOJIS.princessTowerGray
						}> **${
							player.princessTowersHitPoints?.[0]?.toLocaleString(locale) ?? 0
						}**  <:king:${
							player.kingTowerHitPoints
								? this.EMOJIS.redKingHappy
								: this.EMOJIS.redKingCry
						}> **${
							player.kingTowerHitPoints?.toLocaleString(locale) ?? 0
						}**  <:tower:${
							player.princessTowersHitPoints?.[1]
								? this.EMOJIS.princessTower
								: this.EMOJIS.princessTowerGray
						}> **${
							player.princessTowersHitPoints?.[1]?.toLocaleString(locale) ?? 0
						}**
						${1}${player.cards
							.map(
								(c) =>
									`${c.name} (<:level:${this.EMOJIS.experienceIcon}> ${
										c.level + (LevelOffset[toUpperCase(c.rarity)] ?? 0)
									})`,
							)
							.reduce(
								(acc, cur, i, { length }) => {
									acc[Math.floor((2 * i) / length)]?.push(cur);
									return acc;
								},
								[[], []] as string[][],
							)
							.map((c) => c.join(", "))
							.join("\n")}
						Costo medio: **${(
							player.cards.reduce((sum, c) => sum + (c.elixirCost ?? 0), 0) /
							player.cards.length
						).toLocaleString(locale, {
							maximumFractionDigits: 1,
						})}**💧 - [Copia](${this.buildURL(
							`copyDeck?deck=${player.cards
								.map((c) => c.id)
								.join(";")}&l=Royals&id=${player.tag.slice(1)}`,
						)})
						`,
					})),
				],
				timestamp: new Date(this.parseAPIDate(battle.battleTime)).toISOString(),
			})),
			components: [
				component,
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `clash-player-${id}-${tag}-1`,
							style: ButtonStyle.Primary,
							label: "Profilo",
							emoji: { name: "👤" },
						},
					],
				},
			],
		});
	};
	private static "buildURL" = (action: string) =>
		`https://link.clashroyale.com?clashroyale://${action}`;
}
