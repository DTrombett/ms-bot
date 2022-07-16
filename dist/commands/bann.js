import{a as b,d as p,f as c}from"../chunk-QQX4XUVK.js";import{b as m,e as u}from"../chunk-NJIM6YGF.js";import{ApplicationCommandOptionType as r,ApplicationCommandType as y,ButtonStyle as I,ComponentType as s,TextInputStyle as h}from"discord-api-types/v10";import{escapeMarkdown as M,GuildMember as T}from"discord.js";var f=async(e,n,a,t)=>{if(e.user.id!==n){if(!e.memberPermissions.has("BanMembers"))return await e.reply({content:"Hai bisogno del permesso **Bannare i membri** per questa azione!",ephemeral:!0}),!0;if(a===n)return await e.reply({content:"Non puoi eseguire questa azione sul proprietario del server!",ephemeral:!0}),!0;if(t&&t.roles.highest.comparePositionTo(e.member.roles.highest)>=0)return await e.reply({content:"Non puoi bannare un membro con una posizione superiore o uguale alla tua!",ephemeral:!0}),!0}return t?.bannable===!1?(await e.reply({content:"Non ho abbastanza permessi per bannare questo membro!",ephemeral:!0}),!0):!1},w=async(e,n,a,t="")=>{let[o]=await Promise.all([e.guild.members.ban(n,{deleteMessageDays:a,reason:t||void 0}).then(()=>{}).catch(p),e.deferReply().catch(u.printToStderr)]);if(o){await c(e,o);return}await e.editReply({content:`<:bann:${m.bann}> <@${n.id}> (${M(n.tag)} - ${n.id}) \xE8 stato bannato!

Motivo: ${t.length?t.slice(0,1e3):"*Nessun motivo*"}`,components:[{type:s.ActionRow,components:[{type:s.Button,custom_id:`bann-${n.id}-r`,style:I.Danger,label:"Revoca bann"}]}]})},g=(e,n)=>e.showModal({title:`Vuoi bannare "@${n.username}"?`,custom_id:`bann-${n.id}`,components:[{type:s.ActionRow,components:[{type:s.TextInput,custom_id:"deleteMessageDays",label:"Elimina la cronologia dei messaggi degli ultimi giorni",placeholder:"Esempi: 1, 7",style:h.Short,value:"1",min_length:1,max_length:3,required:!1}]},{type:s.ActionRow,components:[{type:s.TextInput,custom_id:"reason",label:"Motivo del bann",placeholder:"Inserisci un motivo. Sar\xE0 visibile solo nel registro attivit\xE0 e non sar\xE0 mostrato al membro.",max_length:512,style:h.Paragraph,required:!1}]}]}),v=async(e,n,a="")=>{let{guild:t}=e;if(!await t.bans.fetch(n.id).catch(()=>{})){await e.reply({content:"L'utente non \xE8 bannato!",ephemeral:!0});return}let[o]=await Promise.all([t.members.unban(n,a||void 0).then(()=>{}).catch(p),e.deferReply().catch(u.printToStderr)]);if(o){await c(e,o);return}await e.editReply({content:`Ho revocato il bann da <@${n.id}> (${M(n.tag)} - ${n.id})!

Motivo: ${a.length?a.slice(0,1e3):"*Nessun motivo*"}`,components:[{type:s.ActionRow,components:[{type:s.Button,custom_id:`bann-${n.id}-a`,label:"Bann",style:I.Success,emoji:{animated:!1,id:m.bann,name:"bann"}}]}]})},C=b({data:[{type:y.ChatInput,name:"bann",description:"Banna utente o revoca un bann",options:[{name:"add",description:"Banna utente",type:r.Subcommand,options:[{name:"user",description:"L'utente da bannare",type:r.User,required:!0},{name:"delete-messages",description:"Quanto eliminare della sua cronologia dei messaggi recenti",type:r.Number,min_value:0,max_value:7},{name:"reason",description:"Il motivo del bann, se presente",type:r.String,max_length:512}]},{name:"remove",description:"Revoca bann",type:r.Subcommand,options:[{name:"user",description:"L'utente da cui revocare il bann",type:r.User,required:!0},{name:"reason",description:"Il motivo della revoca del bann, se presente",type:r.String,max_length:512}]}]},{type:y.User,name:"Bann"}],async run(e){if(!e.inCachedGuild()){await e.reply({content:"Questo comando pu\xF2 essere usato solo all'interno di un server!",ephemeral:!0});return}let n=e.commandType===y.User?e.options.data:e.options.data[0].options;if(!n){await e.reply({content:"Questo comando non \xE8 attualmente disponibile!",ephemeral:!0});return}let a=n.find(i=>i.type===r.User),t=a?.user;if(!t){await e.reply({content:"Utente non trovato!",ephemeral:!0});return}let{guild:o}=e,l=a.member instanceof T?a.member:await o.members.fetch(t.id).catch(()=>{});if(await f(e,o.ownerId,t.id,l))return;if(e.commandName==="Bann"){await g(e,t);return}let d=n.find(i=>i.name==="reason")?.value;if(e.options.data[0].name==="add"){let i=n.find(S=>S.name==="delete-messages")?.value;await w(e,t,typeof i=="number"?i:0,typeof d=="string"?d:void 0);return}await v(e,t,typeof d=="string"?d:void 0)},async modalSubmit(e){let n=Number(e.fields.fields.get("deleteMessageDays")?.value)||0;if(n<0||n>7){await e.reply({content:"Il numero di giorni deve essere compreso tra 0 e 7!",ephemeral:!0});return}let[,a]=e.customId.split("-"),t=await this.client.users.fetch(a).catch(()=>{});if(!t){await e.reply({content:"Utente non trovato!",ephemeral:!0});return}if(!e.inCachedGuild()){await e.reply({content:"Questo comando pu\xF2 essere usato solo all'interno di un server!",ephemeral:!0});return}let{guild:o}=e,l=await o.members.fetch(a).catch(()=>{});await f(e,o.ownerId,a,l)||await w(e,t,n,e.fields.fields.get("reason")?.value)},async component(e){if(!e.inCachedGuild()){await e.reply({content:"Questo comando pu\xF2 essere usato solo all'interno di un server!",ephemeral:!0});return}let[,n,a]=e.customId.split("-"),t=await this.client.users.fetch(n).catch(()=>{});if(!t){await e.reply({content:"Utente non trovato!",ephemeral:!0});return}if(!a||!["a","r"].includes(a)){await e.reply({content:"Azione non valida!",ephemeral:!0});return}let{guild:o}=e,l=await o.members.fetch(n).catch(()=>{});if(!await f(e,o.ownerId,n,l)){if(a==="a"){await g(e,t);return}await v(e,t,void 0)}}});export{C as command};
//# sourceMappingURL=bann.js.map