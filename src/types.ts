import type {
	APIApplicationCommandAutocompleteInteraction,
	APIApplicationCommandAutocompleteResponse,
	APIApplicationCommandInteraction,
	APIApplicationCommandInteractionDataBasicOption,
	APIApplicationCommandOption,
	APIApplicationCommandSubcommandGroupOption,
	APIApplicationCommandSubcommandOption,
	APIChatInputApplicationCommandInteraction,
	APIInteraction,
	APIInteractionResponse,
	APIInteractionResponseChannelMessageWithSource,
	APIInteractionResponseDeferredChannelMessageWithSource,
	APIInteractionResponseDeferredMessageUpdate,
	APIInteractionResponseUpdateMessage,
	APIMessageApplicationCommandInteraction,
	APIMessageComponentInteraction,
	APIModalInteractionResponse,
	APIModalSubmitInteraction,
	APIUser,
	APIUserApplicationCommandInteraction,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
	RESTPatchAPIInteractionOriginalResponseJSONBody,
	RESTPostAPIApplicationCommandsJSONBody,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	RESTPostAPIInteractionFollowupJSONBody,
	RoutesDeclarations,
} from "discord-api-types/v10";
import type Command from "./Command.ts";
import type { CommandHandler } from "./util/CommandHandler.ts";
import type { MatchStatus } from "./util/Constants.ts";

