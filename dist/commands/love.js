import{a as s}from"../chunk-QQX4XUVK.js";import"../chunk-NJIM6YGF.js";import{ApplicationCommandOptionType as p,ApplicationCommandType as m}from"discord-api-types/v10";var d=[":broken_heart:",":mending_heart:",":heart:",":sparkling_heart:",":cupid:",":heartpulse:",":gift_heart:",":heartbeat:",":two_hearts:",":revolving_hearts:",":heart_on_fire:"],c=s({data:[{name:"love",description:"Calcola l'amore tra due utenti \u{1F493}",type:m.ChatInput,options:[{name:"user1",description:"Il primo utente",type:p.User,required:!0},{name:"user2",description:"Il secondo utente (default: tu)",type:p.User}]}],async run(e){let[{user:t},{user:r}]=e.options.data;if(r??=e.user,!t){await e.reply({content:"Utente non trovato!",ephemeral:!0});return}let n=BigInt(t.id)*BigInt(t.discriminator),o=BigInt(r.id)*BigInt(r.discriminator),a=n>o?o*100n/n:n*100n/o,i=d[Math.floor(Number(a)/10)]??"\u2764\uFE0F";await e.reply({content:`${i} L'amore tra <@${t.id}> e <@${r.id}> \xE8 del **${a}%** ${i}`})}});export{c as command};
//# sourceMappingURL=love.js.map