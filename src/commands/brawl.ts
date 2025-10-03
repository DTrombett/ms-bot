import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
	Routes,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
} from "discord-api-types/v10";
import {
	normalizeError,
	resolveCommandOptions,
	rest,
	type CommandOptions,
	type BrawlStarsPlayerData,
	type Env,
} from "../util";

const NOTIFICATION_TYPES = [
	"Brawler Tier Max",
	"Ranked Tier Up", 
	"New Brawler",
	"Trophy Road Advancement",
	"All"
] as const;

async function fetchPlayerData(playerTag: string, apiKey: string): Promise<BrawlStarsPlayerData | null> {
	try {
		const response = await fetch(
			`https://api.brawlstars.com/v1/players/${encodeURIComponent(playerTag)}`,
			{
				headers: {
					"Authorization": `Bearer ${apiKey}`,
				},
			}
		);
		
		if (!response.ok) 
			return null;
		
		
		return await response.json();
	} catch (error) {
		console.error("Failed to fetch player data:", error);
		return null;
	}
}

async function handleLinkCommand(userId: string, playerTag: string, env: Env) {
	// Normalize the player tag (remove # if present, add it back)
	const normalizedTag = playerTag.startsWith("#") ? playerTag : `#${playerTag}`;
	
	// Verify the player exists by fetching their data
	const playerData = await fetchPlayerData(normalizedTag, env.BRAWL_STARS_API_KEY);
	if (!playerData) 
		throw new Error("Player not found. Please check your player tag and try again.");
	
	
	// Check if user already has a linked account
	const existingUser = await env.DB.prepare(
		`SELECT playerTag FROM BrawlStarsUsers WHERE userId = ?`,
	).bind(userId).first();
	
	if (existingUser) 
		// Update existing record
		await env.DB.prepare(
			`UPDATE BrawlStarsUsers 
			 SET playerTag = ?, lastTrophies = ?, lastHighestTrophies = ?, 
			     lastBrawlerCount = ?, lastChecked = ?
			 WHERE userId = ?`,
		).bind(
			normalizedTag,
			playerData.trophies,
			playerData.highestTrophies,
			playerData.brawlers.length,
			Date.now(),
			userId,
		).run();
	 else {
		// Insert new record
		await env.DB.prepare(
			`INSERT INTO BrawlStarsUsers (userId, playerTag, lastTrophies, lastHighestTrophies, lastBrawlerCount, lastChecked)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		).bind(
			userId,
			normalizedTag,
			playerData.trophies,
			playerData.highestTrophies,
			playerData.brawlers.length,
			Date.now(),
		).run();
		
		// Enable all notifications by default for new users
		const defaultNotifications = NOTIFICATION_TYPES.map(type => [userId, type, 1]);
		const placeholders = defaultNotifications.map(() => "(?, ?, ?)").join(", ");
		await env.DB.prepare(
			`INSERT INTO BrawlStarsNotifications (userId, notificationType, enabled) VALUES ${placeholders}`,
		).bind(...defaultNotifications.flat()).run();
	}
}

async function handleNotificationToggle(userId: string, notificationType: string, enabled: boolean, env: Env) {
	// Ensure user is linked
	const user = await env.DB.prepare(
		`SELECT userId FROM BrawlStarsUsers WHERE userId = ?`,
	).bind(userId).first();
	
	if (!user) 
		throw new Error("You must link your Brawl Stars account first using `/brawl link`.");
	
	
	// Insert or update notification setting
	await env.DB.prepare(
		`INSERT INTO BrawlStarsNotifications (userId, notificationType, enabled)
		 VALUES (?, ?, ?)
		 ON CONFLICT (userId, notificationType) 
		 DO UPDATE SET enabled = ?`,
	).bind(userId, notificationType, enabled ? 1 : 0, enabled ? 1 : 0).run();
}

async function handleViewNotifications(userId: string, env: Env): Promise<string> {
	// Check if user is linked
	const user = await env.DB.prepare(
		`SELECT playerTag FROM BrawlStarsUsers WHERE userId = ?`,
	).bind(userId).first();
	
	if (!user) 
		return "❌ You haven't linked your Brawl Stars account yet. Use `/brawl link` to get started!";
	
	
	// Get notification settings
	const { results: notifications } = await env.DB.prepare(
		`SELECT notificationType, enabled FROM BrawlStarsNotifications WHERE userId = ?`,
	).bind(userId).all();
	
	if (notifications.length === 0) 
		return `🔗 **Linked Account:** \`${(user as { playerTag: string }).playerTag}\`\n\n📱 **Notifications:** All types are currently disabled.`;
	

	const enabledNotifications = notifications
		.filter((n: any) => (n as { enabled: number }).enabled === 1)
		.map((n: any) => `✅ ${(n as { notificationType: string }).notificationType}`)
		.join("\n");
	
	const disabledNotifications = notifications
		.filter((n: any) => (n as { enabled: number }).enabled === 0)
		.map((n: any) => `❌ ${(n as { notificationType: string }).notificationType}`)
		.join("\n");
	
	let content = `🔗 **Linked Account:** \`${(user as { playerTag: string }).playerTag}\`\n\n📱 **Notification Settings:**\n`;
	
	if (enabledNotifications) 
		content += `\n**Enabled:**\n${enabledNotifications}`;
	
	
	if (disabledNotifications) 
		content += `\n\n**Disabled:**\n${disabledNotifications}`;
	
	
	return content;
}

export const brawl = {
	data: [
		{
			name: "brawl",
			description: "Brawl Stars integration commands",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "link",
					description: "Link your Brawl Stars account",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "tag",
							description: "Your Brawl Stars player tag (e.g., #2PP)",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
				{
					name: "notify",
					description: "Manage notification settings",
					type: ApplicationCommandOptionType.SubcommandGroup,
					options: [
						{
							name: "enable",
							description: "Enable a notification type",
							type: ApplicationCommandOptionType.Subcommand,
							options: [
								{
									name: "type",
									description: "Type of notification to enable",
									type: ApplicationCommandOptionType.String,
									required: true,
									choices: NOTIFICATION_TYPES.map(type => ({
										name: type,
										value: type,
									})),
								},
							],
						},
						{
							name: "disable",
							description: "Disable a notification type",
							type: ApplicationCommandOptionType.Subcommand,
							options: [
								{
									name: "type",
									description: "Type of notification to disable",
									type: ApplicationCommandOptionType.String,
									required: true,
									choices: NOTIFICATION_TYPES.map(type => ({
										name: type,
										value: type,
									})),
								},
							],
						},
						{
							name: "view",
							description: "View your notification settings",
							type: ApplicationCommandOptionType.Subcommand,
						},
					],
				},
			],
		},
	],
	run: async (reply, { interaction, env }) => {
		const { options, subcommand } = resolveCommandOptions(
			brawl.data,
			interaction,
		);
		const userId = (interaction.member ?? interaction).user!.id;

		reply({
			type: InteractionResponseType.DeferredChannelMessageWithSource,
			data: { flags: MessageFlags.Ephemeral },
		});

		try {
			if (subcommand === "link") {
				await handleLinkCommand(userId, options.tag, env);
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content: "✅ Successfully linked your Brawl Stars account!",
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
			} else if (subcommand === "notify enable") {
				await handleNotificationToggle(userId, options.type as string, true, env);
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content: `✅ Enabled notifications for: **${options.type}**`,
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
			} else if (subcommand === "notify disable") {
				await handleNotificationToggle(userId, options.type as string, false, env);
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content: `❌ Disabled notifications for: **${options.type}**`,
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
			} else {
				// This handles "notify view"
				const content = await handleViewNotifications(userId, env);
				await rest.patch(
					Routes.webhookMessage(interaction.application_id, interaction.token),
					{
						body: {
							content,
						} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					},
				);
			}
		} catch (error) {
			const errorMessage = normalizeError(error);
			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: `❌ Error: ${errorMessage instanceof Error ? errorMessage.message : String(errorMessage)}`,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		}
	},
} as const satisfies CommandOptions<ApplicationCommandType.ChatInput>;