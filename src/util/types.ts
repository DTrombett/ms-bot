import {
	APIApplicationCommandAutocompleteResponse,
	APIApplicationCommandOption,
	APIInteraction,
	APIInteractionResponse,
	APIInteractionResponseChannelMessageWithSource,
	APIInteractionResponseDeferredChannelMessageWithSource,
	APIInteractionResponseDeferredMessageUpdate,
	APIInteractionResponseUpdateMessage,
	APIModalInteractionResponse,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionType,
	RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { Command } from ".";

export type Awaitable<T> = Promise<T> | T;

export type InteractionByType<
	T extends InteractionType,
	I extends APIInteraction = APIInteraction,
> = I extends APIInteraction & { type: T } ? I : never;
export type CommandInteractionByType<
	T extends ApplicationCommandType,
	I extends
		InteractionByType<InteractionType.ApplicationCommand> = InteractionByType<InteractionType.ApplicationCommand>,
> = I extends InteractionByType<InteractionType.ApplicationCommand> & {
	data: { type: T };
}
	? I
	: never;

export type CommandData<
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

export type ExecutorContext<
	T extends APIInteractionResponse = APIInteractionResponse,
> = {
	env: Env;
	context: ExecutionContext;
	reply: (result: T) => void;
};

/**
 * Options to create a command
 */
export type CommandOptions<
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
	autocomplete?(
		this: Command<T>,
		interaction: InteractionByType<InteractionType.ApplicationCommandAutocomplete>,
		context: ExecutorContext<APIApplicationCommandAutocompleteResponse>,
	): Awaitable<void>;

	/**
	 * A function to run when an interaction from a message component with the custom_id of this command is received.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	component?(
		this: Command<T>,
		interaction: InteractionByType<InteractionType.MessageComponent>,
		context: ExecutorContext<
			| APIInteractionResponseChannelMessageWithSource
			| APIInteractionResponseDeferredChannelMessageWithSource
			| APIInteractionResponseDeferredMessageUpdate
			| APIInteractionResponseUpdateMessage
			| APIModalInteractionResponse
		>,
	): Awaitable<void>;

	/**
	 * A function to run when a modal is submitted with the custom_id of this command is received.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	modalSubmit?(
		this: Command<T>,
		interaction: InteractionByType<InteractionType.ModalSubmit>,
		context: ExecutorContext<
			| APIInteractionResponseChannelMessageWithSource
			| APIInteractionResponseDeferredChannelMessageWithSource
			| APIInteractionResponseDeferredMessageUpdate
		>,
	): Awaitable<void>;

	/**
	 * A function to run when this command is received.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	run(
		this: Command<T>,
		interaction: CommandInteractionByType<T>,
		context: ExecutorContext<
			| APIInteractionResponseChannelMessageWithSource
			| APIInteractionResponseDeferredChannelMessageWithSource
			| APIModalInteractionResponse
		>,
	): Awaitable<void>;
};
export type ReceivedInteraction = InteractionByType<
	| InteractionType.ApplicationCommand
	| InteractionType.MessageComponent
	| InteractionType.ModalSubmit
>;

/**
 * A response from thecatapi.com
 */
export type CatResponse = {
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
export type DogResponse = {
	breeds: [];
	height: number;
	id: string;
	url: string;
	width: number;
}[];

/**
 * A response from api.urbandictionary.com
 */
export type UrbanResponse = {
	list: {
		definition: string;
		permalink: string;
		thumbs_up: number;
		sound_urls: string[];
		author: string;
		word: string;
		defid: number;
		current_vote: "";
		written_on: string;
		example: string;
		thumbs_down: number;
	}[];
};

export type Translations = Record<string, string | undefined> | undefined;

export type PlayerData = {
	age: string;
	birthDate: string;
	clubId: string;
	clubJerseyNumber: string;
	clubShirtName: string;
	countryCode: string;
	countryOfBirthCode: string;
	detailedFieldPosition: string;
	fieldPosition: string;
	gender: string;
	height: number;
	id: string;
	imageUrl: string;
	internationalName: string;
	nationalFieldPosition: string;
	nationalJerseyNumber: string;
	nationalShirtName: string;
	nationalTeamId: string;
	weight: number;
	translations?: {
		countryName: Translations;
		countryOfBirthName: Translations;
		fieldPosition: Translations;
		firstName: Translations;
		lastName: Translations;
		name: Translations;
		nationalFieldPosition: Translations;
		shortName: Translations;
	};
};

export type ScoreData = { away: number; home: number };

export type ImagesData = { PLAYER_CELEBRATING: string };

export type TeamData = {
	associationId: string;
	associationLogoUrl: string;
	bigLogoUrl: string;
	confederationType: string;
	countryCode: string;
	id: string;
	idProvider: string;
	internationalName: string;
	isPlaceHolder: boolean;
	logoUrl: string;
	mediumLogoUrl: string;
	organizationId: string;
	teamCode: string;
	teamTypeDetail: string;
	translations?: {
		countryName: Translations;
		displayName: Translations;
		displayOfficialName: Translations;
		displayTeamCode: Translations;
	};
	typeIsNational: boolean;
	typeTeam: string;
};

export type MatchData = {
	awayTeam: TeamData;
	behindClosedDoors: boolean;
	competition: {
		age: string;
		code: string;
		id: string;
		images: { FULL_LOGO: string };
		metaData: { name: string };
		region: string;
		sex: string;
		sportsType: string;
		teamCategory: string;
		translations?: {
			name: Translations;
			prequalifyingName: Translations;
			qualifyingName: Translations;
			tournamentName: Translations;
		};
		type: string;
	};
	group?: {
		competitionId: string;
		id: string;
		metaData: { groupName: string; groupShortName: string };
		order: number;
		phase: string;
		roundId: string;
		seasonYear: string;
		teams: string[];
		teamsQualifiedNumber: number;
		translations?: {
			name: Translations;
			shortName: Translations;
		};
		type: string;
	};
	fullTimeAt?: string;
	homeTeam: TeamData;
	id: string;
	kickOffTime: { date: string; dateTime: string; utcOffsetInHours: number };
	lineupStatus: string;
	matchNumber?: number;
	matchAttendance?: number;
	matchday: {
		competitionId: string;
		dateFrom: string;
		dateTo: string;
		format: string;
		id: string;
		longName: string;
		name: string;
		roundId: string;
		seasonYear: string;
		sequenceNumber: string;
		translations?: {
			longName: Translations;
			name: Translations;
		};
		type: string;
	};
	playerEvents?: {
		penaltyScorers?: {
			id: string;
			images: ImagesData;
			penaltyType: string;
			phase: string;
			player: PlayerData;
			teamId: string;
			teamIdProvider: string;
		}[];
		redCards?: {
			id: string;
			images: ImagesData;
			phase: string;
			player: PlayerData;
			teamId: string;
			teamIdProvider: string;
			time: { injuryMinute: number; minute: number; second: number };
		}[];
		scorers?: {
			goalType: string;
			id: string;
			images: ImagesData;
			phase: string;
			player: PlayerData;
			teamId: string;
			teamIdProvider: string;
			time: { minute: number; second: number };
		}[];
	};
	referees: {
		images: { SMALL_SQUARE: string };
		person: {
			countryCode: string;
			gender: string;
			id: string;
			translations?: {
				countryName: Translations;
				firstName: Translations;
				lastName: Translations;
				name: Translations;
				shortName: Translations;
			};
		};
		role: string;
		translations?: { roleName: Translations };
	}[];
	round: {
		active: boolean;
		benchGKCount: number;
		benchPlayersCount: number;
		benchStaffCount: number;
		coefficientWinnerBonus: number;
		competitionId: string;
		dateFrom: string;
		dateTo: string;
		fieldPlayersCount: number;
		groupCount: number;
		id: string;
		metaData: { name: string; type: string };
		mode: string;
		modeDetail: string;
		orderInCompetition: number;
		phase: string;
		seasonYear: string;
		secondaryType: string;
		stadiumNameType: string;
		status: string;
		substitutionCount: number;
		teamCount: number;
		teams: string[];
		translations?: {
			abbreviation: Translations;
			name: Translations;
			shortName: Translations;
		};
	};
	score?: { penalty?: ScoreData; regular: ScoreData; total: ScoreData };
	seasonYear: string;
	sessionNumber: number;
	stadium: {
		address: string;
		capacity: number;
		city: {
			countryCode: string;
			id: string;
			translations?: { name: Translations };
		};
		countryCode: string;
		geolocation: { latitude: number; longitude: number };
		id: string;
		images: { MEDIUM_WIDE: string; LARGE_ULTRA_WIDE: string };
		openingDate: string;
		pitch: { length: number; width: number };
		translations?: {
			mediaName: Translations;
			name: Translations;
			officialName: Translations;
			specialEventsName: Translations;
			sponsorName: Translations;
		};
	};
	status: string;
	type: string;
	winner?: {
		reason: string;
		team: TeamData;
		translations?: { reasonText: Translations; reasonTextAbbr: Translations };
	};
};

export type MatchesData =
	| MatchData[]
	| { error: { message: string; status: number; title: string } };

export type Leaderboard = [
	user: User & { predictions: Prediction[] },
	matchPoints: number,
	dayPoints: number,
	maxPoints: number,
][];

export type SQLDateTime = string;

export type Prediction = {
	matchId: string;
	userId: string;
	prediction: string;
};
export type User = {
	id: string;
	dayPoints?: number | null;
	matchPointsHistory?: string | null;
	team?: string | null;
};

export type EnvVars = {
	NODE_ENV?: string;
	DISCORD_APPLICATION_ID: string;
	DISCORD_PUBLIC_KEY: string;
	DISCORD_TOKEN: string;
	OWNER_ID: string;
	TEST_GUILD: string;
	CAT_API_KEY: string;
	DOG_API_KEY: string;
	PREDICTIONS_CHANNEL: string;
	PREDICTIONS_ROLE: string;
};
export type Env = EnvVars & {
	DB: D1Database;
	KV: KVNamespace;
};
