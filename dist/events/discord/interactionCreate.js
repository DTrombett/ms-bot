import{b as D,c as i}from"../../chunk-IFQFNU44.js";import{A as E,B as S,a as d,b as o,d as t,f as u,g as c,h,i as w,j as y,l as f,m as n,n as b,o as k,p as R,q as v,s as g,t as C,u as $,v as I,w as P,x as T,y as j,z as O}from"../../chunk-XV3K5JED.js";import"../../chunk-B7NPBJ6H.js";import{codeBlock as M}from"@discordjs/builders";import{ApplicationCommandType as _,InteractionType as p}from"discord-api-types/v10";import{Colors as q,escapeCodeBlock as A,GuildChannel as L}from"discord.js";import{readFile as N}from"node:fs/promises";import x from"prettier";import F from"typescript";var X={name:"interactionCreate",type:"discord",async on(e){if(this.client.blocked){t.printToStderr("Received interactionCreate event, but client is blocked.");return}if(e.type===p.ApplicationCommand&&e.commandType===_.ChatInput){this.client.commands.get(e.commandName)?.run(e),t.printToStdout(`Received command \`${i(e)}\` from ${e.user.tag} (${e.user.id}) ${e.channel?`in ${e.channel instanceof L?`#${e.channel.name}`:"DM"} (${e.channelId})`:""}`,!0);return}if(e.type===p.ApplicationCommandAutocomplete){this.client.commands.get(e.commandName)?.autocomplete(e),t.printToStdout(`Received autocomplete request for command ${i(e)} from ${e.user.tag} (${e.user.id}) ${e.channel?`in ${e.channel instanceof L?`#${e.channel.name}`:"DM"} (${e.channelId})`:""}`,!0);return}if(e.type===p.MessageComponent){let{action:m,args:a}=d(e.customId),l;switch(m){case"avatar":[l]=await Promise.all([o(this.client,a[0],a[1]),e.deferReply()]),await e.editReply(l);break;case"bann":[l]=await Promise.all([u(this.client,a[0],a[1],e.user.id,a[3],a[4],a[5]),e.deferReply()]),await e.editReply(l);break;case"banner":[l]=await Promise.all([c(this.client,a[0]),e.deferReply()]),await e.editReply(l);break;case"bannList":l=await h(this.client,a[0],a[1],a[2],a[3]),await(a[3]==="true"&&e.user.id===a[2]?e.update(l):e.reply({...l,ephemeral:!0}));break;case"calc":l={...await w(this.client,a[0],a[1]),ephemeral:!0},await e.reply(l);break;case"cat":[l]=await Promise.all([y(this.client),e.deferReply({ephemeral:!0})]),await e.editReply(l);break;case"dog":[l]=await Promise.all([b(this.client),e.deferReply({ephemeral:!0})]),await e.editReply(l);break;case"deleteEmoji":[l]=await Promise.all([f(this.client,a[0],a[1],e.user.id,void 0),e.deferReply({ephemeral:!0})]),await e.editReply(l);break;case"dice":l={...await n(this.client,a[0]),ephemeral:!0},await e.reply(l);break;case"editEmoji":[l]=await Promise.all([k(this.client,a[0],a[1],a[2],e.user.id,void 0,...a.slice(3)),e.deferReply({ephemeral:!0})]),await e.editReply(l);break;case"emojiInfo":l={...await R(this.client,a[0],a[1]),ephemeral:!0},await e.reply(l);break;case"emojiList":l=await v(this.client,a[0],a[1],a[2],a[3]),await(a[3]==="true"&&e.user.id===a[2]?e.update(l):e.reply({...l,ephemeral:!0}));break;case"icon":l={...await g(this.client,a[0])},await e.reply(l);break;case"kick":[l]=await Promise.all([C(this.client,a[0],a[1],e.user.id,a[3]),e.deferReply()]),await e.editReply(l);break;case"love":l={...await $(this.client,a[0],a[1],a[2],a[3]),ephemeral:!0},await e.reply(l);break;case"ping":l={...await I(this.client),ephemeral:!0},await e.reply(l);break;case"predict":l={...await P(this.client,a[0]),ephemeral:!0},await e.reply(l);break;case"randomNumber":l={...await T(this.client,a[0],a[1]),ephemeral:!0},await e.reply(l);break;case"rps":l={...await j(this.client,a[0]),ephemeral:!0},await e.reply(l);break;case"timeout":[l]=await Promise.all([O(this.client,a[0],a[1],a[2]||null,e.user.id,a[4]),e.deferReply()]),await e.editReply(l);break;case"timestamp":l={...await E(this.client,...a),ephemeral:!0},await e.reply(l);break;case"unbann":[l]=await Promise.all([S(this.client,a[0],a[1],e.user.id,a[3]),e.deferReply()]),await e.editReply(l);break;default:t.printToStderr(`Received unknown button interaction ${e.customId}`)}return}if(e.type===p.ModalSubmit){let[m,...a]=e.customId.split("-");switch(m){case"eval":let l=e.fields.getTextInputValue("code"),r,B=Date.now();try{[r]=await Promise.all([Promise.all([N("./node_modules/@tsconfig/node18/tsconfig.json","utf8").then(JSON.parse),N("./tsconfig.json","utf8").then(JSON.parse),x.resolveConfig(".prettierrc.json").catch(()=>null).then(s=>l=x.format(l,{...s}))]).then(([{compilerOptions:s},{compilerOptions:J}])=>D(F.transpileModule(l,{compilerOptions:{...s,...J,isolatedModules:!1,outDir:void 0,sourceMap:!1}}).outputText)),e.deferReply({ephemeral:a[0]==="eph"})])}catch(s){r=t.inspect(s)}t.printToStdout(r),await e[e.deferred?"editReply":"reply"]({content:`Eval elaborato in ${Date.now()-B}ms`,embeds:[{author:{name:e.user.tag,icon_url:e.user.displayAvatarURL()},title:"Eval output",description:M(A(r).slice(0,4096-9)),color:q.Blurple,timestamp:new Date().toISOString(),fields:[{name:"Input",value:M("js",A(l).slice(0,1024-9))}]}],ephemeral:a[0]==="eph"});break;default:t.printToStderr(`Received unknown modal interaction ${e.customId}`)}}}};export{X as event};
//# sourceMappingURL=interactionCreate.js.map