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

export const createRegistrationMessage = async (
	tournamentId: number,
	registrationTemplateLink: string,
	registrationCount: number,
	tournamentName: string,
	minPlayers: number | undefined | null,
	maxPlayers: number | undefined | null,
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

	if (message.content)
		components.push({
			type: ComponentType.TextDisplay,
			content: placeholder(message.content, {
				iscritti: registrationCount.toLocaleString("it-IT"),
				nome: tournamentName,
				minimo: (minPlayers ?? 0).toLocaleString("it-IT"),
				massimo: (maxPlayers ?? 0).toLocaleString("it-IT"),
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
				custom_id: `tournament-reg-${tournamentId}`,
				style: ButtonStyle.Success,
				emoji: { animated: true, id: "817094620700868678", name: "verified" },
				label: "Iscriviti",
			},
			{
				type: ComponentType.Button,
				custom_id: `tournament-unr-${tournamentId}`,
				style: ButtonStyle.Danger,
				label: "Annulla iscrizione",
			},
		],
	});
	return { flags: MessageFlags.IsComponentsV2, components };
};
