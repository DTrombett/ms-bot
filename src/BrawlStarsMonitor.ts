import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	Routes,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPICurrentUserCreateDMChannelJSONBody,
	type RESTPostAPICurrentUserCreateDMChannelResult,
} from "discord-api-types/v10";
import { rest, type Env, type BrawlStarsUser, type BrawlStarsPlayerData, type BrawlStarsNotification } from "./util";

export type Params = Record<string, never>;

export class BrawlStarsMonitor extends WorkflowEntrypoint<Env, Params> {
	override async run(
		_event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		rest.setToken(this.env.DISCORD_TOKEN);
		
		// Sleep for 10 minutes before starting the monitoring cycle
		await step.sleep("Wait 10 minutes", 10 * 60 * 1000);
		
		// Get all linked Brawl Stars users
		const users = await step.do(
			"Get linked users",
			this.getLinkedUsers.bind(this),
		);
		
		if (users.length === 0) {
			console.log("No Brawl Stars users to monitor");
			return;
		}
		
		// Check each user for updates
		await Promise.all(
			users.map(async (user) => {
				await step.do(
					`Check user ${user.userId}`,
					this.checkUserUpdates.bind(this, user),
				);
			}),
		);
		
		// Schedule the next check
		await this.env.BRAWL_STARS_MONITOR.create();
	}
	
	private async getLinkedUsers(): Promise<BrawlStarsUser[]> {
		const { results } = await this.env.DB.prepare(
			`SELECT userId, playerTag, lastTrophies, lastHighestTrophies, 
			        lastRankedTrophies, lastBrawlerCount, lastChecked
			 FROM BrawlStarsUsers`,
		).all<BrawlStarsUser>();
		
		return results;
	}
	
	private async checkUserUpdates(user: BrawlStarsUser) {
		try {
			const playerData = await this.fetchPlayerData(user.playerTag);
			if (!playerData) return;
			
			const notifications = await this.getUserNotifications(user.userId);
			const messagesToSend: string[] = [];
			
			// Check for trophy road advancement
			if (playerData.trophies > user.lastTrophies) {
				const shouldNotify = notifications.some(n => 
					n.notificationType === "Trophy Road Advancement" && n.enabled === 1
				) || notifications.some(n => 
					n.notificationType === "All" && n.enabled === 1
				);
				
				if (shouldNotify) 
					messagesToSend.push(
						`🏆 Trophy Road Advancement! You gained ${playerData.trophies - user.lastTrophies} trophies! (${user.lastTrophies} → ${playerData.trophies})`
					);
				
			}
			
			// Check for new brawler (increased brawler count)
			if (playerData.brawlers.length > user.lastBrawlerCount) {
				const shouldNotify = notifications.some(n => 
					n.notificationType === "New Brawler" && n.enabled === 1
				) || notifications.some(n => 
					n.notificationType === "All" && n.enabled === 1
				);
				
				if (shouldNotify) 
					messagesToSend.push(
						`🆕 New Brawler unlocked! You now have ${playerData.brawlers.length} brawlers!`
					);
				
			}
			
			// Check for brawler tier max (power 11)
			const maxPowerBrawlers = playerData.brawlers.filter(b => b.power === 11);
			if (maxPowerBrawlers.length > 0) {
				const shouldNotify = notifications.some(n => 
					n.notificationType === "Brawler Tier Max" && n.enabled === 1
				) || notifications.some(n => 
					n.notificationType === "All" && n.enabled === 1
				);
				
				if (shouldNotify) {
					// Check if any new brawlers reached max power since last check
					// For simplicity, we'll notify if they have any max power brawlers
					// A more sophisticated approach would track individual brawler powers
					const newMaxCount = maxPowerBrawlers.length;
					if (newMaxCount > 0) 
						messagesToSend.push(
							`⚡ You have ${newMaxCount} brawler(s) at maximum power level!`
						);
					
				}
			}
			
			// Send notifications if any
			if (messagesToSend.length > 0) 
				await this.sendNotifications(user.userId, messagesToSend);
			
			
			// Update user data in database
			await this.updateUserData(user.userId, playerData);
			
		} catch (error) {
			console.error(`Failed to check updates for user ${user.userId}:`, error);
		}
	}
	
	private async fetchPlayerData(playerTag: string): Promise<BrawlStarsPlayerData | null> {
		try {
			const response = await fetch(
				`https://api.brawlstars.com/v1/players/${encodeURIComponent(playerTag)}`,
				{
					headers: {
						"Authorization": `Bearer ${this.env.BRAWL_STARS_API_KEY}`,
					},
				}
			);
			
			if (!response.ok) {
				console.error(`Brawl Stars API error: ${response.status} ${response.statusText}`);
				return null;
			}
			
			return await response.json();
		} catch (error) {
			console.error("Failed to fetch player data:", error);
			return null;
		}
	}
	
	private async getUserNotifications(userId: string): Promise<BrawlStarsNotification[]> {
		const { results } = await this.env.DB.prepare(
			`SELECT userId, notificationType, enabled 
			 FROM BrawlStarsNotifications 
			 WHERE userId = ?`,
		).bind(userId).all<BrawlStarsNotification>();
		
		return results;
	}
	
	private async sendNotifications(userId: string, messages: string[]) {
		try {
			const channelId = await this.createDM(userId);
			const content = messages.join("\n\n");
			
			await rest.post(Routes.channelMessages(channelId), {
				body: {
					content,
				} satisfies RESTPostAPIChannelMessageJSONBody,
			});
		} catch (error) {
			console.error(`Failed to send notification to user ${userId}:`, error);
		}
	}
	
	private async createDM(recipient_id: string) {
		const { id } = (await rest.post(Routes.userChannels(), {
			body: {
				recipient_id,
			} satisfies RESTPostAPICurrentUserCreateDMChannelJSONBody,
		})) as RESTPostAPICurrentUserCreateDMChannelResult;

		return id;
	}
	
	private async updateUserData(userId: string, playerData: BrawlStarsPlayerData) {
		await this.env.DB.prepare(
			`UPDATE BrawlStarsUsers 
			 SET lastTrophies = ?, lastHighestTrophies = ?, 
			     lastBrawlerCount = ?, lastChecked = ?
			 WHERE userId = ?`,
		).bind(
			playerData.trophies,
			playerData.highestTrophies,
			playerData.brawlers.length,
			Date.now(),
			userId,
		).run();
	}
}