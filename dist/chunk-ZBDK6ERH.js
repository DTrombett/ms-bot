import{c as i,e as o,f as d}from"./chunk-6RVUKQTV.js";var T=e=>e;var k=e=>e;var I=e=>(o.printToStderr(e),e instanceof Error?e:new Error(typeof e=="string"?e:"Unknown error"));var v=(e,n)=>e===void 0?Math.random():Math.floor(Math.random()*(n-e+1))+e;var $=(e,n)=>e[e.deferred?"editReply":"reply"]({content:`Si \xE8 verificato un errore: \`${n.message.slice(0,1e3)}\``,ephemeral:!0});import{ApplicationCommandType as s}from"discord-api-types/v10";import{unlink as y,watch as x}from"node:fs/promises";import{join as l}from"node:path";import{cwd as u}from"node:process";var C=l(u(),`src/${i.commandsFolderName}`),c=(e,n=!1)=>import(`./${i.commandsFolderName}/${e.replace(/\.ts$/,".js")}${n?`?${Date.now()}`:""}`).then(t=>t.command).catch(()=>{}),F=async e=>{let n=await import("tsup").catch(()=>{o.printToStderr("Failed to load tsup, not watching for changes...")});if(n)for await(let t of x(C,{encoding:"utf8",persistent:!1})){let r=await c(t.filename,!0);if(t.eventType==="rename"&&r){let{name:a}=r.data.find(({type:f})=>f===s.ChatInput)??r.data[0],m=e.commands.delete(a);y(new URL(`${i.commandsFolderName}/${t.filename.replace(/\.ts/,".js")}`,import.meta.url)).catch(o.printToStderr),o.printToStdout(m?`Deleted ${t.filename}`:`Couldn't find command ${a} (${t.filename})`);continue}if(await n.build({config:!1,entry:[`src/${i.commandsFolderName}/${t.filename}`],format:"esm",external:["tsup"],minify:!0,platform:"node",sourcemap:!0,target:"ESNext",outDir:l(u(),"dist/commands")}).catch(a=>(o.printToStderr(`Failed to build ${t.filename}`),o.printToStderr(a),!0)))continue;let p=await c(t.filename,!0);if(p){r&&e.commands.delete(r.data.find(({type:m})=>m===s.ChatInput)?.name??r.data[0].name);let{name:a}=p.data.find(({type:m})=>m===s.ChatInput)??p.data[0];e.commands.set(a,new d(e,p)),o.printToStdout(`${r?"Reloaded":"Added"} command ${a} (${t.filename})`)}else o.printToStderr(`Cannot find new ${t.filename}`)}};var z=i;export{T as a,k as b,I as c,v as d,$ as e,F as f,z as g};
//# sourceMappingURL=chunk-ZBDK6ERH.js.map