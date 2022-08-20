import type { APIMessageActionRowComponent } from "discord-api-types/v10";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
} from "discord-api-types/v10";
import type { ReceivedInteraction } from "../util";
import { createCommand } from "../util";

const queloAnswers = [
	["La seconda che hai detto!"],
	["Te c'hai grossa grisi!"],
	[
		"C'è grossa grisi, c'è molta violenza, c'è molto egoismo! Qua la gente non sa più quando stiamo andando su questa terra!\nQua la gente non sa più quando stiamo facendo su questa terra!",
		"https://youtu.be/lpYSFPO7pqw?t=13",
	],
	[
		"- Cosa c'è in questa religione?\n- Per adesso c'è Quelo!",
		"https://youtu.be/lpYSFPO7pqw?t=55",
	],
	[
		"- Cosa fa questo dio? Aiuta a risolvere i problemi, oppure dà una speranza al genere umano o ci rende più partecipi della vita degli altri...\n- La seconda che hai detto! Com'è? L'hai detto te.\n- Dà una speranza al genere umano...\n- Ecco, sai che fa Quelo? Dà una speranza al genere umano!",
		"https://youtu.be/lpYSFPO7pqw?t=71",
	],
	[
		'- Lei parla col suo dio?\n- Certo che parlo... prontooo?\n- Ma scusi "Pronto?" è un po\' poco per una preghiera...\n- Eh ho capito ma mica posso fà tutto io qua eh!',
		"https://youtu.be/lpYSFPO7pqw?t=123",
	],
	[
		"Tu lo sai oggi a che ora mi sono svegliato? Alle sette meno un quarto!",
		"https://youtu.be/lpYSFPO7pqw?t=140",
	],
	[
		"- Lei si presenta al pubblico, in internet, con una nuova religione, si deve organizzare un pochino di più...\n- MA GUARDA CHE TE C'HAI GROSSA GRISI EH!",
		"https://youtu.be/lpYSFPO7pqw?t=173",
	],
	[
		"- Maestro, perché l'uomo è comparso sulla terra?\n- Eh perché se l'uomo compariva sull'acqua, affogava!",
		"https://youtu.be/MwfY552THjo?t=166",
	],
	[
		"- Maestro, ma nella sua religione sono consentiti rapporti tra una persona anziana e una giovane?\n- Nella mia religione no, però di fronte c'è una pensione molto economica che potrebbe andare bene.\n- Ma che vergogna, ma non le sembra indecente?\n- Mah, per carità, è un tre stelle, però viva a dio è pulito.",
		"https://youtu.be/MwfY552THjo?t=295",
	],
	[
		"- Come è possibile che gli ebrei hanno passato il mar rosso e sono sopravvissuti?\n- Perché erano passate almeno 3 ore dall'ultimo pasto.\n- E noi... passeremo mai il mar rosso?\n- Solo se non ci sono vigili, che l'ultima volta ho dovuto pagare io la multa.",
		"https://youtu.be/zCbmW_wV_Do?t=324",
	],
	[
		"- Che cos'è il male? Il bene e il male sono parte della stessa medaglia? Non esiste il male senza bene?\n- Io non so che hai fatto, ma è meglio se ti trovi un avvocato.",
		"https://youtu.be/zCbmW_wV_Do?t=462",
	],
	[
		"- La Chiesa ha accettato la teoria di Darwin secondo cui l'uomo discende dalla scimmia. Anche secondo lei l'uomo discende dalla scimmia?\n- No, l'uomo non può discendere dalla scimmia, forse il bambino. Se la scimmia è molto grossa il bambino può scendere dalla scimmia, ma la scimmia non è un cavallo che uno ci può salire e scendere da sopra\n- Ma la chiesa ha detto...\n- Ma la chiesa può dire quello che vuole! Ma non è che può costringere una scimmia che uno poi ci sale sopra, scende... la scimmia non è mica un cavallo!",
		"https://youtu.be/zCbmW_wV_Do?t=264",
	],
	[
		"- Maestro, qual è il segreto della vita?\n- Eh bravo, e se te lo dico, che segreto è.",
		"https://youtu.be/MwfY552THjo?t=487",
	],
	[
		"- Nel paradiso c'è posto per gli omosessuali?\n- Non lo so, non conosco i locali notturni.",
		"https://youtu.be/zCbmW_wV_Do?t=411",
	],
	[
		"- Maestro c'è vita nell'universo?\n- Mah, giusto un po' il sabato sera?",
		"https://youtu.be/MwfY552THjo?t=320",
	],
	[
		"Ti chiedi di come mai, di come dove nel mondo. Dove chi, perché quando? Dov'è la risposta? Ti chiedi quasi quasi e miagoli nel buio. Te ne vai a tentoni nel buio. Ma la risposta non la devi cercare fuori. La risposta è dentro di te. E però, è sbagliata!",
		"https://youtu.be/MwfY552THjo?t=73",
	],
	[
		"- Io sono il messia e porto la parola...\n- La parola di chi?\n- La parola di Quelo!",
		"https://youtu.be/MwfY552THjo?t=101",
	],
	[
		"- Non abbiamo mai capito bene cos'è. Un amuleto, un dio...\n- La seconda che hai detto! Sai che è? Un dio, questa me la scrivo...",
		"https://youtu.be/MwfY552THjo?t=121",
	],
	[
		"- Maestro, è possibile parlare con i defunti?\n- Certo, se l'odore non è un problema...",
		"https://youtu.be/MwfY552THjo?t=182",
	],
	[
		"- Maestro...\n- Come ti chiami?\n- Carlotta\n- Sennò?\n- Franca\n- La seconda che hai detto!",
		"https://youtu.be/MwfY552THjo?t=191",
	],
	[
		"- Maestro, ma perché quando ci sarà il giudizio universale dovremo rientrare tutti nei nostri corpi?\n- Eh perché qua se ognuno si mette a scegliere facciamo notte. C'hai il tuo ti riprendi il tuo!",
		"https://youtu.be/MwfY552THjo?t=197",
	],
	[
		"- Quando noi moriamo, per la sua religione, cosa succede?\n- Allora, intanto condoglianze...\n- Ma no, era un'ipotesi... Voglio dire, dopo cosa c'è? Il nulla, il paradiso...\n- La seconda che hai detto! Il paradiso.\n- Qualcuno dice pure c'è solo una grande luce...\n- Ah, sai che c'è? La seconda che hai detto! Una grande luce!\n- No era la terza...\n- Eh, cancello quella...",
		"https://youtu.be/MwfY552THjo?t=220",
	],
	[
		"- Maestro volevo chiedere che interpretazione dà all'idea di trascendenza e a quale metafisica fa riferimento.\n- Sennò?\n- Che cos'è trascendentale e poi volevo sapere se esiste-\n- La domanda è mal posta. Forse tu volevi chiedere \"Maestro, che ore sono?\"",
		"https://youtu.be/MwfY552THjo?t=259",
	],
	[
		"- Maestro, maestro, secondo lei è possibile spostare gli oggetti col pensiero?\n- Certo, basta che poi li rimetti a posto eh!",
		"https://youtu.be/MwfY552THjo?t=283",
	],
	[
		"- Maestro, lei ha dei sogni nel cassetto?\n- No, soltanto calzini.",
		"https://youtu.be/MwfY552THjo?t=328",
	],
	[
		"- Maestro, penso che il messaggio religioso oggi sia andato completamente perduto.\n- Tu come la vedi?\n- Per esempio, se Cristo suonasse oggi alla sua porta, lei lo riconoscerebbe?\n- Certo!\n- E come può esserne così sicuro?\n- Il citofono è rotto da due anni quindi se suona è veramente un miracolo.",
		"https://youtu.be/MwfY552THjo?t=335",
	],
	[
		"- Maestro, lei è favorevole alla manipolazione genetica?\n- No, quelle cose fanno diventare cechi, attenzione eh!",
		"https://youtu.be/MwfY552THjo?t=360",
	],
	[
		"- Maestro, io vorrei tanto credere all'aldilà di Quelo ma purtroppo io sono convinto che non siamo altro che polvere: dalla polvere veniamo e in polvere torneremo. Polvere, solo polvere!\n- Ma... sei allergico?\n- No, io no.\n- E allora che problema c'è?\n- Ha ragione maestro!",
		"https://youtu.be/MwfY552THjo?t=371",
	],
	[
		"- Lei è contrario o favorevole alle unioni civili?\n- La seconda che hai detto! Favorevole.\n- Ah bene perché molti invece sono contrari alle unioni civili.\n- Allora, io dico, meglio un'unione civile che un'unione in cui la gente sputa per terra, fa pipì nei vasi, si mette le dita nel naso...",
		"https://youtu.be/MwfY552THjo?t=406",
	],
	[
		"Sono una persona democratici, ho rispetto per gli omosessuali e i neri, purché i due fenomeni non si presenta contemporaneamente.",
		"https://youtu.be/MwfY552THjo?t=753",
	],
	[
		"Con quante parole si può esprimere l'amore? Con tre io credo: amore, amore... e un'altra che non mi ricordo.",
		"https://youtu.be/MwfY552THjo?t=776",
	],
	[
		"S'i' fossi foco, bruciare, s'i' fossi acqua, bagnare, s'i' fossi saponetta, strofinare, s'i' fossi acqua un'altra volta, sciacquare.",
		"https://youtu.be/MwfY552THjo?t=811",
	],
	[
		"A questo mondo nessuno ti dà niente per niente. Sarebbe una perdita di tempo per tutti e due.",
		"https://youtu.be/MwfY552THjo?t=826",
	],
	[
		"Se ti dò uno schiaffo porgi l'altra guancia, sennò con la stessa sono io che cambio mano.",
		"https://youtu.be/MwfY552THjo?t=834",
	],
	[
		"Perché spari a zero, che tralaltro è un bravissimo cantante?",
		"https://youtu.be/MwfY552THjo?t=848",
	],
	[
		"Se fossi cane, bau, se fossi gatto, miao, se fosse tardi, ciao.",
		"https://youtu.be/MwfY552THjo?t=856",
	],
	[
		"- Quando ci si reincarna, si ricorda qualcosa della vita precedente o si dimentica tutto?\n- La seconda che hai detto! Si dimentica tutto.\n- E di noi come siamo adesso non rimane niente?\n- No.\n- Ma allora se noi non saremo più noi, che senso ha parlare di reincarnazione?\n- E che ne so, sei te che hai chiamato eh!",
		"https://youtu.be/zCbmW_wV_Do?t=496",
	],
	[
		"- Un miracolo di Quelo c'è o no?\n- Tu come la vedi?\n- Non lo so... ha moltiplicato i pani, i pesci...\n- La seconda che hai detto! Pesci, ha moltiplicato pesci.\n- Cioè?\n- Cioè te per esempio c'hai tre pesci, moltiplico per tre, tre per tre, totale 9 pesci! Oppure c'hai tre pesci, moltiplico per quattro, tre per quattro è sedici pesci.\n- Ma tre per quattro non fa sedici, fa dodici.\n- E Quelo per questo è un miracolo!",
		"https://youtu.be/zCbmW_wV_Do?t=161",
	],
];
const phrases = queloAnswers.map(([phrase]) => phrase);

