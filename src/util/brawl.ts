import {
	ActionRowBuilder,
	ButtonBuilder,
	ContainerBuilder,
	EmbedBuilder,
	SectionBuilder,
} from "@discordjs/builders";
import {
	APIMessageTopLevelComponent,
	ButtonStyle,
} from "discord-api-types/v10";
import type { Player } from "./brawlTypes";
import type { Env } from "./types";

export const getProfile = async (tag: string, env: Env) => {
	tag = tag.toUpperCase().replace(/O/g, "0");
	if (!tag.startsWith("#")) tag = `#${tag}`;
	if (!/^#[0289PYLQGRJCUV]{2,14}$/.test(tag))
		throw new TypeError("Tag giocatore non valido.");
	const res = await fetch(
		`https://api.brawlstars.com/v1/players/${encodeURIComponent(tag)}`,
		{
			cf: {
				cacheEverything: true,
				cacheTtl: 40,
				cacheTtlByStatus: { "500-599": 10, "404": 86400 },
			},
			headers: {
				Authorization: `Bearer ${env.BRAWL_STARS_API_TOKEN}`,
			},
		},
	);
	if (res.status === 404) throw new Error("Giocatore non trovato.");
	if (res.status !== 200) {
		console.log(res.status, res.statusText, await res.text());
		throw new Error("Si è verificato un errore imprevisto! Riprova più tardi.");
	}
	return res.json<Player>();
};

const roboRumbleLevels = [
	"*None*",
	"Normale",
	"Difficile",
	"Esperto",
	"Master",
	"Smodata",
	"Smodata II",
	"Smodata III",
	"Smodata IV",
	"Smodata V",
	"Smodata VI",
	"Smodata VII",
	"Smodata VIII",
	"Smodata IX",
	"Smodata X",
	"Smodata XI",
	"Smodata XII",
	"Smodata XIII",
	"Smodata XIV",
	"Smodata XV",
	"Smodata XVI",
];

export const createPlayerEmbed = (player: Player) =>
	new EmbedBuilder()
		.setTitle(`${player.name} (${player.tag})`)
		.setThumbnail(
			`https://cdn.brawlify.com/profile-icons/regular/${player.icon.id}.png`,
		)
		.setColor(
			player.nameColor ? parseInt(player.nameColor.slice(4), 16) : 0xffffff,
		)
		.setDescription(
			`Brawlers: **${player.brawlers.length}**\nClub: ${
				player.club.tag
					? `**${player.club.name}** (${player.club.tag})`
					: "*In nessun club*"
			}`,
		)
		.addFields(
			{
				name: "🏆 Trofei",
				value: `**Attuali**: ${player.trophies}\n**Record**: ${player.highestTrophies}`,
				inline: true,
			},
			{
				name: "🏅 Vittorie",
				value: `**3v3**: ${player["3vs3Victories"]}\n**Solo**: ${player.soloVictories}\n**Duo**: ${player.duoVictories}`,
				inline: true,
			},
			{
				name: "📊 Altre statistiche",
				value: `**Robo Rumble**: ${roboRumbleLevels[player.bestRoboRumbleTime]}\n**Big Game**: ${roboRumbleLevels[player.bestTimeAsBigBrawler]}`,
				inline: true,
			},
		)
		.toJSON();

export const createBrawlersComponents = (
	player: Player,
	host: string,
	page = 0,
): APIMessageTopLevelComponent[] => {
	const pages = Math.ceil(player.brawlers.length / 10);

	return [
		new ContainerBuilder()
			.addMediaGalleryComponents((g) =>
				g.addItems((i) => i.setURL(`https://${host}/brawlers.png`)),
			)
			.addSectionComponents(
				player.brawlers
					.slice(0, 10)
					.flatMap((brawler) =>
						new SectionBuilder()
							.addTextDisplayComponents((t) =>
								t.setContent(
									`**${brawler.name}**\t${["<:gadget:1412823343953874964>".repeat(brawler.gadgets.length), "<:gear:1412824093572731003>".repeat(brawler.gears.length), "<:starpower:1412824566392426689>".repeat(brawler.starPowers.length)].filter(Boolean).join(" ")}\nLivello ${brawler.power} - Rank ${brawler.rank} - ${brawler.trophies} trofei (record ${brawler.highestTrophies})`,
								),
							)
							.setButtonAccessory((b) =>
								b
									.setStyle(ButtonStyle.Secondary)
									.setCustomId(`brawl-brawler-${brawler.id}`)
									.setLabel("Dettagli"),
							),
					),
			)
			.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setLabel("Precedente")
						.setCustomId(`brawl-brawlers-${Math.max(0, page - 1)}`)
						.setDisabled(!page)
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setLabel(`Pagina ${page + 1} di ${pages}`)
						.setCustomId("-")
						.setDisabled(true)
						.setStyle(ButtonStyle.Secondary),
					new ButtonBuilder()
						.setLabel("Successivo")
						.setCustomId(`brawl-brawlers-${Math.min(page + 1, pages - 1)}`)
						.setDisabled(page >= pages - 1)
						.setStyle(ButtonStyle.Primary),
				),
			)
			.toJSON(),
	];
};

export enum NotificationType {
	"Brawler Tier Max" = 1 << 0,
	"New Brawler" = 1 << 2,
	"Trophy Road Advancement" = 1 << 3,
	"All" = 1 << 4,
}

export const calculateFlags = (flags = 0) =>
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
