import{a as n}from"../chunk-ZBDK6ERH.js";import"../chunk-6RVUKQTV.js";import{ApplicationCommandType as p,ButtonStyle as i,ComponentType as e}from"discord-api-types/v10";import{env as s}from"node:process";import{request as l}from"undici";var r=async(t,c)=>{let o=await l("https://api.thecatapi.com/v1/images/search?order=RANDOM&limit=1&format=json",{method:"GET",headers:{"x-api-key":s.CAT_API_KEY}}).then(m=>m.body.json());if(!o?.[0]){await t.reply({content:"Si \xE8 verificato un errore nel caricamento dell'immagine!"});return}let[{url:a}]=o;await t.reply({content:`[Meow!](${a}) \u{1F431}`,ephemeral:c,components:[{type:e.ActionRow,components:[{type:e.Button,url:a,style:i.Link,label:"Apri l'originale"},{type:e.Button,style:i.Success,label:"Un altro!",custom_id:"cat",emoji:{name:"\u{1F431}"}}]}]})},h=n({data:[{name:"cat",description:"Mostra la foto di un adorabile gattino",type:p.ChatInput}],async run(t){await r(t)},async component(t){await r(t,!0)}});export{h as command};
//# sourceMappingURL=cat.js.map