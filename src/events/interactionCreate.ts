import { InteractionType } from "discord-api-types/v10";
import { createEvent } from "../util";

export const event = createEvent({
	name: "interactionCreate",
	async on(interaction) {
		let action: string | undefined;

		switch (interaction.type) {
			case InteractionType.ApplicationCommand:
				void this.client.commands
					.find((c) =>
						c.data.some(
							(d) =>
								d.type === interaction.commandType &&
								d.name === interaction.commandName
						)
					)
					?.run(interaction);
				break;
			case InteractionType.MessageComponent:
				[action] = interaction.customId.split("-");
				void this.client.commands.get(action)?.component(interaction);
				break;
			case InteractionType.ApplicationCommandAutocomplete:
				void this.client.commands
					.get(interaction.commandName)
					?.autocomplete(interaction);
				break;
			case InteractionType.ModalSubmit:
				[action] = interaction.customId.split("-");
				void this.client.commands.get(action)?.modalSubmit(interaction);
				break;
			default:
		}
	},
});
