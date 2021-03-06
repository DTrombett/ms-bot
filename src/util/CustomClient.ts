import { ActivityType } from "discord-api-types/v10";
import { Client, Collection, Options, Partials } from "discord.js";
import { stderr, stdout } from "node:process";
import { inspect } from "node:util";
import color, { Colors } from "./colors";
import type Command from "./Command";
import type Event from "./Event";
import loadCommands from "./loadCommands";
import loadEvents from "./loadEvents";

/**
 * A custom class to interact with Discord
 */
export class CustomClient<T extends boolean = boolean> extends Client<T> {
	/**
	 * Commands of this client
	 */
	commands = new Collection<string, Command>();

	/**
	 * Events of this client
	 */
	events = new Collection<string, Event>();

	constructor() {
		super({
			intents: ["GuildMembers", "Guilds", "GuildPresences", "GuildVoiceStates"],
			allowedMentions: { parse: [], repliedUser: false, roles: [], users: [] },
			failIfNotExists: false,
			rest: {
				invalidRequestWarningInterval: 9_999,
			},
			makeCache: Options.cacheWithLimits({
				...Options.DefaultMakeCacheSettings,
				BaseGuildEmojiManager: 100,
				GuildBanManager: 10,
				GuildInviteManager: 0,
				GuildMemberManager: 1_000,
				GuildStickerManager: 0,
				MessageManager: 0,
				PresenceManager: 1_000,
				ReactionManager: 0,
				ReactionUserManager: 0,
				StageInstanceManager: 0,
				ThreadMemberManager: 0,
				UserManager: 1_000,
				VoiceStateManager: 1_000,
				ApplicationCommandManager: 0,
				GuildScheduledEventManager: 0,
			}),
			presence: {
				activities: [{ name: "MS Gaming", type: ActivityType.Watching }],
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
	 * Prints a message to stdout.
	 * @param message - The string to print
	 */
	static printToStdout(this: void, message: unknown) {
		stdout.write(`${CustomClient.inspect(message)}\n`);
	}

	/**
	 * Prints a message to stderr.
	 * @param message - The string to print
	 */
	static printToStderr(this: void, message: unknown) {
		stderr.write(color(`${CustomClient.inspect(message)}\n`, Colors.FgRed));
	}

	/**
	 * Loads commands and events, then logs in with Discord.
	 * @param token - The token to log in with (defaults to process.env.DISCORD_TOKEN)
	 * @returns A promise that resolves when the client is ready
	 */
	async login(token?: string) {
		await Promise.all([loadCommands(this), loadEvents(this)]);

		return super.login(token);
	}
}

export default CustomClient;
