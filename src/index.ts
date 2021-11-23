(
	process as NodeJS.Process & {
		setSourceMapsEnabled: (enabled: boolean) => void;
	}
).setSourceMapsEnabled(true);

import {
	Client,
	Constants as DiscordConstants,
	Intents,
	Options,
} from "discord.js";
import { config } from "dotenv";
import Constants, { loadEvents, runEval } from "./util";

// Load environment variables from .env file
config();
// Execute any input from stdin as eval and print the result
process.stdin.on("data", async (chunk) => {
	const data = chunk.toString();

	if (data.trim() === "") return;
	console.log(await runEval(data));
});

console.time(Constants.ClientOnline);

const { FLAGS } = Intents;
const client = new Client({
	intents:
		FLAGS.GUILDS |
		FLAGS.GUILD_BANS |
		FLAGS.GUILD_EMOJIS_AND_STICKERS |
		FLAGS.GUILD_INTEGRATIONS |
		FLAGS.GUILD_WEBHOOKS |
		FLAGS.GUILD_INVITES |
		FLAGS.GUILD_VOICE_STATES |
		FLAGS.GUILD_MESSAGES |
		FLAGS.GUILD_MESSAGE_REACTIONS |
		FLAGS.GUILD_MESSAGE_TYPING |
		FLAGS.DIRECT_MESSAGES |
		FLAGS.DIRECT_MESSAGE_REACTIONS |
		FLAGS.DIRECT_MESSAGE_TYPING,
	allowedMentions: { parse: [], repliedUser: false, roles: [], users: [] },
	failIfNotExists: true,
	http: { api: "https://canary.discord.com/api" },
	invalidRequestWarningInterval: 9_999,
	makeCache: Options.cacheWithLimits({
		...Options.defaultMakeCacheSettings,
		BaseGuildEmojiManager: 50,
		GuildBanManager: 100,
		GuildEmojiManager: 50,
		GuildInviteManager: 100,
		GuildMemberManager: 0,
		GuildStickerManager: 50,
		MessageManager: 0,
		PresenceManager: 0,
		ReactionManager: 20,
		ReactionUserManager: 100,
		StageInstanceManager: 100,
		ThreadMemberManager: 100,
		UserManager: 100,
		VoiceStateManager: 100,
	}),
	presence: {
		activities: [
			{ name: "MS Gaming", type: DiscordConstants.ActivityTypes.PLAYING },
		],
	},
	restGlobalRateLimit: 50,
	restTimeOffset: 1000,
	shards: "auto",
});

void loadEvents(client);
void client.login();
