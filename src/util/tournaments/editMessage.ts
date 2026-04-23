import { Routes } from "discord-api-types/v10";
import { rest } from "../globals";
import { createRegistrationMessage } from "./createRegistrationMessage";

export const editMessage = async (
	tournament: Pick<
		Database.Tournament,
		| "name"
		| "minPlayers"
		| "maxPlayers"
		| "registrationChannel"
		| "registrationTemplateLink"
		| "registrationMessage"
	> & { participantCount: number; id: number },
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
				tournament.id,
				tournament.registrationTemplateLink,
				tournament.participantCount,
				tournament.name,
				tournament.minPlayers,
				tournament.maxPlayers,
			),
		},
	);
