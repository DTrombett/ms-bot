import{c as a,d as f,f as o,g as u}from"./chunk-NJIM6YGF.js";var S=e=>e;var b=e=>e;var T=["Bytes","KB","MB","GB","TB"],A=(e,r=!0)=>{if(e===0)return"0 Bytes";let t=Math.floor(Math.log(e)/Math.log(1024));return`${Math.round(e/Math.pow(1024,t))}${r?" ":""}${T[t]}`};var B=e=>(o.printToStderr(e),e instanceof Error?e:new Error(typeof e=="string"?e:"Unknown error"));var M=(e,r)=>e===void 0?Math.random():Math.floor(Math.random()*(r-e+1))+e;var P=(e,r)=>e[e.deferred?"editReply":"reply"]({content:`Si \xE8 verificato un errore: \`${r.message.slice(0,1e3)}\``,ephemeral:!0});import{ApplicationCommandType as l}from"discord.js";import{unlink as y,watch as x}from"node:fs/promises";import{join as d}from"node:path";import{cwd as c}from"node:process";var v=d(c(),`src/${a.commandsFolderName}`),w=d(c(),`src/${a.eventsFolderName}`),p=e=>import(`${e.replace(/\.ts$/,".js")}?${Date.now()}`).catch(()=>{}),$=async(e,r)=>{for await(let t of x(v,{encoding:"utf8",persistent:!1})){let n=(await p(`./${a.commandsFolderName}/${t.filename}`))?.command;if(t.eventType==="rename"&&n){let{name:m}=n.data.find(({type:g})=>g===l.ChatInput)??n.data[0],s=e.commands.delete(m);y(new URL(`${a.commandsFolderName}/${t.filename.replace(/\.ts/,".js")}`,import.meta.url)).catch(o.printToStderr),o.printToStdout(s?`Deleted command ${m} (${t.filename})`:`Couldn't find command ${m} (${t.filename})`);continue}if(await r({config:!1,entry:[`src/${a.commandsFolderName}/${t.filename}`],format:"esm",external:["tsup"],minify:!0,platform:"node",sourcemap:!0,target:"ESNext",outDir:d(c(),"dist/commands")}).catch(()=>(o.printToStderr(`Failed to build command ${t.filename}`),!0)))continue;let i=(await p(`./${a.commandsFolderName}/${t.filename}`))?.command;if(i){n&&e.commands.delete(n.data.find(({type:s})=>s===l.ChatInput)?.name??n.data[0].name);let{name:m}=i.data.find(({type:s})=>s===l.ChatInput)??i.data[0];e.commands.set(m,new u(e,i)),o.printToStdout(`${n?"Reloaded":"Added"} command ${m} (${t.filename})`)}else o.printToStderr(`Cannot find new command ${t.filename}`)}},h=async(e,r)=>{for await(let t of x(w,{encoding:"utf8",persistent:!1})){let n=(await p(`./${a.eventsFolderName}/${t.filename}`))?.event;if(t.eventType==="rename"&&n){e.events.get(n.name)?.removeListeners();let m=e.events.delete(n.name);y(new URL(`${a.eventsFolderName}/${t.filename.replace(/\.ts/,".js")}`,import.meta.url)).catch(o.printToStderr),o.printToStdout(m?`Deleted event ${n.name} (${t.filename})`:`Couldn't find event ${n.name} (${t.filename})`);continue}if(await r({config:!1,entry:[`src/${a.eventsFolderName}/${t.filename}`],format:"esm",external:["tsup"],minify:!0,platform:"node",sourcemap:!0,target:"ESNext",outDir:d(c(),"dist/events")}).catch(()=>(o.printToStderr(`Failed to build event ${t.filename}`),!0)))continue;let i=(await p(`./${a.eventsFolderName}/${t.filename}`))?.event;i?(n&&(e.events.get(n.name)?.removeListeners(),e.events.delete(n.name)),e.events.set(i.name,new f(e,i)),o.printToStdout(`${n?"Reloaded":"Added"} event ${i.name} (${t.filename})`)):o.printToStderr(`Cannot find new event ${t.filename}`)}},Q=async e=>{let r=await import("tsup").catch(()=>{o.printToStderr("Failed to load tsup, not watching for changes...")});r&&Promise.all([$(e,r.build),h(e,r.build)]).catch(o.printToStderr)};var te=a;export{S as a,b,A as c,B as d,M as e,P as f,Q as g,te as h};
//# sourceMappingURL=chunk-QQX4XUVK.js.map