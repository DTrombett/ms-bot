import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	type APIApplicationCommandOptionChoice,
	type APIComponentInContainer,
	type APIContainerComponent,
	type APIMessageTopLevelComponent,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";
import normalizeError from "../util/normalizeError";
import { resolveColor } from "../util/resolveColor";
import { template } from "../util/strings";

export class StaseraInTV extends Command {
	private static readonly serata: APIApplicationCommandOptionChoice<string>[] =
		[
			{ name: "1ª Serata", value: "index" },
			{ name: "2ª Serata", value: "seconda_serata_stasera" },
			{ name: "Notte", value: "programmi_tv_notte_stasera" },
		];
	private static readonly pages: APIApplicationCommandOptionChoice<number>[] = [
		{ name: "Pagina 1", value: 1 },
		{ name: "Pagina 2", value: 2 },
		{ name: "Pagina 3", value: 3 },
		{ name: "Pagina 4", value: 4 },
		{ name: "Sport", value: 5 },
		{ name: "Kids", value: 6 },
		{ name: "Docs", value: 7 },
		{ name: "Sky", value: 8 },
	];
	static override chatInputData = {
		name: "stasera-in-tv",
		description: "Che programmi ci sono stasera in TV?",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				description: "Il tipo di serata",
				name: "serata",
				type: ApplicationCommandOptionType.String,
				choices: StaseraInTV.serata,
			},
			{
				description: "La pagina da visualizzare (default 1)",
				name: "pagina",
				type: ApplicationCommandOptionType.Integer,
				min_value: 1,
				max_value: 8,
				choices: StaseraInTV.pages,
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override async chatInput(
		{ defer, edit }: ChatInputReplies,
		{
			options: { serata = "index", pagina = 1 },
		}: ChatInputArgs<typeof StaseraInTV.chatInputData>,
	) {
		defer();
		return edit(await this.createMessage(serata, pagina));
	}
	static override async component(
		{ deferUpdate, edit, reply }: ComponentReplies,
		{
			args: [serata = "index", pagina = "1"],
			interaction: {
				message: { interaction_metadata },
			},
			user: { id },
		}: ComponentArgs,
	) {
		if (interaction_metadata?.user.id !== id)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "Questa interazione non è per te!",
			});
		deferUpdate();
		return edit(await this.createMessage(serata, +pagina));
	}
	private static createMessage = async (
		serata: string,
		pagina: number,
	): Promise<RESTPatchAPIWebhookWithTokenMessageJSONBody> => {
		try {
			const base = `https://staseraintv.com/${serata}${pagina}.html`;
			const elements: Partial<{
				channel: string;
				channelLink: string;
				time: string;
				programName: string;
				programLink: string;
				description: string;
				preview: string;
				color: number;
				channelNumber: number;
			}>[] = [];
			const reader = new HTMLRewriter()
				.on(".singlechprevbox", {
					element: () => {
						elements.push({});
					},
				})
				.on(".singlechprevbox > .listingprevbox", {
					text: (element) => {
						elements.at(-1)!.channel ??= element.text.trim();
					},
					element: (element) => {
						const color = element
							.getAttribute("style")
							?.match(/background(?:-color)?\s*:\s*([^;]+)/)?.[1];

						if (color)
							try {
								const resolvedColor = resolveColor(color);

								elements.at(-1)!.color ??=
									(resolvedColor.rgb[0] << 16) +
									(resolvedColor.rgb[1] << 8) +
									resolvedColor.rgb[2];
							} catch (err) {
								// Do not throw if color format changed
							}
					},
				})
				.on(".singlechprevbox > .thumbprevbox > table table table th > a", {
					element: (element) => {
						elements.at(-1)!.channelLink ??= new URL(
							element.getAttribute("href")!,
							base,
						).href;
					},
				})
				.on(".singlechprevbox > .thumbprevbox > table table table th > big", {
					text: (element) => {
						elements.at(-1)!.time ??= element.text.trim();
					},
				})
				.on(".singlechprevbox > .thumbprevbox > table chnum", {
					text: (element) => {
						elements.at(-1)!.channelNumber ??= +element.text.trim();
					},
				})
				.on(
					".singlechprevbox > .thumbprevbox > table table table:not(:first-child) th > span",
					{
						text: (element) => {
							elements.at(-1)!.programName ??= element.text.trim();
						},
					},
				)
				.on(
					".singlechprevbox > .thumbprevbox > table table tr:not(:first-child) table th a",
					{
						element: (element) => {
							elements.at(-1)!.programLink ??= new URL(
								element.getAttribute("href")!,
								base,
							).href;
						},
					},
				)
				.on(
					".singlechprevbox > .thumbprevbox > table table tr:not(:first-child) table th img",
					{
						element: (element) => {
							elements.at(-1)!.preview ??= new URL(
								element.getAttribute("src")!,
								base,
							).href;
						},
					},
				)
				.on(
					".singlechprevbox > .thumbprevbox > table table tr:not(:first-child) table th:not(:first-child)",
					{
						text: (element) => {
							elements.at(-1)!.description ??= element.text.trim();
						},
					},
				)
				.transform(await fetch(base))
				.body?.getReader();
			while ((await reader?.read())?.done === false) {
				/* empty */
			}
			const components: APIMessageTopLevelComponent[] = elements
				.slice(0, 10)
				.map((e): APIContainerComponent => {
					const components: APIComponentInContainer[] = [
						{
							type: ComponentType.TextDisplay,
							content: template`
							${e.channel}## [${e.channel}](${e.channelLink ?? base})
							${e.programName}### [${e.programName}](${e.programLink ?? base})\t${e.time ?? ""}
							${e.description}${e.description}
							${e.channelNumber}-# Canale ${e.channelNumber}
						`,
						},
					];

					if (e.preview)
						components.push({
							type: ComponentType.MediaGallery,
							items: [{ media: { url: e.preview } }],
						});
					return {
						type: ComponentType.Container,
						accent_color: e.color,
						components,
					};
				});

			components.push(
				{
					type: ComponentType.ActionRow,
					components: this.serata.map((s) => ({
						type: ComponentType.Button,
						style: ButtonStyle.Secondary,
						custom_id: `staseraintv-${s.value}-${pagina}`,
						disabled: s.value === serata,
						label: s.name,
					})),
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							custom_id: `staseraintv-${serata}-${pagina - 1}`,
							disabled: pagina <= 1,
							emoji: { name: "⬅️" },
							style: ButtonStyle.Primary,
							type: ComponentType.Button,
						},
						{
							custom_id: "staseraintv",
							disabled: true,
							label: this.pages[pagina - 1]!.name,
							style: ButtonStyle.Secondary,
							type: ComponentType.Button,
						},
						{
							custom_id: `staseraintv-${serata}-${pagina + 1}`,
							disabled: pagina >= this.pages.length,
							emoji: { name: "➡️" },
							style: ButtonStyle.Primary,
							type: ComponentType.Button,
						},
					],
				},
				{
					type: ComponentType.TextDisplay,
					content: `-# Dati di [Stasera in TV](${base})`,
				},
			);
			return { flags: MessageFlags.IsComponentsV2, components };
		} catch (err) {
			return {
				content: `Si è verificato un errore imprevisto: \`${normalizeError(err).message}\``,
			};
		}
	};
}
