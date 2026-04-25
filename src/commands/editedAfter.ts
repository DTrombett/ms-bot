import {
	ApplicationCommandType,
	MessageFlags,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";
import { formatDuration } from "../util/time";

export class EditedAfter extends Command {
	static override contextMenuData = [
		{ name: "Edited After", type: ApplicationCommandType.Message },
	] satisfies RESTPostAPIContextMenuApplicationCommandsJSONBody[];
	static override message(
		{ reply }: MessageReplies,
		{ interaction }: MessageArgs,
	) {
		const message =
			interaction.data.resolved.messages[interaction.data.target_id];

		if (message?.edited_timestamp)
			reply({
				content: `Messaggio modificato dopo **${formatDuration({ milliseconds: Date.parse(message.edited_timestamp) - Date.parse(message.timestamp) }, { locales: interaction.locale })}**`,
			});
		else
			reply({
				content: "Questo messaggio non è stato modificato.",
				flags: MessageFlags.Ephemeral,
			});
	}
}
