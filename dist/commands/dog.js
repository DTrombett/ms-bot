import{b as a}from"../chunk-HUHUXK6N.js";import"../chunk-NJIM6YGF.js";import{ApplicationCommandType as c,ButtonStyle as i,ComponentType as t}from"discord-api-types/v10";import{env as s}from"node:process";import{request as l}from"undici";var r=async(o,m)=>{let e=await l("https://api.thedogapi.com/v1/images/search?order=RANDOM&limit=1&format=json",{method:"GET",headers:{"x-api-key":s.DOG_API_KEY}}).then(p=>p.body.json());if(!e?.[0]){await o.reply({content:"Si \xE8 verificato un errore nel caricamento dell'immagine!"});return}let[{url:n}]=e;await o.reply({content:`[Woof!](${n}) \u{1F436}`,ephemeral:m,components:[{type:t.ActionRow,components:[{type:t.Button,url:n,style:i.Link,label:"Apri l'originale"},{type:t.Button,style:i.Success,label:"Un altro!",custom_id:"dog",emoji:{name:"\u{1F436}"}}]}]})},g=a({data:[{name:"dog",description:"Mostra la foto di un adorabile cagnolino",type:c.ChatInput}],async run(o){await r(o)},async component(o){await r(o,!0)}});export{g as command};
//# sourceMappingURL=dog.js.map