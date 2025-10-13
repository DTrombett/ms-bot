import {
	ApplicationCommandType,
	MessageFlags,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
	Command,
	formatTime,
	type MessageArgs,
	type MessageReplies,
} from "../util/index.ts";

export class EditedAfter extends Command {
	static override contextMenuData = [
		{
			name: "Edited After",
			type: ApplicationCommandType.Message,
		},
	] satisfies RESTPostAPIContextMenuApplicationCommandsJSONBody[];
	override message({ reply }: MessageReplies, { interaction }: MessageArgs) {
		const message =
			interaction.data.resolved.messages[interaction.data.target_id];

		if (message?.edited_timestamp)
			reply({
				content: `Messaggio modificato dopo **${formatTime(Date.parse(message.edited_timestamp) - Date.parse(message.timestamp))}**`,
			});
		else
			reply({
				content: "Questo messaggio non è stato modificato.",
				flags: MessageFlags.Ephemeral,
			});
	}
}
