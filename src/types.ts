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
		type UrlEntity = {
			display_url: string;
			expanded_url: string;
			url: string;
			indices: [number, number];
		};
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
					description: { urls: UrlEntity[] };
					url: { urls: UrlEntity[] };
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
		type Variant = { bitrate?: number; content_type: string; url: string };
		type Media = {
			display_url: string;
			expanded_url: string;
			ext_alt_text?: string;
			id_str: string;
			indices: [number, number];
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
				focus_rects?: { x: number; y: number; w: number; h: number }[];
			};
			allow_download_status: { allow_download: boolean };
			video_info?: {
				aspect_ratio: number[];
				duration_millis: number;
				variants: Variant[];
			};
			media_results: { result: { media_key: string } };
		};
		type Entities = {
			hashtags: { indices: [number, number]; text: string }[];
			media?: Media[];
			symbols: [];
			timestamps: [];
			urls: UrlEntity[];
			user_mentions: {
				id_str: string;
				name: string;
				screen_name: string;
				indices: [number, number];
			}[];
		};
		type TextEntity = {
			fromIndex: number;
			ref: { type: string; url: string; urlType: string };
			toIndex: number;
		};
		type BlurredMediaTombstone = {
			__typename: "BlurredMediaTombstone";
			blurred_image_url: string;
			text: { entities: TextEntity[]; rtl: boolean; text: string };
			user_results: { result: User };
		};
		type TweetTombstone = {
			__typename: "TweetTombstone";
			tombstone: BlurredMediaTombstone;
		};
		type TweetCard = {
			type: string;
			components: string[];
			media_entities: Record<
				string,
				Media & {
					id: number;
					media_url: string;
					source_user_id: number;
					source_user_id_str: string;
					media_key: string;
				}
			>;
		};
		type StringBinding = {
			key: string;
			value: { scribe_key?: string; string_value: string; type: "STRING" };
		};
		type ImageBinding = {
			key: string;
			value: {
				image_value: { height: number; url: string; width: number };
				type: "IMAGE";
			};
		};
		type Tweet = {
			__typename: "Tweet";
			card?: {
				legacy: {
					binding_values: (StringBinding | ImageBinding)[];
					card_platform: {
						platform: {
							audience: { name: string };
							device: { name: string; version: string };
						};
					};
					name: string;
					url: string;
					user_refs_results: [];
				};
				rest_id: string;
			};
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
			views: { count?: `${number}`; state: string };
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
				conversation_id_str: string;
				created_at: string;
				display_text_range?: [number, number];
				entities: Entities;
				extended_entities: { media: Media[] };
				favorite_count: number;
				favorited: boolean;
				full_text: string;
				id_str: string;
				in_reply_to_screen_name?: string;
				in_reply_to_status_id_str?: string;
				in_reply_to_user_id_str?: string;
				is_quote_status: boolean;
				lang: string;
				possibly_sensitive_editable: boolean;
				possibly_sensitive: boolean;
				quote_count: number;
				reply_count: number;
				retweet_count: number;
				retweeted_status_result?: { result: Tweet };
				retweeted: boolean;
				user_id_str: string;
			};
			grok_annotations: { is_image_editable_by_grok: boolean };
		};
		type TweetWithVisibilityResults = {
			__typename: "TweetWithVisibilityResults";
			limitedActionResults: { limited_actions: { action: string }[] };
			tweet: Omit<Tweet, "__typename">;
		};
		type TweetResultByRestId = {
			data: {
				tweetResult: {
					result?: Tweet | TweetTombstone | TweetWithVisibilityResults;
				};
			};
		};
	}
	namespace TikTok {
		type Image = { height: number; url_list: string[]; width: number };
		type Items = {
			status_code: number;
			status_msg: string;
			items?: {
				author_info: {
					avatar_url_list: string[];
					nickname: string;
					secret_id: string;
					unique_id: string;
				};
				desc: string;
				id: number;
				id_str: string;
				image_post_info?: {
					cover: {
						display_image: Image;
						owner_watermark_image: Image;
						thumbnail: Image;
					};
					images: {
						display_image: Image;
						owner_watermark_image: Image;
						thumbnail: Image;
					}[];
				};
				marker_info: { branded_content_type: number; is_ads: boolean };
				music_info: {
					author: string;
					id: number;
					id_str: string;
					title: string;
				};
				other_info: unknown;
				region: string;
				statistics_info: {
					comment_count: number;
					digg_count: number;
					share_count: number;
				};
				video_info: {
					meta: {
						bitrate: number;
						duration: number;
						height: number;
						ratio: number;
						width: number;
					};
					uri: string;
					url_list: string[];
				};
			}[];
		};
	}
	namespace Instagram {
		type User = {
			__typename: "XDTUserDict";
			pk: string;
			username: string;
			full_name: string;
			profile_pic_url: string;
			is_private: boolean;
			is_embeds_disabled: boolean;
			is_unpublished: boolean;
			is_verified: boolean;
			friendship_status: null;
			latest_reel_media: null;
			id: string;
			show_account_transparency_details: boolean;
			live_broadcast_visibility: null;
			live_broadcast_id: null;
			hd_profile_pic_url_info?: { url?: string };
			transparency_product: null;
			transparency_product_enabled: boolean;
			transparency_label: null;
			ai_agent_owner_username: null;
		};
		type Location = {
			__typename: "XDTLocationDict";
			pk: number;
			lat: number;
			lng: number;
			name: string;
			profile_pic_url: null;
		};
		type Comment = {
			__typename: "XDTCommentDict";
			pk: string;
			text: string;
			user: { pk: string; is_verified: boolean; username: string; id: string };
			has_liked_comment: null;
		};
		type Item = {
			code: string;
			pk: string;
			id: string;
			ad_id: null;
			taken_at: number;
			inventory_source: null;
			video_versions:
				| { width: number; height: number; url: string; type: number }[]
				| null;
			coauthor_producers: [];
			invited_coauthor_producers: [];
			facepile_top_likers: null;
			is_dash_eligible: number | null;
			number_of_qualities: number | null;
			video_dash_manifest: string | null;
			image_versions2: {
				candidates: { url: string; height: number; width: number }[];
			};
			is_paid_partnership: boolean;
			sponsor_tags: null;
			original_height: number;
			original_width: number;
			organic_tracking_token: string;
			user: User;
			group: null;
			comments_disabled: null;
			like_and_view_counts_disabled: boolean;
			can_viewer_reshare: boolean;
			product_type: string;
			media_type: number;
			usertags: {
				in: {
					user: {
						pk: string;
						full_name: string;
						username: string;
						profile_pic_url: string;
						is_verified: boolean;
						id: string;
					};
					position: [number, number];
				}[];
			} | null;
			media_overlay_info: null;
			carousel_media:
				| {
						id: string;
						pk: string;
						accessibility_caption: null;
						is_dash_eligible: number | null;
						video_dash_manifest: string | null;
						original_height: number;
						original_width: number;
						image_versions2: {
							candidates: { url: string; height: number; width: number }[];
						};
						carousel_parent_id: string;
						sharing_friction_info: {
							should_have_sharing_friction: boolean;
							bloks_app_url: null;
						};
						preview: null;
						organic_tracking_token: null;
						video_versions: {
							width: number;
							height: number;
							url: string;
							type: number;
						}[];
						media_overlay_info: null;
						usertags: {
							in: {
								user: {
									pk: string;
									full_name: string;
									username: string;
									profile_pic_url: string;
									is_verified: boolean;
									id: string;
								};
								position: [number, number];
							}[];
						} | null;
						media_type: number;
						code: string | null;
						display_uri: string;
						user: null;
						number_of_qualities: number | null;
						product_type: string;
						taken_at: number;
						previous_submitter: null;
						link: null;
						story_cta: null;
						has_liked: boolean | null;
						like_count: number | null;
						inventory_source: null;
						logging_info_token: null;
				  }[]
				| null;
			location: Location | null;
			has_audio: boolean | null;
			floating_context_items: null;
			clips_metadata: {
				audio_type: string;
				achievements_info: { show_achievements: boolean };
				music_info: {
					music_consumption_info: {
						should_mute_audio: boolean;
						should_mute_audio_reason: string;
						is_trending_in_clips: boolean;
					};
					music_asset_info: {
						display_artist: string;
						title: string;
						audio_cluster_id: string;
						is_explicit: boolean;
					};
				} | null;
				original_sound_info: {
					original_audio_title: string;
					should_mute_audio: boolean;
					audio_asset_id: string;
					consumption_info: {
						should_mute_audio_reason: string;
						should_mute_audio_reason_type: null;
						is_trending_in_clips: boolean;
					};
					ig_artist: { username: string; id: string };
					is_explicit: boolean;
				} | null;
				is_shared_to_fb: boolean;
				originality_info: null;
			} | null;
			clips_attribution_info: null;
			ai_interactive_embodiment_attachment_style_info: null;
			has_liked: boolean | null;
			open_carousel_submission_state: null | string;
			carousel_parent_id: null;
			display_uri: string;
			preview: null;
			accessibility_caption: null | string;
			previous_submitter: null;
			link: null;
			story_cta: null;
			like_count: number | null;
			logging_info_token: null;
			carousel_media_count: number | null;
			comment_count: number;
			preview_comments: Comment[];
			view_count: null;
			top_likers: null;
			hidden_likes_string_variant: number;
			fb_like_count: null;
			crosspost_metadata: null;
			social_context: null;
			can_reshare: null;
			enable_media_notes_production: boolean;
			media_repost_count: null;
			saved_collection_ids: null;
			has_viewer_saved: null;
			sharing_friction_info: {
				should_have_sharing_friction: boolean;
				bloks_app_url: null;
			};
			caption: {
				text: string;
				pk: string;
				has_translation: null;
				created_at: number;
			} | null;
			boosted_status: null;
			boost_unavailable_identifier: null;
			boost_unavailable_reason: null;
			can_see_insights_as_brand: boolean;
			affiliate_info: null;
			ig_media_sharing_disabled: boolean;
			share_ids: null;
			feed_demotion_control: null;
			feed_recs_demotion_control: null;
			main_feed_carousel_starting_media_id: null;
			owner: { show_account_transparency_details: boolean; id: string };
			is_shared_from_basel: null;
			fb_comment_count: null;
			all_previous_submitters: null;
			follow_hashtag_info: null;
			media_attributions_data: [];
			wearable_attribution_info: null;
			caption_is_edited: boolean;
			commenting_disabled_for_viewer: null;
		};
	}
	namespace Brawl {
		type Player = {
			club: PlayerClub;
			isQualifiedFromChampionshipChallenge: boolean;
			"3vs3Victories": number;
			icon: PlayerIcon;
			tag: string;
			name: string;
			trophies: number;
			expLevel: number;
			expPoints: number;
			highestTrophies: number;
			soloVictories: number;
			duoVictories: number;
			bestRoboRumbleTime: number;
			bestTimeAsBigBrawler: number;
			brawlers: BrawlerStatList;
			nameColor: string;
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
	namespace Spotify {
		type TokenResponse = {
			access_token: string;
			token_type: "Bearer";
			scope: string;
			expires_in: number;
			refresh_token?: string;
		};
		type ImageObject = {
			url: string;
			height: number | null;
			width: number | null;
		};
		type SimplifiedArtistObject = {
			external_urls: { spotify?: string };
			href: string;
			id: string;
			name: string;
			type: "artist";
			uri: string;
		};
		type ArtistObject = SimplifiedArtistObject & {
			followers: { href: string | null; total: number };
			genres: string[];
			images: ImageObject[];
			popularity: number;
		};
		type SavedTrackObject = {
			added_at: string;
			track: {
				album: {
					album_type: "album" | "compilation" | "single";
					total_tracks: number;
					available_markets: string[];
					external_urls: { spotify?: string };
					href: string;
					id: string;
					images: ImageObject[];
					name: string;
					release_date: string;
					release_date_precision: "day" | "month" | "year";
					restrictions?: { reason?: "explicit" | "market" | "product" };
					type: "album";
					uri: string;
					artists: SimplifiedArtistObject[];
				};
				artists: ArtistObject[];
				available_markets: string[];
				disc_number: number;
				duration_ms: number;
				explicit: boolean;
				external_ids: { isrc?: string; ean?: string; upc?: string };
				external_urls: { spotify?: string };
				href: string;
				id: string;
				is_playable?: boolean;
				linked_from?: object;
				restrictions?: { reason?: "explicit" | "market" | "product" };
				name: string;
				popularity: number;
				preview_url: string | null;
				track_number: number;
				type: "track";
				uri: string;
				is_local: boolean;
			};
		};

		type SavedTracks = {
			href: string;
			limit: number;
			next: string | null;
			offset: number;
			previous: string | null;
			total: number;
			items: SavedTrackObject[];
		};
		type CurrentUserProfile = {
			country?: string;
			display_name: string | null;
			email?: string;
			explicit_content?: { filter_enabled: boolean; filter_locked: boolean };
			external_urls: { spotify?: string };
			followers: { href: string | null; total: number };
			href: string;
			id: string;
			images: ImageObject[];
			product: string;
			type: "user";
			uri: string;
		};
		type User = {
			id: string;
			discordId: string;
			accessToken: string;
			expirationDate: string;
			refreshToken?: string | null;
			etag?: string | null;
			lastAdded: string;
		};
	}
}
