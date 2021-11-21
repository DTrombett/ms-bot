import type {
	SlashCommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from "@discordjs/builders";
import type { Awaitable, ClientEvents, CommandInteraction } from "discord.js";
import type { Command, Event } from ".";

export const enum Constants {
	OwnerId1 = "597505862449496065",
	OwnerId2 = "584465680506814465",
	Commands = "commands",
	Events = "events",
	ClientOnline = "Client online",
	RegisterCommands = "Register slash commands",
}

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
	 * If this command is private and can only be executed by the owners of the bot
	 */
	reserved?: boolean;

	/**
	 * A function to run when this command is received by Discord.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	run(this: Command, interaction: CommandInteraction): Awaitable<void>;
};

/**
 * Emojis for the bot
 */
export const enum Emojis {
	/**
	 * The emoji for a check mark
	 */
	Check = "✅",

	/**
	 * The emoji for a cross mark
	 */
	Cross = "❌",

	/**
	 * The emoji for a warning sign
	 */
	Warning = "⚠️",

	/**
	 * The emoji for a question mark
	 */
	Question = "❓",

	/**
	 * The emoji for a exclamation mark
	 */
	Exclamation = "❗",

	/**
	 * The emoji for a double exclamation mark
	 */
	DoubleExclamation = "❕",

	/**
	 * The emoji for a heavy exclamation mark
	 */
	HeavyExclamation = "❗",

	/**
	 * The emoji for a heavy double exclamation mark
	 */
	HeavyDoubleExclamation = "❕",

	/**
	 * The emoji for a heavy check mark
	 */
	HeavyCheck = "✔️",

	/**
	 * The emoji for a heavy cross mark
	 */
	HeavyCross = "❌",

	/**
	 * The emoji for a heavy multiplication sign
	 */
	HeavyMultiplication = "✖️",

	/**
	 * The emoji for a heavy division sign
	 */
	HeavyDivision = "➗",

	/**
	 * The emoji for a heavy minus sign
	 */
	HeavyMinus = "➖",

	/**
	 * The emoji for a heavy plus sign
	 */
	HeavyPlus = "➕",

	/**
	 * The emoji for a trophy
	 */
	Trophy = "🏆",

	/**
	 * The emoji for a crown
	 */
	Crown = "👑",

	/**
	 * The emoji for a star
	 */
	Star = "⭐",

	/**
	 * The emoji for a sparkles
	 */
	Sparkles = "✨",

	/**
	 * The emoji for a snowflake
	 */
	Snowflake = "❄",

	/**
	 * The emoji for a heart
	 */
	Heart = "❤",

	/**
	 * The emoji for a heavy heart
	 */
	HeavyHeart = "💖",

	/**
	 * The emoji for money with wings
	 */
	MoneyWithWings = "💸",

	/**
	 * The emoji for people
	 */
	People = "👥",

	/**
	 * The emoji for a score
	 */
	Score = "💯",

	/**
	 * The emoji for a location
	 */
	Location = "📍",

	/**
	 * The emoji for a back arrow
	 */
	BackArrow = "⬅",

	/**
	 * The emoji for a forward arrow
	 */
	ForwardArrow = "➡",
}

/**
 * All the face emojis
 */
export const enum FaceEmojis {
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
 * Custom emojis for the bot
 */
export const enum CustomEmojis {}

/**
 * The data for an event
 */
export type EventOptions<T extends keyof ClientEvents = keyof ClientEvents> = {
	/**
	 * The name of the event
	 */
	name: T;

	/**
	 * The function to execute when the event is received
	 */
	on?: (this: Event<T>, ...args: ClientEvents[T]) => Awaitable<void>;

	/**
	 * The function to execute when the event is received once
	 */
	once?: EventOptions<T>["on"];
};

export default Constants;
