import"../chunk-IFQFNU44.js";import{i as t}from"../chunk-XV3K5JED.js";import"../chunk-B7NPBJ6H.js";import{SlashCommandBuilder as o}from"@discordjs/builders";var r={data:new o().setName("calc").setDescription("Calcola una espressione matematica").addStringOption(e=>e.setName("expr").setDescription("L'espressione da calcolare").setRequired(!0)).addBooleanOption(e=>e.setName("fractions").setDescription("Ritorna il risultato come frazione (default: No)")),isPublic:!0,async run(e){await e.reply(await t(this.client,e.options.getString("expr",!0),e.options.getBoolean("fractions")===!0?"true":"false"))}};export{r as command};
//# sourceMappingURL=calc.js.map