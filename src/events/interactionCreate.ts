import { InteractionType } from "discord.js";
import { Command, createEvent, printToStdout } from "../util";

enum Types {
	"ping" = InteractionType.Ping,
	"slash command" = InteractionType.ApplicationCommand,
	"component" = InteractionType.MessageComponent,
	"autocomplete" = InteractionType.ApplicationCommandAutocomplete,
	"modal submit" = InteractionType.ModalSubmit,
}

export const interactionCreateEvent = createEvent({
	name: "interactionCreate",
	async on(interaction) {
		const before = Date.now();
		let action: string | undefined, command: Command | undefined;

		switch (interaction.type) {
			case InteractionType.ApplicationCommand:
				command = this.client.commands.find((c) =>
					c.data.some(
						(d) =>
							d.type === interaction.commandType &&
							d.name === interaction.commandName,
					),
				);
				await command?.run(interaction);
				break;
			case InteractionType.MessageComponent:
				[action] = interaction.customId.split("-");
				command = this.client.commands.get(action);
				await command?.component(interaction);
				break;
			case InteractionType.ApplicationCommandAutocomplete:
				command = this.client.commands.get(interaction.commandName);
				await command?.autocomplete(interaction);
				break;
			case InteractionType.ModalSubmit:
				[action] = interaction.customId.split("-");
				command = this.client.commands.get(action);
				await command?.modalSubmit(interaction);
				break;
			default:
				break;
		}
		const after = Date.now();

		printToStdout(
			`Interaction ${Types[interaction.type]} ${
				command?.data[0].name ?? "unknown command"
			} handled in ${after - before}ms (${
				after - interaction.createdTimestamp
			}ms total)`,
		);
	},
});
