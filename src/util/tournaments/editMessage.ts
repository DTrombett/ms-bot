import { Routes } from "discord-api-types/v10";
import { rest } from "../globals";
import { createRegistrationMessage } from "./createRegistrationMessage";

export const editMessage = async (
	tournament: Pick<
		Database.Tournament,
		| "id"
		| "maxPlayers"
		| "minPlayers"
		| "name"
		| "participantCount"
		| "registrationChannel"
		| "registrationMessage"
		| "registrationStart"
		| "registrationEnd"
		| "registrationTemplateLink"
	>,
) =>
	tournament.registrationChannel &&
	tournament.registrationMessage &&
	tournament.registrationTemplateLink &&
	rest.patch(
		Routes.channelMessage(
			tournament.registrationChannel,
			tournament.registrationMessage,
		),
		{
			body: await createRegistrationMessage(
				tournament.registrationTemplateLink,
				tournament,
			),
		},
	);
