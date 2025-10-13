import {
	GuildMemberFlags,
	type APIGuildMember,
	type APIInteractionDataResolvedGuildMember,
	type APIUser,
} from "discord-api-types/v10";

export const exampleUser: APIUser = {
	id: "597505862449496065",
	avatar: null,
	username: "dtrombett",
	discriminator: "0",
	global_name: null,
};

export const exampleMember: APIInteractionDataResolvedGuildMember &
	APIGuildMember = {
	flags: GuildMemberFlags.CompletedOnboarding,
	joined_at: new Date(1420070400000).toISOString(),
	permissions: "0",
	roles: [],
	deaf: false,
	mute: false,
	user: exampleUser,
};
