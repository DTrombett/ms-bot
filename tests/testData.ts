import {
	ApplicationCommandType,
	ChannelType,
	GuildDefaultMessageNotifications,
	GuildExplicitContentFilter,
	GuildMemberFlags,
	GuildMFALevel,
	GuildNSFWLevel,
	GuildPremiumTier,
	GuildSystemChannelFlags,
	GuildVerificationLevel,
	InteractionType,
	Locale,
	type APIBaseInteraction,
	type APIChannel,
	type APIChannelBase,
	type APIChatInputApplicationCommandInteraction,
	type APIChatInputApplicationCommandInteractionData,
	type APIGuild,
	type APIGuildMember,
	type APIInteraction,
	type APIInteractionDataResolvedGuildMember,
	type APITextChannel,
	type APIUser,
} from "discord-api-types/v10";

export const user = (user?: Partial<APIUser>): APIUser => ({
	id: "597505862449496065",
	avatar: null,
	username: "dtrombett",
	discriminator: "0",
	global_name: null,
	...user,
});

export const guild = (guild?: Partial<APIGuild>): APIGuild => ({
	afk_channel_id: null,
	afk_timeout: 60,
	application_id: null,
	banner: null,
	default_message_notifications: GuildDefaultMessageNotifications.AllMessages,
	description: null,
	discovery_splash: null,
	emojis: [],
	explicit_content_filter: GuildExplicitContentFilter.Disabled,
	features: [],
	hub_type: null,
	icon: null,
	id: "781085699487039520",
	incidents_data: null,
	mfa_level: GuildMFALevel.None,
	name: "MS Developers",
	nsfw_level: GuildNSFWLevel.Default,
	owner_id: user().id,
	preferred_locale: Locale.EnglishUS,
	premium_progress_bar_enabled: false,
	premium_tier: GuildPremiumTier.None,
	public_updates_channel_id: null,
	region: "eu-central",
	roles: [],
	rules_channel_id: null,
	safety_alerts_channel_id: null,
	splash: null,
	stickers: [],
	system_channel_flags: GuildSystemChannelFlags.SuppressJoinNotifications,
	system_channel_id: null,
	vanity_url_code: null,
	verification_level: GuildVerificationLevel.None,
	...guild,
});

export const member = (
	member?: Partial<APIGuildMember & APIInteractionDataResolvedGuildMember>,
): APIInteractionDataResolvedGuildMember & APIGuildMember => ({
	flags: GuildMemberFlags.CompletedOnboarding,
	joined_at: new Date(1420070400000).toISOString(),
	permissions: "0",
	roles: [],
	deaf: false,
	mute: false,
	user: user(),
	...member,
});

export const channel = <
	T extends ChannelType,
	I extends Omit<
		Extract<APIChannel, { type: T }>,
		Exclude<keyof APIChannelBase<T>, "type">
	> &
		Partial<APIChannelBase<T>>,
>(
	channel: I,
): APIChannelBase<T> & I => ({
	id: "786210484168032386",
	...channel,
});

export const textChannel = (
	textChannel?: Partial<APITextChannel>,
): APITextChannel =>
	channel({
		type: ChannelType.GuildText,
		name: "general",
		position: 0,
		...textChannel,
	});

export const chatInputData = (
	name: string,
	chatInputData?: Partial<APIChatInputApplicationCommandInteractionData>,
): APIChatInputApplicationCommandInteractionData => ({
	name,
	type: ApplicationCommandType.ChatInput,
	id: "1190304591120711812",
	...chatInputData,
});

export const interaction = <
	T extends InteractionType,
	D,
	I extends Omit<
		Extract<APIInteraction, { type: T; data?: D }>,
		Exclude<keyof APIBaseInteraction<T, D>, "type" | "data">
	> &
		Partial<APIBaseInteraction<T, D>>,
>(
	interaction: I,
): APIBaseInteraction<T, D> & I => ({
	app_permissions: "0",
	application_id: "781084946608816139",
	attachment_size_limit: 10_000_000,
	version: 1,
	authorizing_integration_owners: {},
	entitlements: [],
	id: "",
	locale: Locale.EnglishUS,
	token: "",
	channel: textChannel(),
	user: user(),
	...interaction,
});

export const chatInputInteraction = (
	name: string,
	chatInputInteraction?: Partial<APIChatInputApplicationCommandInteraction>,
): APIChatInputApplicationCommandInteraction =>
	interaction({
		type: InteractionType.ApplicationCommand,
		channel: textChannel(),
		data: chatInputData(name),
		channel_id: textChannel().id,
		...chatInputInteraction,
	});