declare global {
	interface ObjectConstructor {
		keys<T extends object>(o: T): (keyof T)[];
	}
	type Falsy = false | "" | 0 | 0n | null | undefined;

	type Booleaned<T> = Exclude<T, Falsy>;

	type Awaitable<T> = Promise<T> | T;

	type RecursiveReadonly<T> = {
		readonly [P in keyof T]: RecursiveReadonly<T[P]>;
	};

	type RecursivePartial<T> = {
		[P in keyof T]?: RecursivePartial<T[P]>;
	};

	type InteractionByType<
		T extends InteractionType,
		I extends APIInteraction = APIInteraction,
	> = I extends APIInteraction & { type: T } ? I : never;
	type CommandInteractionByType<
		T extends ApplicationCommandType,
		I extends InteractionByType<InteractionType.ApplicationCommand> = InteractionByType<InteractionType.ApplicationCommand>,
	> = I extends InteractionByType<InteractionType.ApplicationCommand> & {
		data: { type: T };
	}
		? I
		: never;

	type CommandData<
		T extends ApplicationCommandType = ApplicationCommandType,
		O extends ApplicationCommandOptionType = ApplicationCommandOptionType,
		N extends string = string,
	> = RESTPostAPIApplicationCommandsJSONBody & {
		type: T;
		options?: (APIApplicationCommandOption & {
			type: O;
		})[];
		name: N;
	};

	type ReplyFunction<
		T extends APIInteractionResponse = APIInteractionResponse,
	> = (result: T) => void;

	type ExecutorContext<T extends APIInteraction = APIInteraction> = {
		context: ExecutionContext;
		interaction: T;
		host: string;
	};

	type Merge<A, B> = {
		[K in Exclude<keyof A, keyof B>]?: A[K];
	} & {
		[K in Exclude<keyof B, keyof A>]?: B[K];
	} & {
		[K in Extract<keyof A, keyof B>]: A[K] | B[K];
	};

	/**
	 * Options to create a command
	 */
	type CommandOptions<
		T extends ApplicationCommandType = ApplicationCommandType,
		O extends ApplicationCommandOptionType = ApplicationCommandOptionType,
		N extends string = string,
	> = {
		/**
		 * The data for this command
		 */
		data: [CommandData<T, O, N>, ...CommandData<T, O, N>[]];

		/**
		 * If this command is private
		 */
		isPrivate?: boolean;

		/**
		 * A functions to run when an autocomplete request is received by Discord.
		 * @param this - The command object that called this
		 * @param interaction - The interaction received
		 */
		autocomplete?: (
			reply: ReplyFunction<APIApplicationCommandAutocompleteResponse>,
			context: ExecutorContext<
				InteractionByType<InteractionType.ApplicationCommandAutocomplete>
			>,
		) => Awaitable<void>;

		/**
		 * A function to run when an interaction from a message component with the custom_id of this command is received.
		 * @param this - The command object that called this
		 * @param interaction - The interaction received
		 */
		component?: (
			reply: ReplyFunction<
				| APIInteractionResponseChannelMessageWithSource
				| APIInteractionResponseDeferredChannelMessageWithSource
				| APIInteractionResponseDeferredMessageUpdate
				| APIInteractionResponseUpdateMessage
				| APIModalInteractionResponse
			>,
			context: ExecutorContext<
				InteractionByType<InteractionType.MessageComponent>
			>,
		) => Awaitable<void>;

		/**
		 * A function to run when a modal is submitted with the custom_id of this command is received.
		 * @param this - The command object that called this
		 * @param interaction - The interaction received
		 */
		modalSubmit?: (
			reply: ReplyFunction<
				| APIInteractionResponseChannelMessageWithSource
				| APIInteractionResponseDeferredChannelMessageWithSource
				| APIInteractionResponseDeferredMessageUpdate
			>,
			context: ExecutorContext<InteractionByType<InteractionType.ModalSubmit>>,
		) => Awaitable<void>;

		/**
		 * A function to run when this command is received.
		 * @param this - The command object that called this
		 * @param interaction - The interaction received
		 */
		run: (
			reply: ReplyFunction<
				| APIInteractionResponseChannelMessageWithSource
				| APIInteractionResponseDeferredChannelMessageWithSource
				| APIModalInteractionResponse
			>,
			context: ExecutorContext<CommandInteractionByType<T>>,
		) => Awaitable<void>;
	};

	/**
	 * A response from thecatapi.com
	 */
	type CatResponse = {
		breeds: [];
		categories: { id: number; name: string }[];
		height: number;
		id: string;
		url: string;
		width: number;
	}[];

	/**
	 * A response from thedogapi.com
	 */
	type DogResponse = {
		breeds: [];
		height: number;
		id: string;
		url: string;
		width: number;
	}[];

	type Match = {
		home_goal: number | null;
		away_goal: number | null;
		home_team_name: Uppercase<string>;
		away_team_name: Uppercase<string>;
		date_time: string;
		match_status: MatchStatus;
		slug: string;
		match_id: number;
		match_name: string;
		match_day_id_category: number;
		match_day_order: `${number}`;
	};
	type MatchesData =
		| {
				success: true;
				data: Match[];
		  }
		| { success: false; message: string; errors: unknown[] };
	type MatchDay = {
		category_status: "LIVE" | "PLAYED" | "TO BE PLAYED";
		title: `Matchday ${number}`;
		id_category: number;
	};
	type MatchDayResponse =
		| {
				success: false;
				message: string;
				errors: Rpc.Serializable<unknown>[];
		  }
		| {
				success: true;
				data: MatchDay[];
		  };

	type CommentaryResponse = {
		success: boolean;
		message: string;
		errors: {
			type: string;
			message: string;
			params: unknown[];
		}[];
		data: {
			messages: {
				comment: string;
				id: string;
				lastModified: string;
				minute: string;
				period: string;
				second: string;
				time: string;
				type: string;
				varCheck: string;
			}[];
		};
	};

	type Leaderboard = [
		user: ResolvedUser,
		matchPoints: number,
		dayPoints: number,
		maxPoints: number,
	][];

	type Prediction = {
		matchId: number;
		userId: string;
		prediction: string;
	};
	type User = {
		id: string;
		dayPoints?: number | null;
		matchPointsHistory?: string | null;
		match?: number | null;
		remindMinutes?: number | null;
		brawlTag?: string;
		brawlNotifications: number;
		brawlTrophies?: number | null;
		brawlers?: string | null;
		clashTag?: string;
		clashNotifications: number;
		arena?: string | null;
		league?: number | null;
		cards?: string | null;
	};
	type Reminder = {
		id: string;
		date: string;
		userId: string;
		remind: string;
	};

	type ResolvedUser = Pick<
		User,
		"dayPoints" | "id" | "match" | "matchPointsHistory"
	> & {
		predictions: Pick<Prediction, "matchId" | "prediction">[];
	};

	type ExtractOptionType<
		T extends RecursiveReadonly<APIApplicationCommandOption> = APIApplicationCommandOption,
	> = T extends {
		choices: { value: infer V }[];
	}
		? V
		: // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
		  (APIApplicationCommandInteractionDataBasicOption<InteractionType.ApplicationCommand> & {
				type: T["type"];
		  })["value"];
	type ResolvedOptions<
		T extends RecursiveReadonly<
			| APIApplicationCommandSubcommandGroupOption
			| APIApplicationCommandSubcommandOption
		>,
		S extends string | undefined = undefined,
	> = T extends any
		? CreateObject<
				NonNullable<T["options"]>,
				undefined extends S ? T["name"] : `${S} ${T["name"]}`
		  >
		: never;
	type CreateObject<
		T extends RecursiveReadonly<APIApplicationCommandOption[]>,
		S extends string | undefined = undefined,
		R extends boolean = true,
	> = T extends RecursiveReadonly<
		(
			| APIApplicationCommandSubcommandGroupOption
			| APIApplicationCommandSubcommandOption
		)[]
	>
		? ResolvedOptions<T[number], S>
		: {
				subcommand: S;
				options: {
					[P in T[number] as P["name"]]: R extends true
						? P["required"] extends true
							? ExtractOptionType<P>
							: ExtractOptionType<P> | undefined
						: ExtractOptionType<P> | undefined;
				};
		  };
	type ParseOptions<
		T extends
			| RecursiveReadonly<RESTPostAPIChatInputApplicationCommandsJSONBody>
			| undefined,
		R extends boolean = true,
	> = RESTPostAPIChatInputApplicationCommandsJSONBody extends T
		? {
				subcommand?: string;
				options: Record<string, ExtractOptionType | undefined>;
		  }
		: CreateObject<NonNullable<NonNullable<T>["options"]>, undefined, R>;

	type Reply<T extends InteractionResponseType> = (
		data?: Extract<APIInteractionResponse, { type: T }> extends {
			data?: infer D;
		}
			? D
			: never,
	) => void;
	type BaseReplies = {
		edit: (
			data: RESTPatchAPIInteractionOriginalResponseJSONBody,
		) => Promise<void>;
		delete: () => Promise<void>;
		followup: (data: RESTPostAPIInteractionFollowupJSONBody) => Promise<void>;
	};
	type Replies = {
		[P in keyof typeof CommandHandler.ReplyTypes]: Reply<
			(typeof CommandHandler.ReplyTypes)[P]
		>;
	} & BaseReplies;

	type BaseArgs<T extends APIInteraction = APIInteraction> = {
		interaction: T;
		request: Request;
		user: APIUser;
		fullRoute: ReturnType<RoutesDeclarations["webhookMessage"]>;
	};

	type ChatInputReplies = Pick<Replies, "reply" | "defer" | "modal"> &
		BaseReplies;

	type ChatInputArgs<
		A extends RecursiveReadonly<RESTPostAPIChatInputApplicationCommandsJSONBody> = RESTPostAPIChatInputApplicationCommandsJSONBody,
		B extends string | undefined = string | undefined,
	> = BaseArgs<APIChatInputApplicationCommandInteraction> &
		ParseOptions<A> & {
			subcommand: B;
		};

	type AutoCompleteReplies = Pick<Replies, "autocomplete">;

	type AutoCompleteArgs<
		A extends RecursiveReadonly<RESTPostAPIChatInputApplicationCommandsJSONBody> = RESTPostAPIChatInputApplicationCommandsJSONBody,
	> = BaseArgs<APIApplicationCommandAutocompleteInteraction> & ParseOptions<A>;

	type ComponentReplies = Pick<
		Replies,
		"reply" | "defer" | "modal" | "update" | "deferUpdate"
	> &
		BaseReplies;

	type ComponentArgs = BaseArgs<APIMessageComponentInteraction> & {
		args: string[];
	};

	type ModalReplies = Pick<Replies, "reply" | "defer"> & BaseReplies;

	type ModalArgs = BaseArgs<APIModalSubmitInteraction> & {
		args: string[];
	};

	type UserReplies = Pick<Replies, "reply" | "defer" | "modal"> & BaseReplies;

	type UserArgs = BaseArgs<APIUserApplicationCommandInteraction>;

	type MessageReplies = Pick<Replies, "reply" | "defer" | "modal"> &
		BaseReplies;

	type MessageArgs = BaseArgs<APIMessageApplicationCommandInteraction>;

	type CommandRunners = NonNullable<
		{
			[K in keyof typeof Command]: (typeof Command)[K] extends
				| ((...args: any[]) => any)
				| undefined
				? K
				: never;
		}[keyof typeof Command]
	>;

	type Runner = (
		this: typeof Command,
		replies: Replies,
		args: {
			interaction: APIInteraction;
			request: Request;
			user: APIUser;
			subcommand?: string;
			options?: Record<string, string | number | boolean>;
			args?: string[];
			fullRoute?: ReturnType<RoutesDeclarations["webhookMessage"]>;
		},
	) => Promise<any>;

	type CommandTests = {
		name: string;
		interaction: Partial<
			| APIApplicationCommandAutocompleteInteraction
			| APIApplicationCommandInteraction
			| APIMessageComponentInteraction
			| APIModalSubmitInteraction
		>;
		response: APIInteractionResponse;
	}[];

	type Filter<T, U> = {
		[K in keyof T as T[K] extends U ? K : never]: T[K];
	};

	namespace Brawl {
		type Player = {
			"club": PlayerClub;
			"isQualifiedFromChampionshipChallenge": boolean;
			"3vs3Victories": number;
			"icon": PlayerIcon;
			"tag": string;
			"name": string;
			"trophies": number;
			"expLevel": number;
			"expPoints": number;
			"highestTrophies": number;
			"soloVictories": number;
			"duoVictories": number;
			"bestRoboRumbleTime": number;
			"bestTimeAsBigBrawler": number;
			"brawlers": BrawlerStatList;
			"nameColor": string;
		};
		type PlayerClub = { tag: string; name: string };
		type PlayerIcon = { id: number };
		type BrawlerStatList = BrawlerStat[];
		type BrawlerStat = {
			gadgets: AccessoryList;
			starPowers: StarPowerList;
			id: number;
			rank: number;
			trophies: number;
			highestTrophies: number;
			power: number;
			gears: GearStatList;
			name: JsonLocalizedName;
		};
		type AccessoryList = Accessory[];
		type Accessory = { id: number; name: JsonLocalizedName };
		type JsonLocalizedName = string;
		type StarPowerList = StarPower[];
		type StarPower = { id: number; name: JsonLocalizedName };
		type GearStatList = GearStat[];
		type GearStat = {
			id: number;
			name: JsonLocalizedName;
			level: number;
		};
		type BrawlerList = Brawler[];
		type Brawler = {
			gadgets: AccessoryList;
			name: JsonLocalizedName;
			id: number;
			starPowers: StarPowerList;
		};
		type Club = {
			tag: string;
			name: string;
			description: string;
			trophies: number;
			requiredTrophies: number;
			members: ClubMemberList;
			type: "open" | "inviteOnly" | "closed" | "unknown";
			badgeId: number;
		};
		type ClubMemberList = ClubMember[];
		type ClubMember = {
			icon: PlayerIcon;
			tag: string;
			name: string;
			trophies: number;
			role:
				| "notMember"
				| "member"
				| "vicePresident"
				| "president"
				| "unknown"
				| "senior";
			nameColor: string;
		};
	}
	namespace Clash {
		type Player = {
			clan: PlayerClan;
			legacyTrophyRoadHighScore?: number;
			currentDeck: PlayerItemLevelList;
			currentDeckSupportCards: PlayerItemLevelList;
			arena: Arena;
			role?: "notMember" | "member" | "leader" | "admin" | "coleader";
			wins?: number;
			losses?: number;
			totalDonations?: number;
			leagueStatistics: PlayerLeagueStatistics;
			cards: PlayerItemLevelList;
			supportCards?: PlayerItemLevelList;
			currentFavouriteCard?: Item;
			badges?: PlayerAchievementBadgeList;
			tag: string;
			name: string;
			expLevel: number;
			trophies: number;
			bestTrophies: number;
			donations?: number;
			donationsReceived?: number;
			achievements?: PlayerAchievementProgressList;
			battleCount?: number;
			threeCrownWins?: number;
			challengeCardsWon?: number;
			challengeMaxWins?: number;
			tournamentCardsWon?: number;
			tournamentBattleCount?: number;
			warDayWins: number;
			clanCardsCollected: number;
			starPoints?: number;
			expPoints?: number;
			totalExpPoints: number;
			currentPathOfLegendSeasonResult?: PathOfLegendSeasonResult;
			lastPathOfLegendSeasonResult?: PathOfLegendSeasonResult;
			bestPathOfLegendSeasonResult?: PathOfLegendSeasonResult;
			progress: Record<
				string,
				{ arena: Arena; trophies: number; bestTrophies: number }
			>;
		};
		type PlayerClan = {
			badgeId: number;
			tag: string;
			name: string;
		};
		type PlayerItemLevelList = PlayerItemLevel[];
		type PlayerItemLevel = {
			id: number;
			rarity: "common" | "rare" | "epic" | "legendary" | "champion";
			count: number;
			level: number;
			starLevel?: number;
			evolutionLevel?: number;
			used: boolean;
			name: JsonLocalizedName;
			maxLevel: number;
			elixirCost?: number;
			maxEvolutionLevel?: number;
			iconUrls?: { medium?: string; evolutionMedium?: string };
		};
		type JsonLocalizedName = string;
		type Arena = {
			name: JsonLocalizedName;
			id: number;
			iconUrls?: unknown;
		};
		type PlayerLeagueStatistics = {
			previousSeason: LeagueSeasonResult;
			bestSeason: LeagueSeasonResult;
			currentSeason: LeagueSeasonResult;
		};
		type LeagueSeasonResult = {
			trophies: number;
			rank: number;
			bestTrophies: number;
			id: string;
		};
		type Item = {
			iconUrls?: { medium?: string; evolutionMedium?: string };
			name: JsonLocalizedName;
			id: number;
			rarity: "common" | "rare" | "epic" | "legendary" | "champion";
			maxLevel: number;
			elixirCost: number;
			maxEvolutionLevel: number;
		};
		type PlayerAchievementBadgeList = PlayerAchievementBadge[];
		type PlayerAchievementBadge = {
			iconUrls: { large?: string };
			maxLevel?: number;
			progress?: number;
			level?: number;
			target?: number;
			name: string;
		};
		type PlayerAchievementProgressList = PlayerAchievementProgress[];
		type PlayerAchievementProgress = {
			stars: number;
			value: number;
			name: JsonLocalizedName;
			target: number;
			info: JsonLocalizedName;
			completionInfo: JsonLocalizedName;
		};
		type PathOfLegendSeasonResult = {
			trophies: number;
			rank?: number;
			leagueNumber: number;
		};
		type Clan = {
			memberList: ClanMemberList;
			tag: string;
			donationsPerWeek?: number;
			clanChestMaxLevel: number;
			clanChestStatus: "inactive" | "active" | "completed" | "unknown";
			clanChestLevel: number;
			clanWarTrophies?: number;
			requiredTrophies?: number;
			badgeId: number;
			clanScore?: number;
			name: string;
			location?: Location;
			type?: "open" | "closed" | "inviteOnly";
			members: number;
			description: string;
			clanChestPoints: number;
			badgeUrls?: unknown;
		};
		type ClanMemberList = ClanMember[];
		type ClanMember = {
			clanChestPoints: number;
			arena: Arena;
			lastSeen: string;
			tag: string;
			name: string;
			role: "notMember" | "member" | "leader" | "admin" | "coleader" | "elder";
			expLevel: number;
			trophies: number;
			clanRank: number;
			previousClanRank: number;
			donations: number;
			donationsReceived: number;
		};
		type Location = {
			localizedName?: string;
			id: number;
			name: string;
			isCountry: boolean;
			countryCode: string;
		};
		type BattleList = Battle[];
		type Battle = {
			gameMode?: GameMode;
			arena?: Arena;
			type:
				| "pvp"
				| "pve"
				| "clanmate"
				| "tournament"
				| "friendly"
				| "survival"
				| "pvp2v2"
				| "clanmate2v2"
				| "challenge2v2"
				| "clanwarCollectionDay"
				| "clanwarWarDay"
				| "casual1v1"
				| "casual2v2"
				| "boatBattle"
				| "boatBattlePractice"
				| "riverRacePvp"
				| "riverRaceDuel"
				| "riverRaceDuelColosseum"
				| "tutorial"
				| "pathOfLegend"
				| "seasonalBattle"
				| "practice"
				| "trail"
				| "unknown";
			deckSelection:
				| "collection"
				| "draft"
				| "draftCompetitive"
				| "predefined"
				| "eventDeck"
				| "pick"
				| "wardeckPick"
				| "quaddeckPick"
				| "unknown";
			team: PlayerBattleDataList;
			opponent: PlayerBattleDataList;
			challengeWinCountBefore: number;
			boatBattleSide: string;
			boatBattleWon: boolean;
			newTowersDestroyed: number;
			prevTowersDestroyed: number;
			remainingTowers: number;
			leagueNumber: number;
			battleTime: string;
			challengeId: number;
			tournamentTag: string;
			challengeTitle: string;
			isLadderTournament: boolean;
			isHostedMatch: boolean;
			eventTag: string;
		};
		type GameMode = { id: number; name: string };
		type PlayerBattleDataList = PlayerBattleData[];
		type PlayerBattleData = {
			clan?: PlayerClan;
			cards: PlayerItemLevelList;
			supportCards?: PlayerItemLevelList;
			rounds: PlayerBattleRoundList;
			crowns: number;
			princessTowersHitPoints?: number[];
			elixirLeaked: number;
			globalRank: number;
			tag: string;
			name: string;
			startingTrophies?: number;
			trophyChange: number;
			kingTowerHitPoints: number;
		};
		type PlayerBattleRoundList = PlayerBattleRound[];
		type PlayerBattleRound = {
			cards: PlayerItemLevelList;
			elixirLeaked: number;
			crowns: number;
			kingTowerHitPoints: number;
			princessTowersHitPoints: number[];
		};
		type CurrentRiverRace = {
			state:
				| "clanNotFound"
				| "accessDenied"
				| "matchmaking"
				| "matched"
				| "full"
				| "ended";
			clan: RiverRaceClan;
			clans: RiverRaceClanList;
			collectionEndTime: string;
			warEndTime: string;
			sectionIndex: number;
			periodIndex: number;
			periodType: "training" | "warDay" | "colosseum";
			periodLogs: PeriodLogList;
		};
		type RiverRaceClan = {
			tag: string;
			clanScore: number;
			badgeId: number;
			name: string;
			fame: number;
			repairPoints: number;
			finishTime: string;
			participants: RiverRaceParticipantList;
			periodPoints: number;
		};
		type RiverRaceParticipantList = RiverRaceParticipant[];
		type RiverRaceParticipant = {
			tag: string;
			name: string;
			fame: number;
			repairPoints: number;
			boatAttacks: number;
			decksUsed: number;
			decksUsedToday: number;
		};
		type RiverRaceClanList = RiverRaceClan[];
		type PeriodLogList = PeriodLog[];
		type PeriodLog = {
			periodIndex: number;
			items: PeriodLogEntryList;
		};
		type PeriodLogEntryList = PeriodLogEntry[];
		type PeriodLogEntry = {
			clan: PeriodLogEntryClan;
			pointsEarned: number;
			progressStartOfDay: number;
			progressEndOfDay: number;
			endOfDayRank: number;
			progressEarned: number;
			numOfDefensesRemaining: number;
			progressEarnedFromDefenses: number;
		};
		type PeriodLogEntryClan = { tag: string };
	}
}
