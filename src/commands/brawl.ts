import { env, waitUntil } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	PermissionFlagsBits,
	SeparatorSpacingSize,
	type APIActionRowComponent,
	type APIButtonComponent,
	type APIEmbed,
	type APIMessageTopLevelComponent,
	type APISectionComponent,
	type Locale,
	type RESTPatchAPIInteractionOriginalResponseJSONBody,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { NotificationType } from "../BrawlNotifications.ts";
import Command from "../Command.ts";
import capitalize from "../util/capitalize.ts";
import { percentile } from "../util/maths.ts";
import { ok } from "../util/node.ts";

enum BrawlerOrder {
	Name,
	MostTrophies,
	LeastTrophies,
	PowerLevel,
}
enum MembersOrder {
	MostTrophies,
	LeastTrophies,
	Name,
	Role,
}
enum ClubType {
	open = "Aperto",
	inviteOnly = "Su invito",
	closed = "Chiuso",
	unknown = "Sconosciuto",
}
enum MemberEmoji {
	president = "👑",
	vicePresident = "⭐",
	senior = "🔰",
	member = "👤",
	notMember = "❌",
	unknown = "❓",
}
enum MemberRole {
	president,
	vicePresident,
	senior,
	member,
	notMember,
	unknown,
}
enum ResolvedMemberRole {
	president = "Presidente",
	vicePresident = "Vicepresidente",
	senior = "Anziano",
	member = "Socio",
	notMember = "Non socio",
	unknown = "Sconosciuto",
}

