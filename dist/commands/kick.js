import{a as p,d as m,f as d}from"../chunk-QQX4XUVK.js";import{b as l,e as u}from"../chunk-NJIM6YGF.js";import{ApplicationCommandOptionType as a,ApplicationCommandType as c,ComponentType as f,TextInputStyle as w}from"discord-api-types/v10";import{escapeMarkdown as b,GuildMember as v}from"discord.js";var y=async(e,t,r,o)=>{if(!o)return await e.reply({content:"L'utente non \xE8 nel server!",ephemeral:!0}),!0;if(e.user.id!==r){if(!e.memberPermissions.has("KickMembers"))return await e.reply({content:"Hai bisogno del permesso **Espelli membri** per eseguire questa azione!",ephemeral:!0}),!0;if(t===r)return await e.reply({content:"Non puoi eseguire questa azione sul proprietario del server!",ephemeral:!0}),!0;if(o.roles.highest.comparePositionTo(e.member.roles.highest)>=0)return await e.reply({content:"Non puoi eseguire questa azione su un membro con una posizione superiore o uguale alla tua!",ephemeral:!0}),!0}return o.kickable?!1:(await e.reply({content:"Non ho abbastanza permessi per espellere questo membro!",ephemeral:!0}),!0)},h=async(e,t,r="")=>{let[o]=await Promise.all([t.kick(r||void 0).then(()=>{}).catch(m),e.deferReply().catch(u.printToStderr)]);if(o){await d(e,o);return}await e.editReply({content:`<:kick:${l.kick}> <@${t.user.id}> (${b(t.user.tag)} - ${t.user.id}) \xE8 stato espulso!

Motivo: ${r.length?r.slice(0,1e3):"*Nessun motivo*"}`})},g=(e,t)=>e.showModal({title:`Espelli ${t.user.username} dal server`,custom_id:`kick-${t.id}`,components:[{type:f.ActionRow,components:[{type:f.TextInput,custom_id:"reason",label:"Motivo dell'espulsione",placeholder:"Inserisci un motivo. Sar\xE0 visibile solo nel registro attivit\xE0 e non sar\xE0 mostrato al membro.",max_length:512,style:w.Paragraph,required:!1}]}]}),C=p({data:[{type:c.ChatInput,name:"kick",description:"Espelli utente",options:[{name:"member",description:"Il membro da espellere",type:a.User,required:!0},{name:"reason",description:"Il motivo dell'espulsione, se presente",type:a.String,max_length:512}]},{type:c.User,name:"Espelli"}],async run(e){if(!e.inCachedGuild()){await e.reply({content:"Questo comando pu\xF2 essere usato solo all'interno di un server!",ephemeral:!0});return}let t=e.options.data.find(n=>n.type===a.User),r=t?.user;if(!r){await e.reply({content:"Utente non trovato!",ephemeral:!0});return}let{guild:o}=e,s=t.member instanceof v?t.member:await o.members.fetch(r.id).catch(()=>{});if(await y(e,r.id,o.ownerId,s))return;if(e.commandName==="Espelli"){await g(e,s);return}let i=e.options.data.find(n=>n.name==="reason")?.value;await h(e,s,typeof i=="string"?i:void 0)},async modalSubmit(e){let[,t]=e.customId.split("-");if(!t){await e.reply({content:"Utente non trovato!",ephemeral:!0});return}if(!e.inCachedGuild()){await e.reply({content:"Questo comando pu\xF2 essere usato solo all'interno di un server!",ephemeral:!0});return}let{guild:r}=e,o=await r.members.fetch(t).catch(()=>{});await y(e,t,r.ownerId,o)||await h(e,o,e.fields.fields.get("reason")?.value)}});export{C as command};
//# sourceMappingURL=kick.js.map