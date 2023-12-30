import {
	APIApplicationCommandInteractionDataStringOption,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { createCommand } from "../util";

const messages: [id: string, quote: string][] = [
	[
		"1168625866641784894",
		"> Occhio non vede, cuore non guarda\nCit. Trombett 2023",
	],
	["1149274429076017202", "> Chi dorme bene piglia pesci\nCit. Trombett 2023"],
	[
		"1146480233239822427",
		"> Un pugno al cuore\nCit. Trombett 2024 (noi stiamo avanti)",
	],
	[
		"1110239244301123715",
		"> Fidarsi è bene, fidarsi di Trombett è meglio\nCit. Trombett 2023",
	],
	[
		"1099371438735102032",
		"> Chi ben comincia, ha già perso\nCit. Trombett 2023",
	],
	[
		"1095672141397110804",
		"> Non è bello ciò che è bello, ma ciò che è bellissimo (quindi io)\nCit. Trombett 2023",
	],
	[
		"1066726981841989714",
		"> Chi si accontenta gode. Chi non si accontenta gode di più.\nCit. Trombett 2023",
	],
	["1058803040133586995", "> E pure tu c'hai ragione\nCit. Trombett 2022"],
	[
		"1058160217306710066",
		"> Nella vita si vince e si perde. In questo caso io ho vinto e tu hai perso.\nCit. Trombett 2022",
	],
	["1035969524404592712", "> Mi hai colto alla provvista\nCit. Trombett 2022"],
	["1032002937729327104", "> Tentar non duce\nCit. Trombett 2022"],
	[
		"1024024648133906623",
		"> Ci sono due tipi di politici: quelli che fanno le promesse, ma non le mantengono e quelli che fanno le promesse, ma fanno credere ai cittadini che le manterranno\nCit. Trombett 2022",
	],
	[
		"1016271243122593832",
		"> Allora, innanzitutto ti calmi\nCit. Trombett 2021",
	],
	["1013943536233758771", "> Chi mi chiama mi segua\nCit. Trombett 2020"],
	[
		"1013572663848996966",
		"> In informatica c'è una risposta qualsiasi domanda... tranne a quanti KB corrisponde un MB\nCit. Trombett 2022",
	],
	[
		"1001809476699041882",
		"> Amico amico e poi ti ruba la biro\nCit. Trombett 2022",
	],
	[
		"1001809380305535086",
		"> Mica stiamo a pattinà con le bambole\nCit. Trombett *tanto tempo fa tipo nel 2018*",
	],
	["1001084007225753600", "> Chi riposa fatica due volte\nCit. Trombett 2022"],
	["999434679889428500", "> L'importante è il risultato\nCit. Trombett 2020"],
	[
		"998882179251703878",
		"> Tutto finisce ma non sparisce\nCit. Trombett *un bel po' di anni fa*",
	],
	[
		"998882065753833493",
		"> Le cose o si fanno bene o non si fanno\nCit. Trombett (boh)",
	],
	[
		"997801509100199956",
		'> Le ragazze tradiscono e diventano "ex"; gli amici tradiscono ma rimangono sempre amici\nCit. Trombett 2022',
	],
	["994970215446233118", "> Hai colto nel segno.\nCit. Trombett 2020"],
	[
		"992492841253224518",
		"> Da offerta spaziale a truffa colossale è un attimo\nCit. Trombett (feat. Eight) 2022",
	],
	[
		"992492027621154937",
		"> Non sono io più intelligente degli altri, ma sono gli altri a essere meno intelligenti di me\nCit. Trombett 2022",
	],
	["992491845571584081", "> Spamm = Bann\nCit. Trombett 2020"],
	["992491791351816193", "> L'importante è crederci\nCit. Trombett 2021"],
];

const formatQuote = ([id, content]: (typeof messages)[number]): {
	name: string;
	value: string;
} => {
	const [quote] = content.match(/(?<=> ).+/)!;

	return {
		name: quote.length > 100 ? `${quote.slice(0, 97).trimEnd()}...` : quote,
		value: id,
	};
};

export const quote = createCommand({
	data: [
		{
			name: "quote",
			description:
				"Invia una citazione di Trombett. Non fornire nessuna opzione per una casuale",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "quote",
					description: "La citazione da mostrare",
					type: ApplicationCommandOptionType.String,
					autocomplete: true,
				},
			],
		},
	],
	run(interaction, { reply }) {
		const option = interaction.data.options?.find(
			(o): o is APIApplicationCommandInteractionDataStringOption =>
				o.name === "quote" && o.type === ApplicationCommandOptionType.String,
		)?.value;
		const found = option!
			? messages.find((m) => m[0] === option)
			: messages[Math.floor(Math.random() * messages.length)];

		if (!found) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						"Citazione non trovata! Assicurati di usare l'autocomplete o fornisci l'id di una citazione.",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: { content: found[1] },
		});
	},
	autocomplete(interaction, { reply }) {
		const option = interaction.data.options
			.find(
				(o): o is APIApplicationCommandInteractionDataStringOption =>
					o.name === "quote" &&
					o.type === ApplicationCommandOptionType.String &&
					o.focused!,
			)
			?.value.toLowerCase();

		reply({
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
			data: {
				choices: (option
					? messages.filter(([, q]) =>
							q
								.match(/(?<=> ).+/)![0]
								.toLowerCase()
								.includes(option),
						)
					: messages
				)
					.slice(0, 25)
					.map(formatQuote),
			},
		});
	},
});
