import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
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
	Name,
	MostTrophies,
	LeastTrophies,
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
	static NOTIFICATION_TYPES = [
		"Brawler Tier Max",
		"New Brawler",
		"Trophy Road Advancement",
		"All",
	] as const;
	static readonly BRAWLER_EMOJIS: RecursiveReadonly<
		Record<string, [string, string, string, string]>
	> = {
		"0": [
			"1412853498336510094",
			"1412853505944850443",
			"1412853513528283270",
			"1412853522357157899",
		],
		"16000000": [
			"1412848550076874764",
			"1412848552136278077",
			"1412848553260224664",
			"1412848554405400776",
		],
		"16000001": [
			"1412848555550572725",
			"1412848557299466260",
			"1412848558490652742",
			"1412848559602139216",
		],
		"16000002": [
			"1412848560982065192",
			"1412848562265391285",
			"1412848563486199848",
			"1412848564773589124",
		],
		"16000003": [
			"1412848566296383602",
			"1412848568288415817",
			"1412848569744101416",
			"1412848571102793898",
		],
		"16000004": [
			"1412848572512211004",
			"1412848574064103606",
			"1412848575213338766",
			"1412848576429559848",
		],
		"16000005": [
			"1412848577868202117",
			"1412848578912850002",
			"1412848580342841394",
			"1412848581743738934",
		],
		"16000006": [
			"1412848583111082115",
			"1412848583908003972",
			"1412848585514680332",
			"1412848586865119232",
		],
		"16000007": [
			"1412848588245176452",
			"1412848589813846108",
			"1412848591524986990",
			"1412848592871362604",
		],
		"16000008": [
			"1412848594456940594",
			"1412848595958497340",
			"1412848597632024699",
			"1412848599456415975",
		],
		"16000009": [
			"1412848600987471882",
			"1412848602195169370",
			"1412848603550191818",
			"1412848605764780123",
		],
		"16000010": [
			"1412848607102632008",
			"1412848608826626130",
			"1412848609950568470",
			"1412848611322101760",
		],
		"16000011": [
			"1412848612131737662",
			"1412848615184928900",
			"1412848618380984421",
			"1412848619781881856",
		],
		"16000012": [
			"1412848620905955348",
			"1412848622663635136",
			"1412848624395747469",
			"1412848625310109717",
		],
		"16000013": [
			"1412848627847794761",
			"1412848629143568456",
			"1412848631274410177",
			"1412848633249927280",
		],
		"16000014": [
			"1412848635024248995",
			"1412848636546777158",
			"1412848639931449527",
			"1412848641344798933",
		],
		"16000015": [
			"1412848642804678782",
			"1412848644142530733",
			"1412848645849612380",
			"1412848647548440687",
		],
		"16000016": [
			"1412848648672378891",
			"1412848650446438572",
			"1412848651868573848",
			"1412848653105762498",
		],
		"16000017": [
			"1412848654451998760",
			"1412848655743979643",
			"1412848657119842446",
			"1412848658352967823",
		],
		"16000018": [
			"1412848660252983316",
			"1412848661326594101",
			"1412848662672969839",
			"1412848664350687242",
		],
		"16000019": [
			"1412848665667833866",
			"1412848666774995107",
			"1412848667731427349",
			"1412848669128003775",
		],
		"16000020": [
			"1412848670553935892",
			"1412848671678271528",
			"1412848672462344325",
			"1412848674052243537",
		],
		"16000021": [
			"1412848679596855520",
			"1412848681333428266",
			"1412848682436395190",
			"1412848683459936338",
		],
		"16000022": [
			"1412848685045256232",
			"1412848686156746774",
			"1412848686957858953",
			"1412848688648425596",
		],
		"16000023": [
			"1412848690179084299",
			"1412848691747754054",
			"1412848692909576223",
			"1412848693740044330",
		],
		"16000024": [
			"1412848695304650784",
			"1412848696433053718",
			"1412848698156777502",
			"1412848699536707735",
		],
		"16000025": [
			"1412848700866433115",
			"1412848702258675813",
			"1412848703697326190",
			"1412848704833982534",
		],
		"16000026": [
			"1412848705845067917",
			"1412848707140849876",
			"1412848708428763246",
			"1412848709573542001",
		],
		"16000027": [
			"1412848710760665220",
			"1412848711704514693",
			"1412848713151283462",
			"1412848714955100311",
		],
		"16000028": [
			"1412848716024647772",
			"1412848717295255654",
			"1412848719358853240",
			"1412848720575463655",
		],
		"16000029": [
			"1412848721862983822",
			"1412848723029135462",
			"1412848724798865429",
			"1412848726569128171",
		],
		"16000030": [
			"1412848728255234132",
			"1412848730180419644",
			"1412848731417608232",
			"1412848732705390652",
		],
		"16000031": [
			"1412848734211149935",
			"1412848735712575549",
			"1412848736824197222",
			"1412848737642090518",
		],
		"16000032": [
			"1412848739399499827",
			"1412848740515057795",
			"1412848742079397896",
			"1412848743241355355",
		],
		"16000034": [
			"1412848744470151191",
			"1412848746290610236",
			"1412848747758747689",
			"1412848748614123552",
		],
		"16000035": [
			"1412848752775008389",
			"1412848754301730929",
			"1412848755664752671",
			"1412848757082423306",
		],
		"16000036": [
			"1412848758269411448",
			"1412848759620243567",
			"1412848760534466642",
			"1412848762111397939",
		],
		"16000037": [
			"1412848763453571072",
			"1412848764787359835",
			"1412848766050107402",
			"1412848767258071141",
		],
		"16000038": [
			"1412848768495390901",
			"1412848769694695625",
			"1412848771506634842",
			"1412848780797022301",
		],
		"16000039": [
			"1412848782223216640",
			"1412848783472988371",
			"1412848784836395038",
			"1412848785834639403",
		],
		"16000040": [
			"1412848787935854766",
			"1412848788841828455",
			"1412848790658093188",
			"1412848792113385554",
		],
		"16000041": [
			"1412848793183060010",
			"1412848795020169217",
			"1412848796261552238",
			"1412848801651228723",
		],
		"16000042": [
			"1412848802808987759",
			"1412848804067151954",
			"1412848805241684068",
			"1412848806361305259",
		],
		"16000043": [
			"1412848807670190223",
			"1412848808882339940",
			"1412848810392027207",
			"1412848811667357816",
		],
		"16000044": [
			"1412848813340622848",
			"1412848814544392243",
			"1412848819619762298",
			"1412848820844363927",
		],
		"16000045": [
			"1412848826644959323",
			"1412848827979006014",
			"1412848829283176540",
			"1412848830973743237",
		],
		"16000046": [
			"1412848832894472263",
			"1412848834094170253",
			"1412848835323236362",
			"1412848836594110534",
		],
		"16000047": [
			"1412848838233821244",
			"1412848839513215087",
			"1412848840415121643",
			"1412848841970946219",
		],
		"16000048": [
			"1412848844663685213",
			"1412848846186352671",
			"1412848847675195453",
			"1412848849747312812",
		],
		"16000049": [
			"1412848851005608016",
			"1412848853908062301",
			"1412848855820664973",
			"1412848857313837241",
		],
		"16000050": [
			"1412848858710540421",
			"1412848860048392202",
			"1412848861143109754",
			"1412848863106039930",
		],
		"16000051": [
			"1412848864427507775",
			"1412848866033926174",
			"1412848867359330334",
			"1412848868252582061",
		],
		"16000052": [
			"1412848869837897768",
			"1412848870995787899",
			"1412848872161677402",
			"1412848873361113118",
		],
		"16000053": [
			"1412848874745368647",
			"1412848875986751691",
			"1412848877790298142",
			"1412848878704918712",
		],
		"16000054": [
			"1412848880567058452",
			"1412848881959702561",
			"1412848883263868978",
			"1412848885084323993",
		],
		"16000056": [
			"1412848886082572439",
			"1412848887684661490",
			"1412848888691560519",
			"1412848890415415336",
		],
		"16000057": [
			"1412848891950534796",
			"1412848892890054667",
			"1412848894546804808",
			"1412848896090046616",
		],
		"16000058": [
			"1412848897079902361",
			"1412848898405564579",
			"1412848899663855706",
			"1412848900707979426",
		],
		"16000059": [
			"1412848902301941821",
			"1412848904105492521",
			"1412848905644933130",
			"1412848906982658089",
		],
		"16000060": [
			"1412848908140282221",
			"1412848909331595264",
			"1412848911000932352",
			"1412848912217145436",
		],
		"16000061": [
			"1412848914612097104",
			"1412848916042354798",
			"1412848917602631833",
			"1412848918798143609",
		],
		"16000062": [
			"1412848920081465506",
			"1412848921327177870",
			"1412848923038449818",
			"1412848924405923981",
		],
		"16000063": [
			"1412848926129786900",
			"1412848927518097449",
			"1412848928650690611",
			"1412848930911293470",
		],
		"16000064": [
			"1412848932282830942",
			"1412848933578866739",
			"1412848935248199732",
			"1412848936451964938",
		],
		"16000065": [
			"1412848937588625491",
			"1412848940524765195",
			"1412848941870878802",
			"1412848943066255410",
		],
		"16000066": [
			"1412848944739782730",
			"1412848946232950824",
			"1412848947944357920",
			"1412848949533999185",
		],
		"16000067": [
			"1412848950880505890",
			"1412848952750903346",
			"1412848959839535124",
			"1412848961806663855",
		],
		"16000068": [
			"1412848963664482334",
			"1412848964839018527",
			"1412848966097178736",
			"1412848967238025278",
		],
		"16000069": [
			"1412848968416624804",
			"1412848970161717321",
			"1412848971193520190",
			"1412848973277954148",
		],
		"16000070": [
			"1412848974821458104",
			"1412848976725540885",
			"1412848978072043525",
			"1412848980072726538",
		],
		"16000071": [
			"1412848981356318781",
			"1412848982626930708",
			"1412848984216567881",
			"1412848985928110150",
		],
		"16000072": [
			"1412848988016742472",
			"1412848989501390948",
			"1412848990676062320",
			"1412848992085082223",
		],
		"16000073": [
			"1412848993381126194",
			"1412848995058974803",
			"1412848996430381096",
			"1412848997877551135",
		],
		"16000074": [
			"1412848999043563650",
			"1412849000364773376",
			"1412849001799225384",
			"1412849003200118915",
		],
		"16000075": [
			"1412849005582352405",
			"1412849007180382471",
			"1412849008287809736",
			"1412849009764077656",
		],
		"16000076": [
			"1412849012209483836",
			"1412849013912506418",
			"1412849015099228160",
			"1412849016483610697",
		],
		"16000077": [
			"1412849018152947753",
			"1412849019637600287",
			"1412849021357134016",
			"1412849023588761710",
		],
		"16000078": [
			"1412849025270546462",
			"1412849026600009729",
			"1412849028600955062",
			"1412849029913776140",
		],
		"16000079": [
			"1412849031469727864",
			"1412849032472039517",
			"1412849034187767909",
			"1412849035756175460",
		],
		"16000080": [
			"1412849036834242782",
			"1412849038583402556",
			"1412849040659316776",
			"1412849041699504140",
		],
		"16000081": [
			"1412849043494932643",
			"1412849045340160133",
			"1412849046665560184",
			"1412849048058073110",
		],
		"16000082": [
			"1412849049622675538",
			"1412849050839023717",
			"1412849052265218109",
			"1412849053427040258",
		],
		"16000083": [
			"1412849054878011504",
			"1412849056333693091",
			"1412849058053357759",
			"1412849059391209522",
		],
		"16000084": [
			"1412849060712415423",
			"1412849061966643372",
			"1412849063379861608",
			"1412849064973963285",
		],
		"16000085": [
			"1412849066403958814",
			"1412849067884810422",
			"1412849070124564530",
			"1412849072284373154",
		],
		"16000086": [
			"1412849074390040717",
			"1412849075572838412",
			"1412849076982251600",
			"1412849078496395274",
		],
		"16000087": [
			"1412849079322546287",
			"1412849080840884297",
			"1412849082166149160",
			"1412849083940606093",
		],
		"16000089": [
			"1412849085408346112",
			"1412849087035867158",
			"1412849088185110645",
			"1412849089158185135",
		],
		"16000090": [
			"1412849090789900300",
			"1412849092429877399",
			"1412849094845530194",
			"1412849096837828761",
		],
		"16000091": [
			"1412849098268213488",
			"1412849099853791273",
			"1412849101015617549",
			"1412849102953386054",
		],
		"16000092": [
			"1412849104152694825",
			"1412849105088155779",
			"1412849106891837520",
			"1412849108666028263",
		],
		"16000093": [
			"1412849110087766250",
			"1412849112281518100",
			"1412849113694736606",
			"1412849115016069191",
		],
		"16000094": [
			"1412849116702052514",
			"1412849118535090338",
			"1412849120238108736",
			"1412849121441878077",
		],
		"16000095": [
			"1412849122951561358",
			"1412849124688265246",
			"1412849125979852862",
			"1412849127447859210",
		],
		"16000096": [
			"1412849129142353980",
			"1412849130304307304",
			"1412849137552195635",
			"1412849138726604930",
		],
	};
	static readonly ROBO_RUMBLE_LEVELS = [
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
	static readonly #requestData: RequestInit<RequestInitCfProperties> = {
		cf: {
			cacheEverything: true,
			cacheTtl: 60,
			cacheTtlByStatus: { "200-299": 60, "404": 86400, "500-599": 10 },
		},
		headers: { Authorization: `Bearer ${env.BRAWL_STARS_API_TOKEN}` },
	};
	static override chatInputData = {
		name: "brawl",
		description: "Interagisci con Brawl Stars!",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "link",
				description: "Collega il tuo profilo di Brawl Stars",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "tag",
						description: "Il tuo tag giocatore di Brawl Stars (es. #8QJR0YC)",
						type: ApplicationCommandOptionType.String,
						required: true,
					},
				],
			},
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
	static calculateFlags = (flags = 0) =>
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
	static createBrawlerComponents = (
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
							content: `## ${brawler.name}\n<:level:1412854877180133427> Lvl. ${brawler.power}\t🏆 ${brawler.trophies}  🔝 ${brawler.highestTrophies}\n- <:gadget:1412823343953874964> **${brawler.gadgets.length}**${brawler.gadgets.length ? ": " : ""}${brawler.gadgets.map((g) => g.name.toLowerCase().split(" ").map(capitalize).join(" ")).join(", ")}\n- <:gear:1412824093572731003> **${brawler.gears.length}**${brawler.gears.length ? ": " : ""}${brawler.gears.map((g) => g.name.toLowerCase().split(" ").map(capitalize).join(" ")).join(", ")}\n- <:starpower:1412824566392426689> **${brawler.starPowers.length}**${brawler.starPowers.length ? ": " : ""}${brawler.starPowers.map((g) => g.name.toLowerCase().split(" ").map(capitalize).join(" ")).join(", ")}`,
						},
					],
					accessory: {
						type: ComponentType.Thumbnail,
						media: {
							url: `https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`,
						},
					},
				},
				{
					type: ComponentType.Separator,
					spacing: SeparatorSpacingSize.Large,
				},
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
	static createBrawlersComponents = (
		player: Brawl.Player,
		url: string,
		id: string,
		order = BrawlerOrder.Name,
		page = 0,
	): APIMessageTopLevelComponent[] => {
		const pages = Math.ceil(player.brawlers.length / 10);

		player.brawlers.sort(
			order === BrawlerOrder.Name
				? (a, b) => a.name.localeCompare(b.name)
				: order === BrawlerOrder.MostTrophies
					? (a, b) =>
							b.trophies - a.trophies || b.highestTrophies - a.highestTrophies
					: order === BrawlerOrder.LeastTrophies
						? (a, b) =>
								a.trophies - b.trophies || a.highestTrophies - b.highestTrophies
						: (a, b) => b.power - a.power,
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
										content: `<:l1:${l1}><:l2:${l2}>\t**${brawler.name}**\t${brawler.gadgets.length ? "<:gadget:1412823343953874964>" : " \t "}${brawler.gears.length ? "<:gear:1412824093572731003>" : " \t "}${brawler.starPowers.length ? "<:starpower:1412824566392426689>" : " \t "}${brawler.gears.length >= 2 ? "<:gear:1412824093572731003>" : ""}\n<:l3:${l3}><:l4:${l4}>\t<:level:1412854877180133427> ${brawler.power}\t🏆 ${brawler.trophies}  🔝 ${brawler.highestTrophies}`,
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
								custom_id: `brawl-brawlers-${id}-${player.tag}-${order}-${page - 1}`,
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
								custom_id: `brawl-brawlers-${id}-${player.tag}-${order}-${page + 1}`,
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
	static createMembersComponents = (
		club: Brawl.Club,
		url: string,
		id: string,
		order = MembersOrder.MostTrophies,
		page = 0,
	): APIMessageTopLevelComponent[] => {
		const pages = Math.ceil(club.members.length / 10);

		club.members.sort(
			order === MembersOrder.Name
				? (a, b) => a.name.localeCompare(b.name)
				: order === MembersOrder.MostTrophies
					? (a, b) => b.trophies - a.trophies
					: order === MembersOrder.LeastTrophies
						? (a, b) => a.trophies - b.trophies
						: (a, b) => MemberRole[a.role] - MemberRole[b.role],
		);
		return [
			{
				type: ComponentType.Container,
				components: [
					{
						type: ComponentType.MediaGallery,
						items: [{ media: { url: new URL("/brawlers.png", url).href } }],
					},
					...club.members.slice(page * 10, (page + 1) * 10).flatMap(
						(member, i): APISectionComponent => ({
							type: ComponentType.Section,
							components: [
								{
									type: ComponentType.TextDisplay,
									content: `${i + page * 10 + 1}.\t**${member.name}**\n${MemberEmoji[member.role]} ${ResolvedMemberRole[member.role]}\t🏆 ${member.trophies}`,
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
								custom_id: `brawl-members-${id}-${club.tag}-${order}-${page - 1}`,
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
								custom_id: `brawl-members-${id}-${club.tag}-${order}-${page + 1}`,
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
										value: String(MembersOrder.Name),
										default: order === MembersOrder.Name,
									},
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
	static createPlayerEmbed = (player: Brawl.Player): APIEmbed => ({
		title: `${player.name} (${player.tag})`,
		thumbnail: {
			url: `https://cdn.brawlify.com/profile-icons/regular/${player.icon.id}.png`,
		},
		color: player.nameColor
			? parseInt(player.nameColor.slice(4), 16)
			: 0xffffff,
		description: `🛡️ Club: ${
			player.club.tag
				? `**${player.club.name}** (${player.club.tag})`
				: "*In nessun club*"
		}`,
		fields: [
			{
				name: "🏆 Trofei",
				value: `**Attuali**: ${player.trophies}\n**Record**: ${player.highestTrophies}\n**Media**: ${Math.round(player.trophies / player.brawlers.length)}`,
				inline: true,
			},
			{
				name: "🏅 Vittorie",
				value: `**3v3**: ${player["3vs3Victories"]}\n**Solo**: ${player.soloVictories}\n**Duo**: ${player.duoVictories}`,
				inline: true,
			},
			{
				name: "📊 Altre statistiche",
				value: `**Robo Rumble**: ${this.ROBO_RUMBLE_LEVELS[player.bestRoboRumbleTime]}\n**Big Game**: ${this.ROBO_RUMBLE_LEVELS[player.bestTimeAsBigBrawler]}\n**Brawlers**: ${player.brawlers.length}`,
				inline: true,
			},
		],
	});
	static createClubMessage = (
		club: Brawl.Club,
		userId: string,
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
							value: `**Tipo**: ${ClubType[club.type]}\n**Membri**: ${members.length.toLocaleString(locale)}\n**Trofei totali**: ${club.trophies.toLocaleString(locale)}\n**Trofei richiesti**: ${club.requiredTrophies.toLocaleString(locale)}`,
							inline: true,
						},
						{
							name: "🏆 Membri",
							value: `**Trofei medi**: ${Math.round(club.trophies / club.members.length).toLocaleString(locale)}\n**Mediana**: ${Math.round(
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
							value: `**Presidente**: ${staff.president.name}\n**Vicepresidenti**: ${staff.vicePresident.join(", ") || "*Nessuno*"}\n**Anziani**: ${staff.senior.join(", ") || "*Nessuno*"}`,
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
							options: club.members.slice(0, 25).map((m) => ({
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
							custom_id: `brawl-members-${userId}-${club.tag}---1`,
							style: ButtonStyle.Primary,
							label: "Lista Membri",
							emoji: { name: "👥" },
						},
					],
				},
			],
		};
	};
	static createPlayerMessage = (
		player: Brawl.Player,
		id: string,
	): RESTPatchAPIInteractionOriginalResponseJSONBody => {
		const components: APIActionRowComponent<APIButtonComponent>[] = [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						custom_id: `brawl-brawlers-${id}-${player.tag}---1`,
						label: "Brawlers",
						emoji: { name: "🔫" },
						style: ButtonStyle.Primary,
					},
				],
			},
		];

		if (player.club.tag)
			components[0]!.components.push({
				type: ComponentType.Button,
				custom_id: `brawl-club-${id}-${player.club.tag}`,
				label: "Club",
				emoji: { name: "🫂" },
				style: ButtonStyle.Primary,
			});
		return {
			embeds: [this.createPlayerEmbed(player)],
			components,
		};
	};
	static getPlayer = async (tag: string, edit?: BaseReplies["edit"]) => {
		let res: Response | undefined;

		try {
			tag = Brawl.normalizeTag(tag);
			res = await fetch(
				`https://api.brawlstars.com/v1/players/${encodeURIComponent(tag)}`,
				Brawl.#requestData,
			);
			if (res.status === 404) throw new Error("Giocatore non trovato.");
			if (res.status !== 200) {
				console.log(res.status, res.statusText, await res.text());
				throw new Error(
					"Si è verificato un errore imprevisto! Riprova più tardi.",
				);
			}
			return await res.json<Brawl.Player>();
		} catch (err) {
			void res?.body?.cancel();
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
	static getClub = async (tag: string, edit: BaseReplies["edit"]) => {
		let res: Response | undefined;
		try {
			tag = Brawl.normalizeTag(tag);
			res = await fetch(
				`https://api.brawlstars.com/v1/clubs/${encodeURIComponent(tag)}`,
				Brawl.#requestData,
			);
			if (res.status === 404) throw new Error("Club non trovato.");
			if (res.status !== 200) {
				console.log(res.status, res.statusText, await res.text());
				throw new Error(
					"Si è verificato un errore imprevisto! Riprova più tardi.",
				);
			}
			return await res.json<Brawl.Club>();
		} catch (err) {
			void res?.body?.cancel();
			throw await edit({
				content:
					err instanceof Error
						? err.message
						: "Non è stato possibile recuperare il club. Riprova più tardi.",
			});
		}
	};
	static normalizeTag = (tag: string) => {
		tag = tag.toUpperCase().replace(/O/g, "0");
		if (!tag.startsWith("#")) tag = `#${tag}`;
		if (!/^#[0289PYLQGRJCUV]{3,15}$/.test(tag))
			throw new TypeError("Tag giocatore non valido.");
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
	static playerCommand = async (
		{ reply, defer, edit }: ChatInputReplies,
		{
			options,
			subcommand,
			user: { id },
			request: { url },
		}: ChatInputArgs<typeof Brawl.chatInputData, `${"player"} ${string}`>,
	) => {
		options.tag ??= (await env.DB.prepare(
			"SELECT brawlTag FROM Users WHERE id = ?",
		)
			.bind(id)
			.first("brawlTag"))!;
		if (!options.tag)
			return reply({
				flags: MessageFlags.Ephemeral,
				content:
					"Non hai ancora collegato un profilo Brawl Stars! Usa il comando `/brawl link` o specifica il tag giocatore come parametro.",
			});
		defer();
		const player = await this.getPlayer(options.tag, edit);

		return subcommand === "player view"
			? edit(Brawl.createPlayerMessage(player, id))
			: subcommand === "player brawlers"
				? edit({
						components: this.createBrawlersComponents(
							player,
							url,
							id,
							options.order,
						),
						flags: MessageFlags.IsComponentsV2,
					})
				: Promise.reject();
	};
	static clubCommand = async (
		{ defer, edit }: ChatInputReplies,
		{
			options,
			subcommand,
			user: { id },
			interaction: { locale },
			request: { url },
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
				content:
					"Non hai ancora collegato un profilo Brawl Stars! Usa il comando `/brawl link` o specifica il tag del club come parametro.",
			});
		const club = await this.getClub(options.tag, edit);

		if (subcommand === "club view")
			return edit(this.createClubMessage(club, id, locale));
		else if (subcommand === "club members")
			return edit({
				components: this.createMembersComponents(club, url, id, options.order),
				flags: MessageFlags.IsComponentsV2,
			});
	};
	static link = async (
		{ defer, edit }: ChatInputReplies,
		{
			options: { tag },
			user: { id },
		}: ChatInputArgs<typeof Brawl.chatInputData, "link">,
	) => {
		defer({ flags: MessageFlags.Ephemeral });
		const player = await this.getPlayer(tag, edit);

		return edit({
			content: "Vuoi collegare questo profilo?",
			embeds: [this.createPlayerEmbed(player)],
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `brawl-link-${id}-${player.tag}`,
							label: "Collega",
							emoji: { name: "🔗" },
							style: ButtonStyle.Primary,
						},
						{
							type: ComponentType.Button,
							custom_id: `brawl-undo-${id}-${player.tag}`,
							label: "Annulla",
							emoji: { name: "✖️" },
							style: ButtonStyle.Danger,
						},
					],
				},
			],
		});
	};
	static "notify enable" = async (
		{ reply }: ChatInputReplies,
		{
			options: { type },
			user: { id },
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
			content: `Notifiche abilitate per il tipo **${type}**!\nAttualmente hai attivato le notifiche per ${this.calculateFlags(result?.brawlNotifications)}.${!result?.brawlTag ? `\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando \`/brawl link\` per iniziare a ricevere le notifiche.` : ""}`,
		});
	};
	static "notify disable" = async (
		{ reply }: ChatInputReplies,
		{
			options: { type },
			user: { id },
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
			content: `Notifiche disabilitate per il tipo **${type}**!\nAttualmente hai attivato le notifiche per ${this.calculateFlags(result?.brawlNotifications)}.${!result?.brawlTag ? `\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando \`/brawl link\` per iniziare a ricevere le notifiche.` : ""}`,
		});
	};
	static "notify view" = async (
		{ reply }: ChatInputReplies,
		{ user: { id } }: ChatInputArgs<typeof Brawl.chatInputData, "notify view">,
	) => {
		const result = await env.DB.prepare(
			"SELECT brawlNotifications, brawlTag FROM Users WHERE id = ?",
		)
			.bind(id)
			.first<{ brawlNotifications: number; brawlTag: string | null }>();

		return reply({
			flags: MessageFlags.Ephemeral,
			content: `Notifiche attive per i seguenti tipi: ${this.calculateFlags(result?.brawlNotifications)}.${!result?.brawlTag ? `\n-# Non hai ancora collegato un profilo Brawl Stars! Usa il comando \`/brawl link\` per iniziare a ricevere le notifiche.` : ""}`,
		});
	};
	static override async component(
		replies: ComponentReplies,
		args: ComponentArgs,
	) {
		const [action, userId] = args.args.splice(0, 2);

		if (!userId || args.user.id === userId)
			return this[
				`${action as "link" | "undo" | "brawler" | "brawlers"}Component`
			]?.(replies, args);
		return replies.reply({
			flags: MessageFlags.Ephemeral,
			content: "Questa azione non è per te!",
		});
	}
	static linkComponent = async (
		{ edit, deferUpdate }: ComponentReplies,
		{ args: [tag], user: { id } }: ComponentArgs,
	) => {
		deferUpdate();
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
				id,
				tag,
				player.highestTrophies,
				JSON.stringify(
					player.brawlers.map((b) => ({ id: b.id, rank: b.rank })),
				),
			)
			.run();
		return edit({
			content: "Profilo collegato con successo!",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: "brawl",
							label: "Collegato",
							emoji: { name: "🔗" },
							disabled: true,
							style: ButtonStyle.Success,
						},
					],
				},
			],
		});
	};
	static undoComponent = ({ update }: ComponentReplies) =>
		update({
			content: "Azione annullata.",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: "brawl-link",
							label: "Collega",
							disabled: true,
							emoji: { name: "🔗" },
							style: ButtonStyle.Primary,
						},
						{
							type: ComponentType.Button,
							custom_id: "brawl",
							label: "Annullato",
							disabled: true,
							emoji: { name: "✖️" },
							style: ButtonStyle.Danger,
						},
					],
				},
			],
		});
	static brawlersComponent = async (
		{ defer, deferUpdate, edit }: ComponentReplies,
		{
			interaction: { data },
			request,
			args: [tag, order, page, replyFlag],
			user: { id },
		}: ComponentArgs,
	) => {
		if (replyFlag) defer();
		else deferUpdate();
		return edit({
			components: this.createBrawlersComponents(
				await this.getPlayer(tag!, edit),
				request.url,
				id,
				Number(
					data.component_type === ComponentType.StringSelect
						? data.values[0]
						: order,
				) || undefined,
				Number(page) || undefined,
			),
			flags: MessageFlags.IsComponentsV2,
		});
	};
	static membersComponent = async (
		{ defer, deferUpdate, edit }: ComponentReplies,
		{
			interaction: { data },
			request: { url },
			args: [tag, order, page, replyFlag],
			user: { id },
		}: ComponentArgs,
	) => {
		if (replyFlag) defer();
		else deferUpdate();
		return edit({
			components: this.createMembersComponents(
				await this.getClub(tag!, edit),
				url,
				id,
				Number(
					data.component_type === ComponentType.StringSelect
						? data.values[0]
						: order,
				) || undefined,
				Number(page) || undefined,
			),
			flags: MessageFlags.IsComponentsV2,
		});
	};
	static brawlerComponent = async (
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
	static playerComponent = async (
		{ defer, edit }: ComponentReplies,
		{ user: { id }, interaction, args: [tag] }: ComponentArgs,
	) => {
		if (interaction.data.component_type === ComponentType.StringSelect)
			[tag] = interaction.data.values;
		ok(tag);
		defer({ flags: MessageFlags.Ephemeral });
		return edit(this.createPlayerMessage(await this.getPlayer(tag, edit), id));
	};
	static clubComponent = async (
		{ defer, edit }: ComponentReplies,
		{ args: [tag], interaction: { locale }, user: { id } }: ComponentArgs,
	) => {
		defer();
		return edit(
			this.createClubMessage(await this.getClub(tag!, edit), id, locale),
		);
	};
}
