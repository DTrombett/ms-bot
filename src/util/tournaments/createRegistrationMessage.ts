import {
	ButtonStyle,
	ComponentType,
	MessageFlags,
	Routes,
	type APIMessageTopLevelComponent,
	type RESTGetAPIChannelMessageResult,
	type RESTPatchAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { rest } from "../globals";
import { placeholder } from "../strings";
import { TimeUnit } from "../time";

export const createRegistrationMessage = async (
	registrationTemplateLink: NonNullable<
		Database.Tournament["registrationTemplateLink"]
	>,
	tournament: Pick<
		Database.Tournament,
		| "id"
		| "maxPlayers"
		| "minPlayers"
		| "name"
		| "participantCount"
		| "registrationStart"
		| "registrationEnd"
	>,
): Promise<
	RESTPostAPIChannelMessageJSONBody & RESTPatchAPIChannelMessageJSONBody
> => {
	const message = (await rest.get(
		Routes.channelMessage(
			...(registrationTemplateLink.split("/") as [
				channelId: string,
				messageId: string,
			]),
		),
	)) as RESTGetAPIChannelMessageResult;
	const components: APIMessageTopLevelComponent[] = [];
	const now = Date.now() / TimeUnit.Second;

	if (message.content)
		components.push({
			type: ComponentType.TextDisplay,
			content: placeholder(message.content, {
				iscritti: tournament.participantCount.toLocaleString("it-IT"),
				nome: tournament.name,
				minimo: (tournament.minPlayers ?? 0).toLocaleString("it-IT"),
				massimo: tournament.maxPlayers?.toLocaleString("it-IT") ?? "nessuno",
			}),
		});
	if (message.attachments.length)
		components.push({
			type: ComponentType.MediaGallery,
			items: message.attachments.map((a) => ({
				description: a.description,
				spoiler: a.filename.startsWith("SPOILER_"),
				media: { url: a.url },
			})),
		});
	components.push({
		type: ComponentType.ActionRow,
		components: [
			{
				type: ComponentType.Button,
				custom_id: `tournament-reg-${tournament.id}`,
				style: ButtonStyle.Success,
				emoji: { animated: true, id: "817094620700868678", name: "verified" },
				label: "Iscriviti",
				disabled:
					tournament.participantCount >= (tournament.maxPlayers ?? Infinity) ||
					(!!tournament.registrationEnd && now >= tournament.registrationEnd) ||
					(!!tournament.registrationStart &&
						now < tournament.registrationStart),
			},
			{
				type: ComponentType.Button,
				custom_id: `tournament-unr-${tournament.id}`,
				style: ButtonStyle.Danger,
				label: "Annulla iscrizione",
			},
		],
	});
	return { flags: MessageFlags.IsComponentsV2, components };
};
