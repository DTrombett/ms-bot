import"../chunk-IFQFNU44.js";import{x as m}from"../chunk-XV3K5JED.js";import"../chunk-B7NPBJ6H.js";import{SlashCommandBuilder as n}from"@discordjs/builders";var o={data:new n().setName("random").setDescription("Genera un numero casuale tra due numeri, se non specificati genera un numero decimale tra 0 e 1").addNumberOption(e=>e.setName("min").setDescription("Il numero minimo")).addNumberOption(e=>e.setName("max").setDescription("Il numero massimo")),isPublic:!0,async run(e){await e.reply(await m(this.client,e.options.getNumber("min")?.toString(),e.options.getNumber("max")?.toString()))}};export{o as command};
//# sourceMappingURL=random.js.map