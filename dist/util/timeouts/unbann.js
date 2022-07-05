var t=(e,n)=>Promise.resolve(client.guilds.cache.get(e)?.members.unban(n,"Bann temporaneo").catch(()=>null)??null),o=t;export{o as default};
//# sourceMappingURL=unbann.js.map