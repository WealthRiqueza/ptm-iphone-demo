"use strict";
// Offline browser-logic integration test. Fixtures are synthetic, not predictive evidence.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("index.html","utf8");
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const inline=scripts.filter(m=>m[1].trim()).map(m=>m[1]);
assert.equal(inline.length,1);
new Function(inline[0]);
assert.match(html,/id="pregame-source-url"/);
assert.match(html,/id="fetch-pregame-source"/);

class Element {
 constructor(id=""){this.id=id;this.value="";this.textContent="";this.dataset={};this.children=[];this.listeners={};
  this.className="";this.classList={toggle(){},add(){},remove(){}};this.style={};}
 addEventListener(event,fn){this.listeners[event]=fn;}
 click(){return this.listeners.click?.();}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=[...children];}
 querySelector(tag){return this.children.find(c=>tag==="strong"&&c.tag==="strong")||null;}
 querySelectorAll(selector){return selector==="[data-key]"?this.children.filter(c=>c.dataset.key):[];}
}
const nodes=new Map();
function get(id){if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);}
const document={getElementById:get,createElement(tag){const e=new Element();e.tag=tag;return e;}};
const fixture={player_a:"ALPHA PLAYER",player_b:"BETA PLAYER",scheduled_at_utc:"2026-11-07T18:00:00Z",
 provenance:{source_url:"https://example.org/matches",permission:"user-provided",captured_at_utc:"2026-11-07T17:00:00Z"},
 matches:[{id:"one",player_a:"ALPHA PLAYER",player_b:"BETA PLAYER",played_at_utc:"2026-11-06T17:00:00Z",
 sets:[[11,8],[11,9],[11,7]],source_url:"https://example.org/one"}]};
let calls=0;
const fetch=async (url,options)=>{
 calls++;
 assert.equal(url,"https://example.org/authorized.json");
 assert.equal(options.credentials,"omit");
 assert.equal(options.redirect,"error");
 assert.equal(options.cache,"no-store");
 assert.equal(options.method,"GET");
 return {ok:true,headers:{get:()=>String(JSON.stringify(fixture).length)},text:async()=>JSON.stringify(fixture)};
};
const context=vm.createContext({document,fetch,URL,AbortController,Date,Intl,Number,JSON,
 navigator:{clipboard:{writeText:async()=>{}}},setTimeout,clearTimeout,console});
vm.runInContext(fs.readFileSync("pregame-on-demand.js","utf8"),context);
vm.runInContext(inline[0],context);
(async()=>{
 get("match").value="ALPHA PLAYER VS BETA PLAYER";get("analyze").click();
 get("pregame-source-url").value="https://example.org/authorized.json";
 await get("fetch-pregame-source").click();
 assert.equal(calls,1);
 const h2h=get("report-fields").children.find(x=>x.dataset.key==="h2h_historico");
 assert.match(h2h.querySelector("strong").textContent,/ALPHA PLAYER 1 - 0 BETA PLAYER/);
 assert.equal(get("ptm-probability").textContent,"SIN VERIFICAR");
 assert.equal(get("ptm-filter").textContent,"SIN VERIFICAR");
 assert.match(get("pregame-source-status").textContent,/DESCARTAR/);
 get("pregame-source-url").value="http://example.org/insecure.json";
 await get("fetch-pregame-source").click();
 assert.equal(calls,1);
 assert.equal(h2h.querySelector("strong").textContent,"SIN VERIFICAR");
 // The browser must never fetch a private address or an IP-literal endpoint.
 // Numeric IPv4 and trailing-dot local names must not bypass the guard.
 for(const blocked of [
   "https://127.0.0.1/observations.json",
   "https://2130706433/observations.json",
   "https://10.0.0.2/observations.json",
   "https://192.168.1.10/observations.json",
   "https://[::1]/observations.json",
   "https://localhost./observations.json",
   "https://internal.local/observations.json",
   "https://db.internal/observations.json"
 ]) {
   get("pregame-source-url").value=blocked;
   await get("fetch-pregame-source").click();
   assert.equal(calls,1,"No private-source request may be sent");
   assert.match(get("pregame-source-status").textContent,/URL rechazada/);
 }

 console.log("Authorized HTTPS on-demand fetch UI smoke PASS (synthetic fixture; NOT Safari/network E2E)");
})().catch(e=>{console.error(e);process.exitCode=1;});