const quelo = async (
	interaction: ReceivedInteraction,
	phrase?: string,
	ephemeral?: boolean
) => {
	const s = phrase?.toLowerCase();
	const answer =
		s === undefined
			? queloAnswers[Math.floor(Math.random() * queloAnswers.length)]
			: queloAnswers.find(([p]) => p.toLowerCase().includes(s));

	if (!answer) {
		await interaction.reply({
			content: "Frase non trovata!",
			ephemeral: true,
		});
		return;
	}
	const components: APIMessageActionRowComponent[] = [
		{
			type: ComponentType.Button,
			label: "Un'altra",
			style: ButtonStyle.Primary,
			emoji: { name: "💬" },
			custom_id: "quelo",
		},
	];

	if (answer[1])
		components.push({
			type: ComponentType.Button,
			label: "Guarda la scena",
			style: ButtonStyle.Link,
			url: answer[1],
		});
	await interaction.reply({
		content: answer[0],
		components: [
			{
				type: ComponentType.ActionRow,
				components,
			},
		],
		ephemeral,
	});
};

export const command = createCommand({
	data: [
		{
			name: "quelo",
			description: "C'è grossa grisi, c'è molta violenza, c'è molto egoismo!",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					description:
						"Una frase da mostrare. Ometti questo parametro per mostrare una frase casuale",
					name: "phrase",
					type: ApplicationCommandOptionType.String,
					autocomplete: true,
				},
			],
		},
	],
	async run(interaction) {
		await quelo(
			interaction,
			interaction.options.getString("phrase") ?? undefined
		);
	},
	async component(interaction) {
		await quelo(interaction, undefined, true);
	},
	async autocomplete(interaction) {
		const option = interaction.options.getFocused().toLowerCase();

		await interaction.respond(
			phrases
				.filter((p) => p.toLowerCase().includes(option))
				.slice(0, 25)
				.map((p) => {
					const name = p.replaceAll("\n", " ");

					return {
						name:
							name.length > 100 ? `${name.slice(0, 97).trimEnd()}...` : name,
						value: p.slice(0, 100),
					};
				})
		);
	},
});
