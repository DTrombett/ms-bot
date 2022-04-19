import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import randomNumber from "../randomNumber";
import type { ActionMethod } from "../types";
import { RPSEmojis } from "../types";

const rpsChoices = ["rock", "paper", "scissors"] as const;
const winners: Record<typeof rpsChoices[number], typeof rpsChoices[number]> = {
	rock: "paper",
	paper: "scissors",
	scissors: "rock",
};

/**
 * Play a game of Rock, Paper, Scissors.
 * @param _ - The client
 * @param choice - The choice
 */
export const rps: ActionMethod<
	"rps",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (_, choice) => {
	const botChoice = rpsChoices[randomNumber(0, 2)];

	return {
		content: `Hai scelto ${RPSEmojis[choice]}\nLa mia scelta è ${
			RPSEmojis[botChoice]
		}\n\n**${
			botChoice === choice
				? "Pareggio"
				: winners[botChoice] === choice
				? "Hai vinto"
				: "Hai perso"
		}**!`,
	};
};
