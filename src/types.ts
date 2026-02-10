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

	type RecursivePartial<T> = { [P in keyof T]?: RecursivePartial<T[P]> };

	type InteractionByType<
		T extends InteractionType,
		I extends APIInteraction = APIInteraction,
	> = I extends APIInteraction & { type: T } ? I : never;
	type CommandInteractionByType<
		T extends ApplicationCommandType,
		I extends InteractionByType<InteractionType.ApplicationCommand> =
			InteractionByType<InteractionType.ApplicationCommand>,
	> =
		I extends (
			InteractionByType<InteractionType.ApplicationCommand> & {
				data: { type: T };
			}
		) ?
			I
		:	never;

	type CommandData<
		T extends ApplicationCommandType = ApplicationCommandType,
		O extends ApplicationCommandOptionType = ApplicationCommandOptionType,
		N extends string = string,
	> = RESTPostAPIApplicationCommandsJSONBody & {
		type: T;
		options?: (APIApplicationCommandOption & { type: O })[];
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

	type Merge<A, B> = { [K in Exclude<keyof A, keyof B>]?: A[K] } & {
		[K in Exclude<keyof B, keyof A>]?: B[K];
	} & { [K in Extract<keyof A, keyof B>]: A[K] | B[K] };

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
		providerId: string;
		seasonId: string;
		editorial: {
			broadcasters: {
				broadcasterNational1: string;
				broadcasterNational2: string;
				broadcasterNational3: string;
				broadcasterInternational1: string;
				broadcasterInternational2: string;
				broadcasterInternational3: string;
			};
			highlightsUrl: string;
			highlightsNationalUrl: string;
			highlightsInternationalUrl: string;
			ticketsUrl: string;
			sponsorImage: string;
			themeNight: string;
			editorials: [];
		};
		matchId: string;
		status: string;
		providerStatus: string;
		phase: string;
		matchDateUtc: string;
		matchDateLocal: string;
		localTimeUtcOffset: string;
		homeScorePush: null | number;
		awayScorePush: null | number;
		providerPenaltyScoreHome: number | null;
		providerPenaltyScoreAway: number | null;
		aggregate: string;
		winReason: string;
		winTeamId: string | null;
		previousLegsResult: null;
		home: Team;
		away: Team;
		stadiumId: string;
		stadiumName: string;
		cityName: string;
		group: string;
		groupName: string;
		roundId: string;
		roundName: string;
		matchSet: MatchDay;
		scheduleStatus: string;
		providerHomeScore: null | number;
		providerAwayScore: null | number;
		groupId: string;
		subLeague: string;
		time: string;
		additionalTime: string;
	};
	type Team = {
		teamId: string;
		providerId: string;
		shortName: string;
		officialName: string;
		acronymName: string;
		acronymNameLocalized: string;
		isTeamFake: boolean;
		mediaName: string;
		mediaShortName: string;
		countryCode: string;
		teamType: string;
		stadium: null;
		imagery: {
			stadiumImage: string;
			teamImage: string;
			teamLogo: string;
			teamLogoLight: string;
		};
		allSeasonImagery: [];
	};
	type Competition = {
		seasonId: string;
		startDateUtc: string | null;
		endDateUtc: string | null;
		seasonName: string;
		imagery: { seasonLogo: string };
		competitionId: string;
		providerId: string;
		name: string;
		officialName: string;
		shortName: string;
		acronymName: string;
	};

	type MatchesData = {
		competition: Competition;
		matches: Match[];
		apiCallRequestTime: string;
	};
	type MatchDay = {
		matchSetId: string;
		providerId: string;
		name: string;
		seasonId: string;
		competitionId: string;
		roundId: string | null;
		stageId: string;
		index: number | null;
		shortName: string;
		matchSetFormatId: string | null;
		type: string | null;
		startDateUtc: string;
		endDateUtc: string;
		matchdayStatus: "Played" | "Playing" | "Fixture" | "Partially Played";
	};
	type SeasonResponse = {
		competition: Competition;
		matchdays: MatchDay[];
		apiCallRequestTime: string;
	};

	type CommentaryResponse = {
		success: boolean;
		message: string;
		errors: { type: string; message: string; params: unknown[] }[];
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

	type Prediction = { matchId: string; userId: string; prediction: string };
	type User = {
		id: string;
		dayPoints?: number | null;
		matchPointsHistory?: string | null;
		match?: string | null;
		remindMinutes?: number | null;
		brawlTag?: string;
		brawlNotifications: number;
		brawlTrophies?: number | null;
		brawlers?: string | null;
		clashTag?: string;
		clashNotifications: number;
		arena?: number | null;
		league?: number | null;
		cards?: string | null;
	};
	type Reminder = { id: string; date: string; userId: string; remind: string };

	type ResolvedUser = Pick<
		User,
		"dayPoints" | "id" | "match" | "matchPointsHistory"
	> & { predictions: Pick<Prediction, "matchId" | "prediction">[] };

	type ExtractOptionType<
		T extends RecursiveReadonly<APIApplicationCommandOption> =
			APIApplicationCommandOption,
	> =
		T extends { choices: { value: infer V }[] } ? V
		:	(APIApplicationCommandInteractionDataBasicOption<InteractionType.ApplicationCommand> & {
				type: T["type"];
			})["value"];
	type ResolvedOptions<
		T extends RecursiveReadonly<
			| APIApplicationCommandSubcommandGroupOption
			| APIApplicationCommandSubcommandOption
		>,
		S extends string | undefined = undefined,
	> =
		T extends any ?
			CreateObject<
				NonNullable<T["options"]>,
				undefined extends S ? T["name"] : `${S} ${T["name"]}`
			>
		:	never;
	type CreateObject<
		T extends RecursiveReadonly<APIApplicationCommandOption[]>,
		S extends string | undefined = undefined,
		R extends boolean = true,
	> =
		T extends (
			RecursiveReadonly<
				(
					| APIApplicationCommandSubcommandGroupOption
					| APIApplicationCommandSubcommandOption
				)[]
			>
		) ?
			ResolvedOptions<T[number], S>
		:	{
				subcommand: S;
				options: {
					[P in T[number] as P["name"]]: R extends true ?
						P["required"] extends true ?
							ExtractOptionType<P>
						:	ExtractOptionType<P> | undefined
					:	ExtractOptionType<P> | undefined;
				};
			};
	type ParseOptions<
		T extends
			| RecursiveReadonly<RESTPostAPIChatInputApplicationCommandsJSONBody>
			| undefined,
		R extends boolean = true,
	> =
		RESTPostAPIChatInputApplicationCommandsJSONBody extends T ?
			{
				subcommand?: string;
				options: Record<string, ExtractOptionType | undefined>;
			}
		:	CreateObject<NonNullable<NonNullable<T>["options"]>, undefined, R>;

	type Reply<T extends InteractionResponseType> = (
		data?: Extract<APIInteractionResponse, { type: T }> extends (
			{ data?: infer D }
		) ?
			D
		:	never,
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
		A extends
			RecursiveReadonly<RESTPostAPIChatInputApplicationCommandsJSONBody> =
			RESTPostAPIChatInputApplicationCommandsJSONBody,
		B extends string | undefined = string | undefined,
	> = BaseArgs<APIChatInputApplicationCommandInteraction> &
		ParseOptions<A> & { subcommand: B };

	type AutoCompleteReplies = Pick<Replies, "autocomplete">;

	type AutoCompleteArgs<
		A extends
			RecursiveReadonly<RESTPostAPIChatInputApplicationCommandsJSONBody> =
			RESTPostAPIChatInputApplicationCommandsJSONBody,
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

	type ModalArgs = BaseArgs<APIModalSubmitInteraction> & { args: string[] };

	type UserReplies = Pick<Replies, "reply" | "defer" | "modal"> & BaseReplies;

	type UserArgs = BaseArgs<APIUserApplicationCommandInteraction>;

	type MessageReplies = Pick<Replies, "reply" | "defer" | "modal"> &
		BaseReplies;

	type MessageArgs = BaseArgs<APIMessageApplicationCommandInteraction>;

	type CommandRunners = NonNullable<
		{
			[K in keyof typeof Command]: (typeof Command)[K] extends (
				((...args: any[]) => any) | undefined
			) ?
				K
			:	never;
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

	type Filter<T, U> = { [K in keyof T as T[K] extends U ? K : never]: T[K] };

	namespace Twitter {
		type User = {
			__typename: "User";
			id: string;
			rest_id: string;
			affiliates_highlighted_label: object;
			avatar: { image_url: string };
			core: { created_at: string; name: string; screen_name: string };
			dm_permissions: object;
			is_blue_verified: boolean;
			legacy: {
				default_profile: boolean;
				default_profile_image: boolean;
				description: string;
				entities: {
					description: { urls: [] };
					url: {
						urls: {
							display_url: string;
							expanded_url: string;
							url: string;
							indices: [number, number];
						}[];
					};
				};
				fast_followers_count: number;
				favourites_count: number;
				followers_count: number;
				friends_count: number;
				has_custom_timelines: boolean;
				is_translator: boolean;
				listed_count: number;
				media_count: number;
				normal_followers_count: number;
				pinned_tweet_ids_str: string[];
				possibly_sensitive: boolean;
				profile_banner_url: string;
				profile_interstitial_type: string;
				statuses_count: number;
				translator_type: string;
				withheld_in_countries: string[];
				url: string;
			};
			location: { location: string };
			media_permissions: object;
			parody_commentary_fan_label: string;
			profile_image_shape: string;
			profile_bio: { description: string };
			privacy: { protected: boolean };
			relationship_perspectives: object;
			verification: { verified: boolean };
			profile_description_language?: string;
		};
		type Media = {
			display_url: string;
			expanded_url: string;
			ext_alt_text?: string;
			id_str: string;
			indices: number[];
			media_key: string;
			media_url_https: string;
			type: string;
			url: string;
			additional_media_info?: {
				monetizable: boolean;
				source_user?: { user_results: { result: User } };
			};
			ext_media_availability: { status: string };
			sizes: {
				large: { h: number; w: number; resize: string };
				medium: { h: number; w: number; resize: string };
				small: { h: number; w: number; resize: string };
				thumb: { h: number; w: number; resize: string };
			};
			original_info: {
				height: number;
				width: number;
				focus_rects: { x: number; y: number; w: number; h: number }[];
			};
			allow_download_status: { allow_download: boolean };
			video_info?: {
				aspect_ratio: number[];
				duration_millis: number;
				variants: { bitrate?: number; content_type: string; url: string }[];
			};
			media_results: { result: { media_key: string } };
		};
		type Entities = {
			hashtags: { indices: [number, number]; text: string }[];
			media?: Media[];
			symbols: [];
			timestamps: [];
			urls: [];
			user_mentions: {
				id_str: string;
				name: string;
				screen_name: string;
				indices: [number, number];
			}[];
		};
		type Tweet = {
			__typename: "Tweet";
			rest_id: string;
			core: { user_results: { result: User } };
			unmention_data: object;
			edit_control: {
				edit_tweet_ids: string[];
				editable_until_msecs: string;
				is_edit_eligible: boolean;
				edits_remaining: `${number}`;
			};
			is_translatable: boolean;
			views: { count: `${number}`; state: string };
			source: string;
			note_tweet?: {
				is_expandable: boolean;
				note_tweet_results: {
					result: { id: string; text: string; entity_set: Entities };
				};
			};
			grok_analysis_button: boolean;
			quoted_status_result?: { result: Tweet };
			legacy: {
				bookmark_count: number;
				bookmarked: boolean;
				created_at: string;
				conversation_id_str: string;
				entities: Entities;
				extended_entities: { media: Media[] };
				favorite_count: number;
				favorited: boolean;
				full_text: string;
				is_quote_status: boolean;
				lang: string;
				possibly_sensitive: boolean;
				possibly_sensitive_editable: boolean;
				quote_count: number;
				reply_count: number;
				retweet_count: number;
				retweeted: boolean;
				user_id_str: string;
				id_str: string;
			};
			grok_annotations: { is_image_editable_by_grok: boolean };
		};
		type TweetResultByRestId = { data: { tweetResult: { result: Tweet } } };
	}

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
		type GearStat = { id: number; name: JsonLocalizedName; level: number };
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
		type PlayerClan = { badgeId: number; tag: string; name: string };
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
			iconUrls?: {
				medium?: string;
				evolutionMedium?: string;
				heroMedium?: string;
			};
		};
		type JsonLocalizedName = string;
		type Arena = { name: JsonLocalizedName; id: number; iconUrls?: unknown };
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
		type PeriodLog = { periodIndex: number; items: PeriodLogEntryList };
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
