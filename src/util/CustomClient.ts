import { Client, Options, Partials } from "discord.js";
import { createWriteStream } from "node:fs";
import { stderr, stdout } from "node:process";
import { inspect } from "node:util";
import color, { Color } from "./colors";
import type Command from "./Command";
import type Event from "./Event";
import loadCommands from "./loadCommands";
import loadEvents from "./loadEvents";
import occurrences from "./occurrences";
import { EventType } from "./types";

/**
 * A custom class to interact with Discord
 */
export class CustomClient<T extends boolean = boolean> extends Client<T> {
	/**
	 * Number of logged lines
	 */
	static lines = 0;

	/**
	 * If the client is blocked and should not perform any action
	 */
	blocked = false;

	/**
	 * Commands of this client
	 */
	commands = new Map<string, Command>();

	/**
	 * Events of this client
	 */
	events = new Map<string, Event>();

	constructor() {
		super({
			intents: [
				"Guilds",
				"GuildMessages",
				"GuildBans",
				"GuildEmojisAndStickers",
				"GuildPresences",
				"GuildMembers",
			],
			allowedMentions: { parse: [], repliedUser: false, roles: [], users: [] },
			failIfNotExists: false,
			rest: {
				api: "https://canary.discord.com/api",
				version: "10",
				invalidRequestWarningInterval: 9_998,
			},
			makeCache: Options.cacheWithLimits({
				...Options.defaultMakeCacheSettings,
				BaseGuildEmojiManager: 0,
				GuildBanManager: 100,
				GuildInviteManager: 0,
				GuildMemberManager: 1_000,
				GuildStickerManager: 0,
				MessageManager: 0,
				PresenceManager: 10_000,
				ReactionManager: 0,
				ReactionUserManager: 0,
				StageInstanceManager: 0,
				ThreadMemberManager: 0,
				UserManager: 1_000_000,
				VoiceStateManager: 0,
			}),
			presence: {
				activities: [{ name: "Clash Royale", type: 3 /** Watching */ }],
			},
			shards: "auto",
			partials: [
				Partials.Channel,
				Partials.GuildMember,
				Partials.Message,
				Partials.Reaction,
				Partials.User,
				Partials.GuildScheduledEvent,
				Partials.ThreadMember,
			],
			waitGuildTimeout: 1_000,
			ws: { large_threshold: 100 },
		});
	}

	/**
	 * Inspects a value.
	 * @param value - The value to check
	 */
	static inspect(this: void, value: unknown) {
		switch (typeof value) {
			case "string":
				return value;
			case "bigint":
			case "number":
			case "boolean":
			case "function":
			case "symbol":
				return value.toString();
			case "object":
				return inspect(value);
			default:
				return "undefined";
		}
	}

	/**
	 * Logs a message in the log file.
	 * @param message - The message to log
	 * @returns A promise that resolves when the message is logged
	 */
	static async logToFile(message: string) {
		return new Promise<void>((resolve) => {
			try {
				createWriteStream(`./debug.log`, { flags: "a" })
					.once("error", CustomClient.printToStderr)
					.once("finish", resolve)
					.setDefaultEncoding("utf8")
					.end(message);
			} catch (error) {
				void CustomClient.printToStderr(error);
			}
		});
	}

	/**
	 * Prints a message to stdout.
	 * @param message - The string to print
	 * @param log - If the message should be logged in the log file too
	 */
	static async printToStdout(this: void, message: unknown, log = false) {
		const formatted = CustomClient.format(message);

		stdout.write(formatted);
		CustomClient.lines += occurrences(formatted, "\n");
		if (log) await CustomClient.logToFile(formatted);
	}

	/**
	 * Prints a message to stderr.
	 * @param message - The string to print
	 * @param log - If the message should be logged in the log file too
	 */
	static async printToStderr(this: void, message: unknown, log = false) {
		const formatted = CustomClient.format(message);

		stderr.write(color(formatted, Color.Red));
		CustomClient.lines += occurrences(formatted, "\n");
		if (log) await CustomClient.logToFile(formatted);
	}

	/**
	 * Formats a string with the current time.
	 * @param message - The message to format
	 * @returns The formatted message
	 */
	private static format(this: void, message: unknown): string {
		return `${CustomClient.inspect(message)} (${new Date().toLocaleString(
			undefined,
			{
				timeZone: "Europe/Rome",
			}
		)})\n`;
	}

	/**
	 * Loads commands and events, then logs in with Discord.
	 * @returns A promise that resolves when the client is ready
	 */
	async login() {
		await Promise.all([
			loadCommands(this),
			...Object.values(EventType).map((type) => loadEvents(this, type)),
		]);

		return super.login();
	}
}

export default CustomClient;