export class Brawl extends Command {
	static "NOTIFICATION_TYPES" = [
		"Brawler Tier Max",
		"New Brawler",
		"Trophy Road Advancement",
		"All",
	] as const;
	static readonly "BRAWLER_EMOJIS": RecursiveReadonly<
		Record<string, [string, string, string, string]>
	> = {
		"0": [
			"1431299153513807992",
			"1431299155430608896",
			"1431299157125103741",
			"1431299159775907860",
		],
		"16000000": [
			"1431298231349809295",
			"1431298233681973390",
			"1431298236022394902",
			"1431298238136188969",
		],
		"16000001": [
			"1431298240367689729",
			"1431298242574028851",
			"1431298244675240048",
			"1431298247544148109",
		],
		"16000002": [
			"1431298249800810760",
			"1431298252162207824",
			"1431298254464880722",
			"1431298256784068741",
		],
		"16000003": [
			"1431298258822496367",
			"1431298261192278026",
			"1431298263964717068",
			"1431298266389155981",
		],
		"16000004": [
			"1431298268322726041",
			"1431298270394843156",
			"1431298272563298385",
			"1431298274886684763",
		],
		"16000005": [
			"1431298277612978307",
			"1431298279794020493",
			"1431298281891168337",
			"1431298283942449233",
		],
		"16000006": [
			"1431298285909446836",
			"1431298288685944832",
			"1431298290930028664",
			"1431298293320909003",
		],
		"16000007": [
			"1431298295342436365",
			"1431298297993232384",
			"1431298300312551639",
			"1431298302909091962",
		],
		"16000008": [
			"1431298305098252389",
			"1431298307707240627",
			"1431298310106513438",
			"1431298312241156219",
		],
		"16000009": [
			"1431298314560864286",
			"1431298316489986141",
			"1431298318700646420",
			"1431298321636528293",
		],
		"16000010": [
			"1431298324098584669",
			"1431298326321696859",
			"1431298328611520656",
			"1431298330696356071",
		],
		"16000011": [
			"1431298332822732923",
			"1431298335163023403",
			"1431298338183057418",
			"1431298340385067099",
		],
		"16000012": [
			"1431298343123816601",
			"1431298345372225737",
			"1431298347926552617",
			"1431298350149533747",
		],
		"16000013": [
			"1431298352414462083",
			"1431298355069456394",
			"1431298356910751756",
			"1431298359389327370",
		],
		"16000014": [
			"1431298361557913631",
			"1431298363860717719",
			"1431298366075043981",
			"1431298367912415266",
		],
		"16000015": [
			"1431298370131202218",
			"1431298372068970576",
			"1431298374342152394",
			"1431298376586231898",
		],
		"16000016": [
			"1431298378687582373",
			"1431298381141119117",
			"1431298383355711680",
			"1431298385427697865",
		],
		"16000017": [
			"1431298387856326656",
			"1431298389743632435",
			"1431298392117608639",
			"1431298394193788929",
		],
		"16000018": [
			"1431298396462780574",
			"1431298399659102208",
			"1431298401735278733",
			"1431298403895218247",
		],
		"16000019": [
			"1431298406076252250",
			"1431298408198705307",
			"1431298410941780109",
			"1431298413449711857",
		],
		"16000020": [
			"1431298415995781302",
			"1431298418189406379",
			"1431298420186022052",
			"1431298422610202744",
		],
		"16000021": [
			"1431298424728326315",
			"1431298427030995074",
			"1431298431376167002",
			"1431298433318129886",
		],
		"16000022": [
			"1431298435750821907",
			"1431298438888161392",
			"1431298441245495358",
			"1431298443413819463",
		],
		"16000023": [
			"1431298445896847503",
			"1431298448501772459",
			"1431298450556977364",
			"1431298453031616613",
		],
		"16000024": [
			"1431298455149613238",
			"1431298457309544558",
			"1431298459272741136",
			"1431298462216884317",
		],
		"16000025": [
			"1431298464519557120",
			"1431298466948317346",
			"1431298469221498991",
			"1431298471348015104",
		],
		"16000026": [
			"1431298473537572965",
			"1431298475932254268",
			"1431298478419611760",
			"1431298480630140969",
		],
		"16000027": [
			"1431298483201249311",
			"1431298485604319392",
			"1431298487953391760",
			"1431298490163793930",
		],
		"16000028": [
			"1431298492550348821",
			"1431298494626402304",
			"1431298496845058098",
			"1431298499433070813",
		],
		"16000029": [
			"1431298501660246117",
			"1431298503723712652",
			"1431298505879847107",
			"1431298508182519808",
		],
		"16000030": [
			"1431298510317293600",
			"1431298513072947310",
			"1431298515233144965",
			"1431298518076883054",
		],
		"16000031": [
			"1431298520110858362",
			"1431298522937819278",
			"1431298526905761844",
			"1431298529455771700",
		],
		"16000032": [
			"1431298531796451338",
			"1431298534061113456",
			"1431298536162459679",
			"1431298538360406097",
		],
		"16000034": [
			"1431298541342691452",
			"1431298543712473108",
			"1431298545759293482",
			"1431298547919097999",
		],
		"16000035": [
			"1431298550108651532",
			"1431298552583160023",
			"1431298554781241507",
			"1431298557167796274",
		],
		"16000036": [
			"1431298559629721701",
			"1431298561781272781",
			"1431298565875044364",
			"1431298568148488343",
		],
		"16000037": [
			"1431298571294216273",
			"1431298573730975899",
			"1431298576117399652",
			"1431298578780782654",
		],
		"16000038": [
			"1431298581213741158",
			"1431298583394779248",
			"1431298586041258085",
			"1431298588956299394",
		],
		"16000039": [
			"1431298591078613063",
			"1431298593226231888",
			"1431298595583430767",
			"1431298597785436283",
		],
		"16000040": [
			"1431298600033583174",
			"1431298602939973662",
			"1431298605561680025",
			"1431298607817949367",
		],
		"16000041": [
			"1431298610498109520",
			"1431298613392441538",
			"1431298615451713688",
			"1431298617523568710",
		],
		"16000042": [
			"1431298619708805302",
			"1431298621667545129",
			"1431298624322797761",
			"1431298626726006975",
		],
		"16000043": [
			"1431298629179801760",
			"1431298631297798185",
			"1431298633474637844",
			"1431298635731308665",
		],
		"16000044": [
			"1431298637803163759",
			"1431298640110157824",
			"1431298642228285462",
			"1431298644514046043",
		],
		"16000045": [
			"1431298646556545116",
			"1431298648901419119",
			"1431298651430326452",
			"1431298653527478364",
		],
		"16000046": [
			"1431298656065294448",
			"1431298658552512542",
			"1431298660695675051",
			"1431298663279497267",
		],
		"16000047": [
			"1431298666181955634",
			"1431298668408868955",
			"1431298670296436737",
			"1431298672951562352",
		],
		"16000048": [
			"1431298675275206768",
			"1431298678785572967",
			"1431298680844976268",
			"1431298682677887049",
		],
		"16000049": [
			"1431298685542596729",
			"1431298687706861588",
			"1431298690047410196",
			"1431298692341563583",
		],
		"16000050": [
			"1431298694942036033",
			"1431298697702019225",
			"1431298700046762280",
			"1431298702705819828",
		],
		"16000051": [
			"1431298705054765243",
			"1431298707659165836",
			"1431298709752123442",
			"1431298712315101235",
		],
		"16000052": [
			"1431298714659590184",
			"1431298717402796032",
			"1431298719810064480",
			"1431298722398208120",
		],
		"16000053": [
			"1431298724205826191",
			"1431298726684655936",
			"1431298728987459634",
			"1431298731638128740",
		],
		"16000054": [
			"1431298734045663385",
			"1431298736474292304",
			"1431298738420187176",
			"1431298740731248700",
		],
		"16000056": [
			"1431298742883193062",
			"1431298744829083784",
			"1431298747333087413",
			"1431298749119856824",
		],
		"16000057": [
			"1431298751061819620",
			"1431298753763082367",
			"1431298756539842664",
			"1431298759463141492",
		],
		"16000058": [
			"1431298762227187744",
			"1431298764412293261",
			"1431298767046312038",
			"1431298769122627614",
		],
		"16000059": [
			"1431298771580485752",
			"1431298773933494292",
			"1431298775757885512",
			"1431298778442240124",
		],
		"16000060": [
			"1431298780828798977",
			"1431298783785783336",
			"1431298785736134757",
			"1431298788818948250",
		],
		"16000061": [
			"1431298792279248981",
			"1431298794498298079",
			"1431298796863619297",
			"1431298799380336671",
		],
		"16000062": [
			"1431298802182131824",
			"1431298804870549824",
			"1431298807819276328",
			"1431298810394448082",
		],
		"16000063": [
			"1431298813167140946",
			"1431298815323013241",
			"1431298817612972103",
			"1431298821400432711",
		],
		"16000064": [
			"1431298824055291997",
			"1431298826190454875",
			"1431298828375691355",
			"1431298830778765476",
		],
		"16000065": [
			"1431298833643475225",
			"1431298836189417574",
			"1431298838588821606",
			"1431298840748884060",
		],
		"16000066": [
			"1431298843810730024",
			"1431298846117335041",
			"1431298848529059860",
			"1431298851389575228",
		],
		"16000067": [
			"1431298854057148437",
			"1431298856494301335",
			"1431298859182854144",
			"1431298861388795964",
		],
		"16000068": [
			"1431298863783874811",
			"1431298866187210883",
			"1431298868695404594",
			"1431298871325360149",
		],
		"16000069": [
			"1431298873871044628",
			"1431298876094152937",
			"1431298878346625096",
			"1431298880292524124",
		],
		"16000070": [
			"1431298882964553750",
			"1431298885959028787",
			"1431298888102576209",
			"1431298890639867934",
		],
		"16000071": [
			"1431298893320028261",
			"1431298895404601356",
			"1431298898919690331",
			"1431298901339803678",
		],
		"16000072": [
			"1431298903478894612",
			"1431298905831768105",
			"1431298908272853102",
			"1431298910990762024",
		],
		"16000073": [
			"1431298913956003881",
			"1431298916418326528",
			"1431298919341625457",
			"1431298922084696207",
		],
		"16000074": [
			"1431298924743884982",
			"1431298927096762510",
			"1431298929516875898",
			"1431298932130189476",
		],
		"16000075": [
			"1431298934164426753",
			"1431298936563437718",
			"1431298938958512391",
			"1431298941667774494",
		],
		"16000076": [
			"1431298944813764709",
			"1431298947338731753",
			"1431298949528027380",
			"1431298951650214110",
		],
		"16000077": [
			"1431298954385031198",
			"1431298956775788564",
			"1431298959133118514",
			"1431298961536192682",
		],
		"16000078": [
			"1431298963591663718",
			"1431298971849986149",
			"1431298974152921160",
			"1431298976555991151",
		],
		"16000079": [
			"1431298978841886982",
			"1431298982327615639",
			"1431298984814710784",
			"1431298986815389839",
		],
		"16000080": [
			"1431298989075992728",
			"1431298991512879195",
			"1431298994063282247",
			"1431298996168560732",
		],
		"16000081": [
			"1431298999465545800",
			"1431299002254626968",
			"1431299005081583656",
			"1431299007694766133",
		],
		"16000082": [
			"1431299010039251068",
			"1431299012425814098",
			"1431299014879481946",
			"1431299017387540772",
		],
		"16000083": [
			"1431299019845406964",
			"1431299022324371628",
			"1431299024035778612",
			"1431299026648830052",
		],
		"16000084": [
			"1431299029500825723",
			"1431299032390701116",
			"1431299035062468628",
			"1431299037864267827",
		],
		"16000085": [
			"1431299040372457664",
			"1431299042553364711",
			"1431299044898115757",
			"1431299052158324739",
		],
		"16000086": [
			"1431299054851063902",
			"1431299057220845669",
			"1431299059632836658",
			"1431299062040105002",
		],
		"16000087": [
			"1431299064682647702",
			"1431299067161346199",
			"1431299069560488087",
			"1431299071628279919",
		],
		"16000089": [
			"1431299074044330137",
			"1431299076560916604",
			"1431299078704070729",
			"1431299081321447607",
		],
		"16000090": [
			"1431299084236357823",
			"1431299086627377192",
			"1431299089429172325",
			"1431299091450822801",
		],
		"16000091": [
			"1431299095087157329",
			"1431299097444483144",
			"1431299099453427784",
			"1431299102397694183",
		],
		"16000092": [
			"1431299104926863362",
			"1431299107837841408",
			"1431299110442635295",
			"1431299112900362441",
		],
		"16000093": [
			"1431299115077341236",
			"1431299117820284928",
			"1431299120387330048",
			"1431299122719101130",
		],
		"16000094": [
			"1431299124782694522",
			"1431299127647404052",
			"1431299130033963098",
			"1431299132345024582",
		],
		"16000095": [
			"1431299135105011712",
			"1431299137244102686",
			"1431299139563552852",
			"1431299141807636691",
		],
		"16000096": [
			"1431299144122630217",
			"1431299146438152384",
			"1431299149113852154",
			"1431299150921732158",
		],
	};
	static readonly "ROBO_RUMBLE_LEVELS" = [
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
	private static readonly "ERROR_MESSAGES" = {
		400: "Parametri non validi forniti.",
		403: "Accesso all'API negato.",
		404: "Dati non trovati.",
		429: "Limite di richieste API raggiunto.",
		500: "Errore interno dell'API.",
		503: "Manutenzione in corso!",
	};
	static override "chatInputData" = {
		name: "brawl",
		description: "Interagisci con Brawl Stars!",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "notify",
				description: "Gestisci le notifiche per il tuo profilo Brawl Stars",
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
				description: "Visualizza un giocatore Brawl Stars",
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
									"Il tag giocatore (es. #8QJR0YC). Di default viene usato quello salvato",
								type: ApplicationCommandOptionType.String,
							},
						],
					},
					{
						name: "link",
						description: "Collega il tuo profilo Brawl Stars!",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "tag",
								description: "Il tuo tag giocatore (es. #8QJR0YC)",
								type: ApplicationCommandOptionType.String,
								required: true,
							},
							{
								name: "user",
								description:
									"Opzione privata. L'utente al quale collegare il tag",
								type: ApplicationCommandOptionType.User,
							},
						],
					},
					{
						name: "brawlers",
						description: "Vedi i brawler posseduti da un giocatore",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "tag",
								description:
									"Il tag giocatore (es. #8QJR0YC). Di default viene usato quello salvato",
								type: ApplicationCommandOptionType.String,
							},
							{
								name: "order",
								description: "Come ordinare i brawler (default. Nome)",
								type: ApplicationCommandOptionType.Number,
								choices: [
									{ name: "Nome", value: BrawlerOrder.Name },
									{ name: "Più Trofei", value: BrawlerOrder.MostTrophies },
									{ name: "Meno Trofei", value: BrawlerOrder.LeastTrophies },
									{ name: "Livello", value: BrawlerOrder.PowerLevel },
								],
							},
						],
					},
				],
			},
			{
				name: "club",
				description: "Visualizza un club Brawl Stars",
				type: ApplicationCommandOptionType.SubcommandGroup,
				options: [
					{
						name: "view",
						description: "Vedi i dettagli di un club!",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "tag",
								description:
									"Il tag del club (es. #2UPUQCYLR). Di default viene usato quello del profilo salvato",
								type: ApplicationCommandOptionType.String,
							},
						],
					},
					{
						name: "members",
						description: "Vedi i membri di un club",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "tag",
								description:
									"Il tag del club (es. #2UPUQCYLR). Di default viene usato quello del profilo salvato",
								type: ApplicationCommandOptionType.String,
							},
							{
								name: "order",
								description: "Come ordinare i membri (default. Nome)",
								type: ApplicationCommandOptionType.Number,
								choices: [
									{ name: "Nome", value: MembersOrder.Name },
									{ name: "Più Trofei", value: MembersOrder.MostTrophies },
									{ name: "Meno Trofei", value: MembersOrder.LeastTrophies },
									{ name: "Ruolo", value: MembersOrder.Role },
								],
							},
						],
					},
				],
			},
		],
	} as const satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	static "calculateFlags" = (flags = 0) =>
		flags & NotificationType.All ? "**tutti i tipi**"
		: flags ?
			Object.values(NotificationType)
				.filter((v): v is number => typeof v === "number" && (flags & v) !== 0)
				.map((v) => `**${NotificationType[v]}**`)
				.join(", ")
		:	"**nessun tipo**";
	static "createBrawlerComponents" = (
		player: Brawl.Player,
		userId: string,
		brawler: Brawl.BrawlerStat,
		order = BrawlerOrder.Name,
		page = 0,
	): APIMessageTopLevelComponent[] => [
		{
			type: ComponentType.Container,
			components: [
				{
					type: ComponentType.Section,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: `## ${brawler.name}\n<:level:1431299161717866536> Lvl. ${
								brawler.power
							}\t🏆 ${brawler.trophies}  🔝 ${
								brawler.highestTrophies
							}\n- <:gadget:1431298224966336639> **${brawler.gadgets.length}**${
								brawler.gadgets.length ? ": " : ""
							}${brawler.gadgets
								.map((g) =>
									g.name.toLowerCase().split(" ").map(capitalize).join(" "),
								)
								.join(", ")}\n- <:gear:1431298227105300593> **${
								brawler.gears.length
							}**${brawler.gears.length ? ": " : ""}${brawler.gears
								.map((g) =>
									g.name.toLowerCase().split(" ").map(capitalize).join(" "),
								)
								.join(", ")}\n- <:starpower:1431298229328150649> **${
								brawler.starPowers.length
							}**${brawler.starPowers.length ? ": " : ""}${brawler.starPowers
								.map((g) =>
									g.name.toLowerCase().split(" ").map(capitalize).join(" "),
								)
								.join(", ")}`,
						},
					],
					accessory: {
						type: ComponentType.Thumbnail,
						media: {
							url: `https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`,
						},
					},
				},
				{ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Large },
				{
					type: ComponentType.MediaGallery,
					items: [
						{
							media: {
								url: `https://cdn.brawlify.com/brawlers/model/${brawler.id}.png`,
							},
						},
						{
							media: {
								url: `https://cdn.brawlify.com/brawlers/emoji/${brawler.id}.png`,
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
							custom_id: `brawl-brawlers-${userId}-${player.tag}-${order}-${page}`,
							style: ButtonStyle.Secondary,
						},
					],
				},
			],
		},
	];
	static "createBrawlersComponents" = (
		player: Brawl.Player,
		url: string,
		id: string,
		order = BrawlerOrder.Name,
		page = 0,
	): APIMessageTopLevelComponent[] => {
		const pages = Math.ceil(player.brawlers.length / 10);

		player.brawlers.sort(
			order === BrawlerOrder.Name ? (a, b) => a.name.localeCompare(b.name)
			: order === BrawlerOrder.MostTrophies ?
				(a, b) =>
					b.trophies - a.trophies || b.highestTrophies - a.highestTrophies
			: order === BrawlerOrder.LeastTrophies ?
				(a, b) =>
					a.trophies - b.trophies || a.highestTrophies - b.highestTrophies
			:	(a, b) => b.power - a.power,
		);
		return [
			{
				type: ComponentType.Container,
				components: [
					{
						type: ComponentType.MediaGallery,
						items: [{ media: { url: new URL("/brawlers.png", url).href } }],
					},
					...player.brawlers
						.slice(page * 10, (page + 1) * 10)
						.flatMap((brawler): APISectionComponent => {
							const [l1, l2, l3, l4] =
								this.BRAWLER_EMOJIS[String(brawler.id)] ??
								this.BRAWLER_EMOJIS["0"]!;

							return {
								type: ComponentType.Section,
								components: [
									{
										type: ComponentType.TextDisplay,
										content: `<:l1:${l1}><:l2:${l2}>\t**${brawler.name}**\t${
											brawler.gadgets.length ?
												"<:gadget:1431298224966336639>"
											:	" \t "
										}${
											brawler.gears.length ?
												"<:gear:1431298227105300593>"
											:	" \t "
										}${
											brawler.starPowers.length ?
												"<:starpower:1431298229328150649>"
											:	" \t "
										}${
											brawler.gears.length >= 2 ?
												"<:gear:1431298227105300593>"
											:	""
										}\n<:l3:${l3}><:l4:${l4}>\t<:level:1431299161717866536> ${
											brawler.power
										}\t🏆 ${brawler.trophies}  🔝 ${brawler.highestTrophies}`,
									},
								],
								accessory: {
									type: ComponentType.Button,
									style: ButtonStyle.Secondary,
									custom_id: `brawl-brawler-${id}-${player.tag}-${brawler.id}-${order}-${page}`,
									label: "Dettagli",
								},
							};
						}),
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								emoji: { name: "⬅️" },
								custom_id: `brawl-brawlers-${id}-${player.tag}-${order}-${
									page - 1
								}`,
								disabled: !page,
								style: ButtonStyle.Primary,
							},
							{
								type: ComponentType.Button,
								label: `Pagina ${page + 1} di ${pages}`,
								custom_id: "brawl",
								disabled: true,
								style: ButtonStyle.Secondary,
							},
							{
								type: ComponentType.Button,
								emoji: { name: "➡️" },
								custom_id: `brawl-brawlers-${id}-${player.tag}-${order}-${
									page + 1
								}`,
								disabled: page >= pages - 1,
								style: ButtonStyle.Primary,
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.StringSelect,
								options: [
									{
										label: "Nome",
										value: String(BrawlerOrder.Name),
										default: order === BrawlerOrder.Name,
									},
									{
										label: "Più trofei",
										value: String(BrawlerOrder.MostTrophies),
										default: order === BrawlerOrder.MostTrophies,
									},
									{
										label: "Meno trofei",
										value: String(BrawlerOrder.LeastTrophies),
										default: order === BrawlerOrder.LeastTrophies,
									},
									{
										label: "Livello",
										value: String(BrawlerOrder.PowerLevel),
										default: order === BrawlerOrder.PowerLevel,
									},
								],
								custom_id: `brawl-brawlers-${id}-${player.tag}--${page}`,
								placeholder: "Ordina per...",
							},
						],
					},
				],
			},
		];
	};
	static "createMembersComponents" = (
		club: Brawl.Club,
		locale: string,
		id: string,
		order = MembersOrder.MostTrophies,
		page = 0,
	): APIMessageTopLevelComponent[] => {
		const pages = Math.ceil(club.members.length / 10);
		const members = club.members.map((m) => m.trophies).sort((a, b) => b - a);

		club.members.sort(
			order === MembersOrder.Name ? (a, b) => a.name.localeCompare(b.name)
			: order === MembersOrder.MostTrophies ? (a, b) => b.trophies - a.trophies
			: order === MembersOrder.LeastTrophies ? (a, b) => a.trophies - b.trophies
			: (a, b) => MemberRole[a.role] - MemberRole[b.role],
		);
		return [
			{
				type: ComponentType.Container,
				components: [
					{
						type: ComponentType.Section,
						components: [
							{
								type: ComponentType.TextDisplay,
								content: `## ${club.name} (${
									club.tag
								})\n- Trofei medi: 🏆 ${Math.round(
									club.trophies / club.members.length,
								).toLocaleString(locale)}\n- Mediana: 🏆 ${Math.round(
									percentile(members, 0.5),
								).toLocaleString(locale)}\n- 75° Percentile: 🏆 ${Math.round(
									percentile(members, 0.75),
								).toLocaleString(locale)}\n- 90° Percentile: 🏆 ${Math.round(
									percentile(members, 0.9),
								).toLocaleString(locale)}`,
							},
						],
						accessory: {
							type: ComponentType.Thumbnail,
							media: {
								url: `https://cdn.brawlify.com/club-badges/regular/${club.badgeId}.png`,
							},
						},
					},
					...club.members
						.slice(page * 10, (page + 1) * 10)
						.flatMap(
							(member, i): APISectionComponent => ({
								type: ComponentType.Section,
								components: [
									{
										type: ComponentType.TextDisplay,
										content: `${i + page * 10 + 1}.\t**${member.name}**\n${
											MemberEmoji[member.role]
										} ${ResolvedMemberRole[member.role]}\t🏆 ${member.trophies}`,
									},
								],
								accessory: {
									type: ComponentType.Button,
									style: ButtonStyle.Secondary,
									custom_id: `brawl-player-${id}-${member.tag}`,
									label: "Dettagli",
								},
							}),
						),
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								emoji: { name: "⬅️" },
								custom_id: `brawl-members-${id}-${club.tag}-${order}-${
									page - 1
								}`,
								disabled: !page,
								style: ButtonStyle.Primary,
							},
							{
								type: ComponentType.Button,
								label: `Pagina ${page + 1} di ${pages}`,
								custom_id: "brawl",
								disabled: true,
								style: ButtonStyle.Secondary,
							},
							{
								type: ComponentType.Button,
								emoji: { name: "➡️" },
								custom_id: `brawl-members-${id}-${club.tag}-${order}-${
									page + 1
								}`,
								disabled: page >= pages - 1,
								style: ButtonStyle.Primary,
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.StringSelect,
								options: [
									{
										label: "Più trofei",
										value: String(MembersOrder.MostTrophies),
										default: order === MembersOrder.MostTrophies,
									},
									{
										label: "Meno trofei",
										value: String(MembersOrder.LeastTrophies),
										default: order === MembersOrder.LeastTrophies,
									},
									{
										label: "Nome",
										value: String(MembersOrder.Name),
										default: order === MembersOrder.Name,
									},
									{
										label: "Ruolo",
										value: String(MembersOrder.Role),
										default: order === MembersOrder.Role,
									},
								],
								custom_id: `brawl-members-${id}-${club.tag}--${page}`,
								placeholder: "Ordina per...",
							},
						],
					},
				],
			},
		];
	};
	static "createPlayerEmbed" = (
		player: Brawl.Player,
		playerId?: string,
	): APIEmbed => ({
		title: `${player.name} (${player.tag})`,
		thumbnail: {
			url: `https://cdn.brawlify.com/profile-icons/regular/${player.icon.id}.png`,
		},
		color:
			player.nameColor ? parseInt(player.nameColor.slice(4), 16) : 0xffffff,
		description: `🛡️ Club: ${
			player.club.tag ?
				`**${player.club.name}** (${player.club.tag})`
			:	"*In nessun club*"
		}${playerId ? `\n👤 Discord: <@${playerId}>` : ""}`,
		fields: [
			{
				name: "🏆 Trofei",
				value: `**Attuali**: ${player.trophies}\n**Record**: ${
					player.highestTrophies
				}\n**Media**: ${Math.round(player.trophies / player.brawlers.length)}`,
				inline: true,
			},
			{
				name: "🏅 Vittorie",
				value: `**3v3**: ${player["3vs3Victories"]}\n**Solo**: ${player.soloVictories}\n**Duo**: ${player.duoVictories}`,
				inline: true,
			},
			{
				name: "📊 Altre statistiche",
				value: `**Robo Rumble**: ${
					this.ROBO_RUMBLE_LEVELS[player.bestRoboRumbleTime]
				}\n**Big Game**: ${
					this.ROBO_RUMBLE_LEVELS[player.bestTimeAsBigBrawler]
				}\n**Brawlers**: ${player.brawlers.length}`,
				inline: true,
			},
		],
	});
	static "createClubMessage" = (
		club: Brawl.Club,
		locale: Locale,
	): RESTPatchAPIInteractionOriginalResponseJSONBody => {
		club.members.sort((a, b) => b.trophies - a.trophies);
		const members: number[] = [];
		const staff: {
			president: Pick<Brawl.ClubMember, "nameColor" | "name">;
			vicePresident: string[];
			senior: string[];
		} = {
			president: { name: "*Non trovato*", nameColor: "" },
			vicePresident: [],
			senior: [],
		};

		for (const member of club.members) {
			members.push(member.trophies);
			if (member.role === "president") staff.president = member;
			else if (member.role === "vicePresident")
				staff.vicePresident.push(member.name);
			else if (member.role === "senior") staff.senior.push(member.name);
		}
		return {
			embeds: [
				{
					title: `${club.name} (${club.tag})`,
					thumbnail: {
						url: `https://cdn.brawlify.com/club-badges/regular/${club.badgeId}.png`,
					},
					color: parseInt(staff.president?.nameColor.slice(4) ?? "ffffff", 16),
					description: club.description
						.replaceAll("|", " | ")
						.replace(
							/(?:\p{Extended_Pictographic}|\p{Regional_Indicator})+/gu,
							(s) => `${s} `,
						),
					fields: [
						{
							name: "📊 Dati generali",
							value: `**Tipo**: ${
								ClubType[club.type]
							}\n**Membri**: ${members.length.toLocaleString(
								locale,
							)}\n**Trofei totali**: ${club.trophies.toLocaleString(
								locale,
							)}\n**Trofei richiesti**: ${club.requiredTrophies.toLocaleString(
								locale,
							)}`,
							inline: true,
						},
						{
							name: "🏆 Membri",
							value: `**Trofei medi**: ${Math.round(
								club.trophies / club.members.length,
							).toLocaleString(locale)}\n**Mediana**: ${Math.round(
								percentile(members, 0.5),
							).toLocaleString(locale)}\n**75° Percentile**: ${Math.round(
								percentile(members, 0.75),
							).toLocaleString(locale)}\n**90° Percentile**: ${Math.round(
								percentile(members, 0.9),
							).toLocaleString(locale)}`,
							inline: true,
						},
						{
							name: "👥 Staff",
							value: `**Presidente**: ${
								staff.president.name
							}\n**Vicepresidenti**: ${
								staff.vicePresident.join(", ") || "*Nessuno*"
							}\n**Anziani**: ${staff.senior.join(", ") || "*Nessuno*"}`,
							inline: true,
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
							custom_id: "brawl-player",
							placeholder: "Visualizza un membro...",
							options: club.members
								.slice(0, 25)
								.map((m) => ({
									label: m.name,
									value: m.tag,
									emoji: { name: MemberEmoji[m.role] ?? "👤" },
								})),
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `brawl-members--${club.tag}---1`,
							style: ButtonStyle.Primary,
							label: "Lista Membri",
							emoji: { name: "👥" },
						},
					],
				},
			],
		};
	};
	static "createPlayerMessage" = (
		player: Brawl.Player,
		userId: string,
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
						custom_id: `brawl-brawlers--${player.tag}---1`,
						label: "Brawlers",
						emoji: { name: "🔫" },
						style: ButtonStyle.Primary,
					},
				],
			},
		];

		if (link)
			components[0]!.components.unshift({
				type: ComponentType.Button,
				custom_id: `brawl-link-${userId}-${player.tag}-${commandId || "0"}`,
				label: "Salva",
				emoji: { name: "🔗" },
				style: ButtonStyle.Success,
			});
		else if (link === false)
			components[0]!.components.unshift({
				type: ComponentType.Button,
				custom_id: `brawl-unlink-${userId}-${player.tag}-${commandId || "0"}`,
				label: "Scollega",
				emoji: { name: "⛓️‍💥" },
				style: ButtonStyle.Danger,
			});
		if (player.club.tag)
			components[0]!.components.push({
				type: ComponentType.Button,
				custom_id: `brawl-club--${player.club.tag}`,
				label: "Club",
				emoji: { name: "🫂" },
				style: ButtonStyle.Primary,
			});
		return { embeds: [this.createPlayerEmbed(player, playerId)], components };
	};
	static async callApi<T>(
		path: string,
		errors: Record<number, string> = {},
		cache = true,
	) {
		errors = { ...this.ERROR_MESSAGES, ...errors };
		const request = new Request(
			new URL(path, "https://api.brawlstars.com/v1/"),
		);
		let res = cache && (await caches.default.match(request));

		if (!res) {
			const clone = request.clone();

			clone.headers.set("Authorization", `Bearer ${env.BRAWL_STARS_API_TOKEN}`);
			res = await env.BRAWL_STARS.fetch(clone);
			if (cache) waitUntil(caches.default.put(request, res.clone()));
		}
		if (res.ok) return res.json<T>();
		const body = await res.text();
		const json = await Promise.try<{ message: string }, [string]>(
			JSON.parse,
			body,
		).catch(() => {});

		console.error(json ?? body);
		throw new Error(
			json?.message ??
				errors[res.status] ??
				`\`${res.status} ${res.statusText}\``,
		);
	}
	static "getPlayer" = async (
		tag: string,
		edit?: BaseReplies["edit"],
		cache?: boolean,
	) => {
		try {
			tag = Brawl.normalizeTag(tag);
			return await Brawl.callApi<Brawl.Player>(
				`players/${encodeURIComponent(tag)}`,
				{ 404: "Giocatore non trovato." },
				cache,
			);
		} catch (err) {
			if (edit)
				throw await edit({
					content:
						err instanceof Error ?
							err.message
						:	"Non è stato possibile recuperare il profilo. Riprova più tardi.",
				});
			throw err;
		}
	};
	static "getClub" = async (
		tag: string,
		edit?: BaseReplies["edit"],
		cache?: boolean,
	) => {
		try {
			tag = Brawl.normalizeTag(tag);
			return await Brawl.callApi<Brawl.Club>(
				`clubs/${encodeURIComponent(tag)}`,
				{ 404: "Club non trovato." },
				cache,
			);
		} catch (err) {
			if (edit)
				throw await edit({
					content:
						err instanceof Error ?
							err.message
						:	"Non è stato possibile recuperare il club. Riprova più tardi.",
				});
			throw err;
		}
	};
	static "normalizeTag" = (tag: string) => {
		tag = tag.toUpperCase().replace(/O/g, "0");
		if (!tag.startsWith("#")) tag = `#${tag}`;
		if (!/^#[0289PYLQGRJCUV]{3,15}$/.test(tag))
			throw new TypeError("Tag non valido.");
		return tag;
	};
	static override async chatInput(
		replies: ChatInputReplies,
		args: ChatInputArgs<typeof Brawl.chatInputData>,
	) {
		return this[
			`${args.subcommand.split(" ")[0] as "player" | "club"}Command`
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
				member,
			},
		}: ChatInputArgs<typeof Brawl.chatInputData, `${"player"} ${string}`>,
	) => {
		if (
			subcommand === "player link" &&
			options.user &&
			!(
				member?.permissions &&
				BigInt(member.permissions) & PermissionFlagsBits.ManageGuild
			)
		)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "Questa opzione è privata!",
			});
		const userId = options.tag ? undefined : id;
		options.tag ??=
			(await env.DB.prepare("SELECT brawlTag FROM Users WHERE id = ?")
				.bind(id)
				.first("brawlTag")) ?? undefined;
		if (!options.tag)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: `Non hai ancora collegato un profilo Brawl Stars! Specifica il tag giocatore come parametro e poi clicca su **Salva**.`,
			});
		try {
			options.tag = this.normalizeTag(options.tag);
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
					env.DB.prepare("SELECT id FROM Users WHERE brawlTag = ?")
						.bind(options.tag)
						.first<string>("id"),
			]);

			return edit(
				Brawl.createPlayerMessage(
					player,
					id,
					playerId ?? undefined,
					commandId,
					userId ? false : playerId !== id,
				),
			);
		}
		if (subcommand === "player brawlers")
			return edit({
				components: this.createBrawlersComponents(
					await this.getPlayer(options.tag, edit),
					url,
					id,
					options.order,
				),
				flags: MessageFlags.IsComponentsV2,
			});
		if (subcommand === "player link") {
			const [player, playerId] = await Promise.all([
				this.getPlayer(options.tag, edit),
				userId ??
					env.DB.prepare("SELECT id FROM Users WHERE brawlTag = ?")
						.bind(options.tag)
						.first<string>("id"),
			]);

			if (playerId)
				return edit({
					content: `Questo tag è già collegato a <@${playerId}>!`,
					allowed_mentions: { parse: [] },
				});
			return edit({
				embeds: [this.createPlayerEmbed(player)],
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `brawl-link-${id}-${options.tag}-${commandId}-${options.user ?? id}`,
								label: "Salva",
								emoji: { name: "🔗" },
								style: ButtonStyle.Success,
							},
						],
					},
				],
			});
		}
	};
	static "clubCommand" = async (
		{ defer, edit }: ChatInputReplies,
		{
			options,
			subcommand,
			user: { id },
			interaction: {
				locale,
				data: { id: commandId },
			},
		}: ChatInputArgs<typeof Brawl.chatInputData, `${"club"} ${string}`>,
	) => {
		defer();
		if (!options.tag) {
			const playerTag = await env.DB.prepare(
				"SELECT brawlTag FROM Users WHERE id = ?",
			)
				.bind(id)
				.first<string>("brawlTag");

			if (playerTag)
				options.tag = (await this.getPlayer(playerTag, edit)).club.tag;
		}
		if (!options.tag)
			return edit({
				content: `Non hai ancora collegato un profilo Brawl Stars! Specifica il tag del club come parametro o collega un profilo con </brawl profile:${commandId}>.`,
			});
		const club = await this.getClub(options.tag, edit);

		if (subcommand === "club view")
			return edit(this.createClubMessage(club, locale));
		if (subcommand === "club members")
			return edit({
				components: this.createMembersComponents(
					club,
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
		}: ChatInputArgs<typeof Brawl.chatInputData, "notify enable">,
	) => {
		const result = await env.DB.prepare(
			`INSERT INTO Users (id, brawlNotifications)
				VALUES (?1, ?2)
				ON CONFLICT(id) DO UPDATE
				SET brawlNotifications = Users.brawlNotifications | ?2
				RETURNING brawlNotifications, brawlTag`,
		)
			.bind(id, NotificationType[type])
			.first<{ brawlNotifications: number; brawlTag: string | null }>();

		return reply({
			flags: MessageFlags.Ephemeral,
			content: `Notifiche abilitate per il tipo **${type}**!\nAttualmente hai attivato le notifiche per ${this.calculateFlags(
				result?.brawlNotifications,
			)}.${
				!result?.brawlTag ?
					`\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando </brawl profile:${commandId}> e clicca su **Salva** per iniziare a ricevere le notifiche.`
				:	""
			}`,
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
		}: ChatInputArgs<typeof Brawl.chatInputData, "notify disable">,
	) => {
		const result = await env.DB.prepare(
			`UPDATE Users
				SET brawlNotifications = Users.brawlNotifications & ~?1
				WHERE id = ?2
				RETURNING brawlNotifications, brawlTag`,
		)
			.bind(NotificationType[type], id)
			.first<{ brawlNotifications: number; brawlTag: string | null }>();

		return reply({
			flags: MessageFlags.Ephemeral,
			content: `Notifiche disabilitate per il tipo **${type}**!\nAttualmente hai attivato le notifiche per ${this.calculateFlags(
				result?.brawlNotifications,
			)}.${
				!result?.brawlTag ?
					`\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando </brawl profile:${commandId}> e clicca su **Salva** per iniziare a ricevere le notifiche.`
				:	""
			}`,
		});
	};
	static "notify view" = async (
		{ reply }: ChatInputReplies,
		{
			user: { id },
			interaction: {
				data: { id: commandId },
			},
		}: ChatInputArgs<typeof Brawl.chatInputData, "notify view">,
	) => {
		const result = await env.DB.prepare(
			"SELECT brawlNotifications, brawlTag FROM Users WHERE id = ?",
		)
			.bind(id)
			.first<{ brawlNotifications: number; brawlTag: string | null }>();

		return reply({
			flags: MessageFlags.Ephemeral,
			content: `Notifiche attive per i seguenti tipi: ${this.calculateFlags(
				result?.brawlNotifications,
			)}.${
				!result?.brawlTag ?
					`\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando </brawl profile:${commandId}> e clicca su **Salva** per iniziare a ricevere le notifiche.`
				:	""
			}`,
		});
	};
	static override async component(
		replies: ComponentReplies,
		args: ComponentArgs,
	) {
		const [action, userId] = args.args.splice(0, 2);

		if (!userId || args.user.id === userId)
			return this[
				`${action as "link" | "brawler" | "brawlers" | "unlink"}Component`
			]?.(replies, args);
		return replies.reply({
			flags: MessageFlags.Ephemeral,
			content: "Questa azione non è per te!",
		});
	}
	static "linkComponent" = async (
		{ edit, deferUpdate }: ComponentReplies,
		{
			args: [tag, commandId, userId],
			user: { id },
			interaction: {
				message: { components },
			},
		}: ComponentArgs,
	) => {
		deferUpdate();
		userId ||= id;
		const player = await this.getPlayer(tag!, edit);

		await env.DB.prepare(
			`INSERT INTO Users (id, brawlTag, brawlTrophies, brawlers)
				VALUES (?, ?, ?, ?) ON CONFLICT(id) DO
				UPDATE
				SET brawlTag = excluded.brawlTag,
					brawlTrophies = excluded.brawlTrophies,
					brawlers = excluded.brawlers`,
		)
			.bind(
				userId,
				tag,
				player.highestTrophies,
				JSON.stringify(
					player.brawlers.map((b) => ({ id: b.id, rank: b.rank })),
				),
			)
			.run();
		if (components?.[0]?.type === ComponentType.ActionRow)
			components[0].components[0] = {
				type: ComponentType.Button,
				custom_id: `brawl-unlink-${id}-${tag}-${commandId || "0"}`,
				label: "Scollega",
				emoji: { name: "⛓️‍💥" },
				style: ButtonStyle.Danger,
			};
		return edit({
			content: `Profilo collegato con successo!\nUsa </brawl notify enable:${
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
				SET brawlTag = NULL,
					brawlTrophies = NULL,
					brawlers = NULL
				WHERE id = ?`,
		)
			.bind(id)
			.run();
		if (components?.[0]?.type === ComponentType.ActionRow)
			components[0].components[0] = {
				type: ComponentType.Button,
				custom_id: `brawl-link-${id}-${tag}-${commandId || "0"}`,
				label: "Salva",
				emoji: { name: "🔗" },
				style: ButtonStyle.Success,
			};
		return update({ content: "Profilo scollegato con successo!", components });
	};
	static "brawlersComponent" = async (
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
			components: this.createBrawlersComponents(
				await this.getPlayer(tag!, edit),
				request.url,
				id,
				Number(
					data.component_type === ComponentType.StringSelect ?
						data.values[0]
					:	order,
				) || undefined,
				Number(page) || undefined,
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
				await this.getClub(tag!, edit),
				locale,
				id,
				Number(
					data.component_type === ComponentType.StringSelect ?
						data.values[0]
					:	order,
				) || undefined,
				Number(page) || undefined,
			),
			flags: MessageFlags.IsComponentsV2,
		});
	};
	static "brawlerComponent" = async (
		{ deferUpdate, edit }: ComponentReplies,
		{ args: [tag, brawler, order, page], user: { id } }: ComponentArgs,
	) => {
		deferUpdate();
		const player = await this.getPlayer(tag!, edit);
		const brawlerId = Number(brawler);

		return edit({
			components: this.createBrawlerComponents(
				player,
				id,
				player.brawlers.find((b) => b.id === brawlerId)!,
				Number(order) || undefined,
				Number(page) || undefined,
			),
		});
	};
	static "playerComponent" = async (
		{ defer, edit }: ComponentReplies,
		{ user: { id }, interaction: { data }, args: [tag] }: ComponentArgs,
	) => {
		if (data.component_type === ComponentType.StringSelect) [tag] = data.values;
		ok(tag);
		defer({ flags: MessageFlags.Ephemeral });
		const [player, playerId] = await Promise.all([
			this.getPlayer(tag, edit),
			env.DB.prepare("SELECT id FROM Users WHERE brawlTag = ?")
				.bind(tag)
				.first<string>("id"),
		]);

		return edit(
			this.createPlayerMessage(
				player,
				id,
				playerId ?? undefined,
				undefined,
				playerId !== id && (!playerId || undefined),
			),
		);
	};
	static "clubComponent" = async (
		{ defer, edit }: ComponentReplies,
		{ args: [tag], interaction: { locale } }: ComponentArgs,
	) => {
		defer({ flags: MessageFlags.Ephemeral });
		return edit(this.createClubMessage(await this.getClub(tag!, edit), locale));
	};
}
