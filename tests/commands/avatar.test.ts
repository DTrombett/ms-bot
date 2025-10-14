import {
	ApplicationCommandOptionType,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { suite, test } from "node:test";
import { assertInteraction } from "../assertInteraction.ts";
import {
	chatInputData,
	chatInputInteraction,
	guild,
	member,
	user,
} from "../testData.ts";

await suite("Avatar command", { concurrency: true }, () => {
	void test("Default avatar", { concurrency: true }, () =>
		assertInteraction(
			chatInputInteraction("avatar", {
				user: user({ avatar: null, id: "597505862449496065" }),
			}),
			{
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.IsComponentsV2,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: "Avatar di <@597505862449496065>",
						},
						{
							type: ComponentType.MediaGallery,
							items: [
								{
									media: {
										url: "https://cdn.discordapp.com/embed/avatars/2.png",
									},
								},
							],
						},
					],
					allowed_mentions: { parse: [] },
				},
			},
		),
	);
	void test("Custom avatar", { concurrency: true }, () =>
		assertInteraction(
			chatInputInteraction("avatar", {
				user: user({ avatar: "ad2ebc8f7abc838f21d2c286986b5ef1" }),
			}),
			{
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.IsComponentsV2,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: `Avatar di <@${user().id}>`,
						},
						{
							type: ComponentType.MediaGallery,
							items: [
								{
									media: {
										url: `https://cdn.discordapp.com/avatars/${user().id}/ad2ebc8f7abc838f21d2c286986b5ef1.png?size=4096`,
									},
								},
							],
						},
					],
					allowed_mentions: { parse: [] },
				},
			},
		),
	);
	void test("Animated avatar", { concurrency: true }, () =>
		assertInteraction(
			chatInputInteraction("avatar", {
				user: user({ avatar: "a_ad2ebc8f7abc838f21d2c286986b5ef1" }),
			}),
			{
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.IsComponentsV2,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: `Avatar di <@${user().id}>`,
						},
						{
							type: ComponentType.MediaGallery,
							items: [
								{
									media: {
										url: `https://cdn.discordapp.com/avatars/${user().id}/a_ad2ebc8f7abc838f21d2c286986b5ef1.gif?size=4096`,
									},
								},
							],
						},
					],
					allowed_mentions: { parse: [] },
				},
			},
		),
	);
	void test("Custom avatar with option", { concurrency: true }, () =>
		assertInteraction(
			chatInputInteraction("avatar", {
				data: chatInputData("avatar", {
					options: [
						{
							name: "user",
							type: ApplicationCommandOptionType.User,
							value: "489031280147693568",
						},
					],
					resolved: {
						users: {
							"489031280147693568": user({
								id: "489031280147693568",
								avatar: "d696aeefe71a8eb0146ad556d1d4399d",
							}),
						},
					},
				}),
			}),
			{
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.IsComponentsV2,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: `Avatar di <@489031280147693568>`,
						},
						{
							type: ComponentType.MediaGallery,
							items: [
								{
									media: {
										url: `https://cdn.discordapp.com/avatars/489031280147693568/d696aeefe71a8eb0146ad556d1d4399d.png?size=4096`,
									},
								},
							],
						},
					],
					allowed_mentions: { parse: [] },
				},
			},
		),
	);
	void test("Member avatar with option", { concurrency: true }, () =>
		assertInteraction(
			chatInputInteraction("avatar", {
				guild_id: guild().id,
				data: chatInputData("avatar", {
					options: [
						{
							name: "user",
							type: ApplicationCommandOptionType.User,
							value: "597505862449496065",
						},
					],
					resolved: {
						users: {
							"597505862449496065": user({
								avatar: "ad2ebc8f7abc838f21d2c286986b5ef1",
							}),
						},
						members: {
							"597505862449496065": member({
								avatar: "a_d2ebc8f7abc838f21d2c286986b5ef1",
							}),
						},
					},
				}),
			}),
			{
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.IsComponentsV2,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: `Avatar di <@597505862449496065>`,
						},
						{
							type: ComponentType.MediaGallery,
							items: [
								{
									media: {
										url: `https://cdn.discordapp.com/guilds/${guild().id}/users/597505862449496065/avatars/a_d2ebc8f7abc838f21d2c286986b5ef1.gif?size=4096`,
									},
								},
								{
									media: {
										url: `https://cdn.discordapp.com/avatars/597505862449496065/ad2ebc8f7abc838f21d2c286986b5ef1.png?size=4096`,
									},
								},
							],
						},
					],
					allowed_mentions: { parse: [] },
				},
			},
		),
	);
});
