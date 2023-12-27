import {
	ActivityType,
	Client,
	Collection,
	Options,
	Partials,
} from "discord.js";
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
				BaseGuildEmojiManager: 25,
				GuildBanManager: 10,
				GuildInviteManager: 25,
				GuildMemberManager: 1_000,
				GuildStickerManager: 0,
				MessageManager: 100,
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
				activities: [{ name: "MS Community", type: ActivityType.Watching }],
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
