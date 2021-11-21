import type { EventOptions } from "../util";
import { commands } from "../util";

export const event: EventOptions<"interactionCreate"> = {
	name: "interactionCreate",
	on(interaction) {
		if (interaction.isCommand())
			void commands.get(interaction.commandName)?.run(interaction);
	},
};
