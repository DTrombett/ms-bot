import type { ReceivedInteraction } from ".";

export const sendError = (interaction: ReceivedInteraction, error: Error) =>
	interaction.deferred
		? interaction.editReply({
				content: `Si è verificato un errore: \`${error.message.slice(0, 1000)}\``,
		  })
		: interaction.reply({
				content: `Si è verificato un errore: \`${error.message.slice(0, 1000)}\``,
				ephemeral: true,
		  });

export default sendError;
