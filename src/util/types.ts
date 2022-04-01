import type {
	SlashCommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from "@discordjs/builders";
import type { RestEvents } from "@discordjs/rest";
import type { Snowflake } from "discord-api-types/v10";
import type {
	AutocompleteInteraction,
	Awaitable,
	ChatInputCommandInteraction,
	ClientEvents,
	InteractionReplyOptions,
	InteractionUpdateOptions,
	MessageOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { Buffer } from "node:buffer";
import type { IncomingHttpHeaders } from "node:http";
import type { Command, CustomClient, Event } from ".";

/**
 * List of actions and their arguments
 */
export type Actions = {
	avatar: [user: Snowflake, guild?: Snowflake];
	bann: [
		user: Snowflake,
		guild: Snowflake,
		executor?: Snowflake,
		reason?: string,
		deleteMessageDays?: `${number}`
	];
	banner: [user: Snowflake];
	bannList: [
		guild: Snowflake,
		page?: `${number}`,
		executor?: Snowflake,
		update?: `${boolean}`
	];
	calc: [expr: string, fraction?: `${boolean}`];
	cat: [];
	createEmoji: [
		guild: Snowflake,
		attachment: Buffer | string,
		name: string,
		executor?: Snowflake,
		reason?: string,
		...roles: Snowflake[]
	];
	deleteEmoji: [
		emoji: Snowflake | string,
		guild: Snowflake,
		executor?: Snowflake,
		reason?: string
	];
	dice: [count?: `${number}`];
	dog: [];
	editEmoji: [
		emoji: Snowflake | string,
		guild: Snowflake,
		name?: string,
		executor?: Snowflake,
		reason?: string,
		...roles: Snowflake[]
	];
	emojiInfo: [emoji: Snowflake | string, guild?: Snowflake];
	emojiList: [
		guild: Snowflake,
		page?: `${number}`,
		executor?: Snowflake,
		update?: `${boolean}`
	];
	icon: [guild: Snowflake];
	kick: [
		user: Snowflake,
		guild: Snowflake,
		executor?: Snowflake,
		reason?: string
	];
	love: [
		user1: Snowflake,
		user2: Snowflake,
		discriminator1: string,
		discriminator2: string
	];
	ping: [];
	unbann: [
		user: Snowflake,
		guild: Snowflake,
		executor?: Snowflake,
		reason?: string
	];
};

/**
 * A function to be called when an action is executed
 */
export type ActionMethod<
	T extends keyof Actions,
	R extends
		| InteractionReplyOptions
		| InteractionUpdateOptions
		| WebhookEditMessageOptions = InteractionUpdateOptions &
		WebhookEditMessageOptions
> = (this: void, client: CustomClient<true>, ...args: Actions[T]) => Promise<R>;

/**
 * An action row to be sent to Discord
 */
export type ActionRowType = NonNullable<
	MessageOptions["components"]
> extends (infer T)[]
	? T
	: never;

/**
 * Options to create a command
 */
export type CommandOptions = {
	/**
	 * The data for this command
	 */
	data:
		| Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
		| SlashCommandBuilder
		| SlashCommandSubcommandsOnlyBuilder;

	/**
	 * If this command is public
	 */
	isPublic?: boolean;

	/**
	 * A functions to run when an autocomplete request is received by Discord.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	autocomplete?(
		this: Command,
		interaction: AutocompleteInteraction
	): Awaitable<void>;

	/**
	 * A function to run when this command is received by Discord.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	run(this: Command, interaction: ChatInputCommandInteraction): Awaitable<void>;
};

/**
 * Type of content received from a web request
 */
export enum ContentType {
	Json,
	PlainText,
	Buffer,
}

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
 * Custom emojis for the bot
 */

export enum CustomEmojis {}

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
 * The data for an event
 */
export type EventOptions<
	T extends EventType = EventType,
	K extends T extends EventType.Discord
		? keyof ClientEvents
		: T extends EventType.Rest
		? keyof RestEvents
		: never = T extends EventType.Discord
		? keyof ClientEvents
		: T extends EventType.Rest
		? keyof RestEvents
		: never
> = {
	/**
	 * The name of the event
	 */
	name: K;

	/**
	 * The type of the event
	 */
	type: T;

	/**
	 * The function to execute when the event is received
	 */
	on?: (
		this: Event<T, K>,
		...args: K extends keyof ClientEvents
			? ClientEvents[K]
			: K extends keyof RestEvents
			? RestEvents[K]
			: never
	) => Awaitable<void>;

	/**
	 * The function to execute when the event is received once
	 */
	once?: EventOptions<T, K>["on"];
};

/**
 * The type for an event
 */
export enum EventType {
	Discord = "discord",
	Rest = "rest",
}

/**
 * All the face emojis
 */
export enum FaceEmojis {
	":)" = "😊",
	":D" = "😀",
	":P" = "😛",
	":O" = "😮",
	":*" = "😗",
	";)" = "😉",
	":|" = "😐",
	":/" = "😕",
	":S" = "😖",
	":$" = "😳",
	":@" = "😡",
	":^)" = "😛",
	":\\" = "😕",
}

/**
 * A list of ISO 639-1 language codes
 */
export enum LanguageCode {
	"Abkhazian" = "ab",
	"Afar" = "aa",
	"Afrikaans" = "af",
	"Akan" = "ak",
	"Albanian" = "sq",
	"Amharic" = "am",
	"Arabic" = "ar",
	"Aragonese" = "an",
	"Armenian" = "hy",
	"Assamese" = "as",
	"Avestan" = "ae",
	"Aymara" = "ay",
	"Azerbaijani" = "az",
	"Bambara" = "bm",
	"Bashkir" = "ba",
	"Basque" = "eu",
	"Belarusian" = "be",
	"Bengali" = "bn",
	"Bosnian" = "bs",
	"Breton" = "br",
	"Bulgarian" = "bg",
	"Burmese" = "my",
	"Catalan" = "ca",
	"Chamorro" = "ch",
	"Chechen" = "ce",
	"Chichewa" = "ny",
	"Chinese" = "zh",
	"Chuvash" = "cv",
	"Cornish" = "kw",
	"Corsican" = "co",
	"Cree" = "cr",
	"Croatian" = "hr",
	"Czech" = "cs",
	"Danish" = "da",
	"Dutch" = "nl",
	"English" = "en",
	"Esperanto" = "eo",
	"Estonian" = "et",
	"Ewe" = "ee",
	"Faroese" = "fo",
	"Fijian" = "fj",
	"Finnish" = "fi",
	"French" = "fr",
	"Galician" = "gl",
	"Georgian" = "ka",
	"German" = "de",
	"Greek" = "el",
	"Guarani" = "gn",
	"Gujarati" = "gu",
	"Haitian" = "ht",
	"Hausa" = "ha",
	"Hebrew" = "he",
	"Herero" = "hz",
	"Hindi" = "hi",
	"Hungarian" = "hu",
	"Indonesian" = "id",
	"Irish" = "ga",
	"Igbo" = "ig",
	"Inupiaq" = "ik",
	"Ido" = "io",
	"Icelandic" = "is",
	"Italian" = "it",
	"Inuktitut" = "iu",
	"Japanese" = "ja",
	"Javanese" = "jv",
	"Kannada" = "kn",
	"Kashmiri" = "ks",
	"Kazakh" = "kk",
	"Central Khmer" = "km",
	"Kikuyu" = "ki",
	"Kirghiz" = "ky",
	"Komi" = "kv",
	"Kongo" = "kg",
	"Korean" = "ko",
	"Kurdish" = "ku",
	"Latin" = "la",
	"Luxembourgish" = "lb",
	"Ganda" = "lg",
	"Lao" = "lo",
	"Lithuanian" = "lt",
	"Latvian" = "lv",
	"Manx" = "gv",
	"Macedonian" = "mk",
	"Malagasy" = "mg",
	"Malay" = "ms",
	"Malayalam" = "ml",
	"Maltese" = "mt",
	"Maori" = "mi",
	"Marathi" = "mr",
	"Marshallese" = "mh",
	"Mongolian" = "mn",
	"Nauru" = "na",
	"Navajo" = "nv",
	"North Ndebele" = "nd",
	"Nepali" = "ne",
	"Norwegian Bokmål" = "nb",
	"Norwegian Nynorsk" = "nn",
	"Norwegian" = "no",
	"Sichuan Yi" = "ii",
	"South Ndebele" = "nr",
	"Occitan" = "oc",
	"Ojibwa" = "oj",
	"Church Slavic" = "cu",
	"Oriya" = "or",
	"Ossetian" = "os",
	"Punjabi" = "pa",
	"Pali" = "pi",
	"Persian" = "fa",
	"Polish" = "pl",
	"Pashto" = "ps",
	"Portuguese" = "pt",
	"Quechua" = "qu",
	"Romansh" = "rm",
	"Romanian" = "ro",
	"Russian" = "ru",
	"Sanskrit" = "sa",
	"Sardinian" = "sc",
	"Sindhi" = "sd",
	"Northern Sami" = "se",
	"Samoan" = "sm",
	"Serbian" = "sr",
	"Gaelic" = "gd",
	"Shona" = "sn",
	"Slovak" = "sk",
	"Slovenian" = "sl",
	"Somali" = "so",
	"Southern Sotho" = "st",
	"Spanish" = "es",
	"Sundanese" = "su",
	"Swahili" = "sw",
	"Swedish" = "sv",
	"Tamil" = "ta",
	"Telugu" = "te",
	"Tajik" = "tg",
	"Thai" = "th",
	"Uighur" = "ug",
	"Ukrainian" = "uk",
	"Urdu" = "ur",
	"Uzbek" = "uz",
	"Venda" = "ve",
	"Vietnamese" = "vi",
	"Volapük" = "vo",
	"Walloon" = "wa",
	"Welsh" = "cy",
	"Wolof" = "wo",
	"Western Frisian" = "fy",
	"Xhosa" = "xh",
	"Yiddish" = "yi",
	"Yoruba" = "yo",
	"Zhuang" = "za",
	"Zulu" = "zu",
}

/**
 * A list of locale codes
 */
export enum LocaleCodes {
	IT = "it",
	GB = "en-US",
	ES = "es-ES",
	DE = "de",
	FR = "fr",
	NL = "nl",
	NO = "no",
	FI = "fi",
	RU = "ru",
	TR = "tr",
	VI = "vi",
	TH = "th",
	TW = "zh-TW",
}

/**
 * The match level from comparing 2 strings
 */
export enum MatchLevel {
	/**
	 * The strings don't match at all
	 */
	None,

	/**
	 * The second string is a substring of the first one
	 */
	Partial,

	/**
	 * The second string is at the end of the first one
	 */
	End,

	/**
	 * The second string is at the beginning of the first one
	 */
	Start,

	/**
	 * The second string is the same as the first one
	 */
	Full,
}

/**
 * A response from a web request
 */
export type RequestResponse<R> = {
	data: R;
	complete: boolean;
	headers: IncomingHttpHeaders;
	statusCode: number;
	statusMessage: string;
};

/**
 * A valid url
 */
export type Url = URL | `http${"" | "s"}://${string}`;
