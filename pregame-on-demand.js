/* PTM 3.3 PREGAME: bounded client-side descriptive engine.
   Reads only a locally supplied JSON object. No scraping, network, odds, or trades.
   User-declared permission is NOT independent authentication. No PTM approval. */
(function(root) {
 "use strict";
 const clean = x => String(x || "").trim().replace(/\s+/g, " ");
 // Preserve accents for strict player identity: transliteration is not proof of a match.
 const norm = x => clean(x).toLowerCase();
 const iso = x => {
   if (typeof x !== "string") throw Error("Fecha con zona UTC requerida");
   // Date.parse can normalize impossible calendar dates in Safari and Chromium.
   // Reject them before evaluating PREGAME point-in-time cutoffs.
   const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/.exec(x);
   if (!m) throw Error("Fecha con zona UTC requerida");
   const year=Number(m[1]), month=Number(m[2]), day=Number(m[3]);
   const hour=Number(m[4]), minute=Number(m[5]), second=Number(m[6]||0);
   const leap=year%4===0&&(year%100!==0||year%400===0);
   const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
   if (month<1||month>12||day<1||day>days[month-1]||
       hour>23||minute>59||second>59) throw Error("Fecha inválida");
   const t=Date.parse(x);
   if (!Number.isFinite(t)) throw Error("Fecha inválida");
   return t;
 };
 const https = x => {
   if (typeof x !== "string" || /\s/.test(x)) return false;
   try {
     const u = new URL(x);
     return u.protocol === "https:" && !!u.hostname &&
       !u.username && !u.password && !u.hash;
   } catch (_) { return false; }
 };
 const rate = (w,n) => n ? w+"/"+n+" ("+Math.round(100*w/n)+"%)" : "SIN VERIFICAR";
 const pairs = (a,b,ra,rb) => a+": "+ra+" | "+b+": "+rb;
 const miamiDate = ms => {const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(ms));const get=k=>p.find(v=>v.type===k).value;return get("year")+"-"+get("month")+"-"+get("day");};
 function researchElo(rows, a, b) {
   // Research-only Elo K=24; no market odds, no source authentication or calibration.
   const aKey=norm(a), bKey=norm(b);
   const counts=Object.create(null), ratings=Object.create(null);
   counts[aKey]=0;counts[bKey]=0;
   const ordered=rows.slice().sort((u,v)=>u.played-v.played ||
     (u.id<v.id?-1:u.id>v.id?1:0));
   for(const m of ordered) {
     const x=norm(m.x), y=norm(m.y), winner=norm(m.winner);
     if(x===aKey||y===aKey)counts[aKey]++;
     if(x===bKey||y===bKey)counts[bKey]++;
     const ra=Object.prototype.hasOwnProperty.call(ratings,x)?ratings[x]:1500;
     const rb=Object.prototype.hasOwnProperty.call(ratings,y)?ratings[y]:1500;
     const p=1/(1+Math.pow(10,(rb-ra)/400));
     const delta=24*((winner===x?1:0)-p);
     ratings[x]=ra+delta;ratings[y]=rb-delta;
   }
   const enough=counts[aKey]>=10&&counts[bKey]>=10;
   const probability=enough?1/(1+Math.pow(10,(ratings[bKey]-ratings[aKey])/400)):null;
   return {status:enough?"BASELINE_NO_CALIBRADO":"SIN_VERIFICAR",
     raw_probability_a:probability,
     sample_counts:{[a]:counts[aKey],[b]:counts[bKey]},
     source_data_verified:false,probability_verified:false};
 }
 function analyze(p) {
   if (!p || typeof p !== "object" || Array.isArray(p)) throw Error("Objeto JSON requerido");
   if (typeof p.player_a !== "string" || typeof p.player_b !== "string")
     throw Error("Identidad de jugador debe ser texto");
   const a = clean(p.player_a), b = clean(p.player_b);
   if (!a || !b || norm(a)===norm(b) || a.length>120 || b.length>120) throw Error("Dos jugadores distintos requeridos");
   const scheduled = iso(p.scheduled_at_utc), prov=p.provenance;
   if (!prov || typeof prov!=="object" || !https(prov.source_url) ||
       !["authorized","user-provided"].includes(prov.permission))
     throw Error("Procedencia HTTPS y permiso declarado requeridos");
   const captured=iso(prov.captured_at_utc);
   // Reject a declared capture that has not happened yet. A five-minute clock
   // tolerance is for mobile device skew, not authentication of the source.
   if (captured>Date.now()+5*60*1000) throw Error("Captura futura: evidencia no disponible");
   if (captured>=scheduled) throw Error("Captura en o después del inicio: no es PREGAME");
   if (!Array.isArray(p.matches) || p.matches.length>200) throw Error("Máximo 200 partidos observados");
   // A per-match evidence URL must identify one unique match. Duplicate rows
   // with different IDs would otherwise inflate H2H and form denominators.
   const ids=new Set(), evidenceUrls=new Set(), matchFingerprints=new Set(), rows=[];
   for (const m of p.matches) {
     if (!m || typeof m!=="object" || typeof m.id!=="string" || !clean(m.id) ||
         typeof m.player_a!=="string" || typeof m.player_b!=="string" ||
         ids.has(clean(m.id)) ||
         !https(m.source_url)) throw Error("ID duplicado o URL de partido inválida");
     if(evidenceUrls.has(m.source_url)) throw Error("URL de partido duplicada");
     ids.add(clean(m.id));
     evidenceUrls.add(m.source_url);
     const x=clean(m.player_a), y=clean(m.player_b);
     if (!x || !y || norm(x)===norm(y)) throw Error("Jugadores de resultado inválidos");
     const played=iso(m.played_at_utc);
     if (played>captured) throw Error("Resultado posterior a captura: evidencia futura");
     if (!Array.isArray(m.sets) || m.sets.length<3 || m.sets.length>5) throw Error("Sets incompletos");
     const wins=[0,0], sets=[];
     for (const [setIndex,s] of m.sets.entries()) {
       if (!Array.isArray(s) || s.length!==2 || s.some(v=>!Number.isInteger(v)||v<0) ||
           !((Math.max(...s)===11 && Math.min(...s)<=9) ||
           (Math.max(...s)>=12 && Math.min(...s)===Math.max(...s)-2))) throw Error("Puntos de set inválidos");
       wins[s[0]>s[1]?0:1]++;
       if(Math.max(...wins)===3 && setIndex!==m.sets.length-1)
         throw Error("Partido continuó después de ganar el tercer set");
       sets.push([s[0],s[1]]);
     }
     if (Math.max(...wins)!==3 || Math.min(...wins)!==sets.length-3) throw Error("Marcador de partido inconsistente");
     // Different IDs/URLs or home/away order may refer to the same event.
     // Reject even conflicting scores for the same pair and exact UTC instant.
     const names=[norm(x),norm(y)].sort();
     const fingerprint=JSON.stringify([names,played]);
     if(matchFingerprints.has(fingerprint)) throw Error("Partido duplicado con distinta fuente");
     matchFingerprints.add(fingerprint);
     if (played>=scheduled) continue;
     rows.push({id:clean(m.id),x,y,played,sets,wins,first:sets[0][0]>sets[0][1]?x:y,
                winner:wins[0]===3?x:y,source:m.source_url});
   }
   rows.sort((u,v)=>v.played-u.played);
   function summary(name) {
     const games=rows.filter(m=>norm(m.x)===norm(name)||norm(m.y)===norm(name));
     const records=games.map(m=>({
       won:norm(m.winner)===norm(name),
       first:norm(m.first)===norm(name),
       fifth:m.sets.length===5,
       day:miamiDate(m.played),
       opponent:norm(m.x)===norm(name)?m.y:m.x
     }));
     const recent=n=>({wins:records.slice(0,n).filter(r=>r.won).length,played:Math.min(n,records.length)});
     const first=records.filter(r=>r.first), lost=records.filter(r=>!r.first), fifth=records.filter(r=>r.fifth);
     let streak=0;
     if (records.length) {const win=records[0].won;for(const r of records){if(r.won!==win)break;streak++;}if(!win)streak=-streak;}
     const opponents={};
     for(const r of records){const k=norm(r.opponent);if(!opponents[k])opponents[k]={wins:0,played:0};opponents[k].played++;if(r.won)opponents[k].wins++;}
     return {records,last10:recent(10),last5:recent(5),first:{wins:first.filter(r=>r.won).length,played:first.length},
       comeback:{wins:lost.filter(r=>r.won).length,played:lost.length},
       fifth:{wins:fifth.filter(r=>r.won).length,played:fifth.length},
       sameDay:records.filter(r=>r.day===miamiDate(scheduled)).length,streak,opponents};
   }
   const sa=summary(a), sb=summary(b);
   const rawElo=researchElo(rows,a,b);
   const h2h=rows.filter(m=>[norm(m.x),norm(m.y)].sort().join("|")===[norm(a),norm(b)].sort().join("|"));
   const hA=h2h.filter(m=>norm(m.winner)===norm(a)).length, hB=h2h.length-hA;
   const h5=h2h.filter(m=>m.sets.length===5);
   const form=(s,n) => {const d=n===10?s.last10:s.last5;return rate(d.wins,d.played)+" ("+d.played+"/"+n+"; "+(d.played<n?"MUESTRA INSUFICIENTE":"muestra completa")+"; racha "+(s.streak>0?s.streak+" V":s.streak<0?(-s.streak)+" D":"sin datos")+")";};
   const common=Object.keys(sa.opponents).filter(k=>Object.prototype.hasOwnProperty.call(sb.opponents,k));
   const commonText=common.map(k=>k+": "+pairs(a,b,rate(sa.opponents[k].wins,sa.opponents[k].played),rate(sb.opponents[k].wins,sb.opponents[k].played))).join("; ") || "SIN VERIFICAR";
   const favorite=norm(p.favorite)===norm(a)?a:norm(p.favorite)===norm(b)?b:null;
   let surprise="SIN VERIFICAR (favorito PTM no establecido)";
   let contradiction="SIN VERIFICAR (favorito PTM no establecido)";
   if(favorite) {
     const f=favorite===a?sa:sb, d=favorite===a?sb:sa;
     surprise=[f,d].every(s=>s.last10.played>=10&&s.last5.played>=5)?
       (d.last10.wins>f.last10.wins && d.last5.wins>f.last5.wins?"ALERTA: no favorito con mejor forma 10/5":"NO DETECTADA"):"MUESTRA INSUFICIENTE";
     if(h2h.length<3)contradiction="MUESTRA INSUFICIENTE";
     else {const fWins=favorite===a?hA:hB, dWins=favorite===a?hB:hA;
       contradiction=fWins>dWins&&h2h.slice(0,3).every(m=>norm(m.winner)!==norm(favorite))?
         "ALTO: favorito domina H2H observado pero perdió últimos 3":"NO DETECTADA";}
   }
   const recent=h2h.slice(0,10).map(m=>{
     const forward=norm(m.x)===norm(a);
     const pts=m.sets.map(s=>forward?s:s.slice().reverse());
     const score=forward?m.wins:m.wins.slice().reverse();
     return miamiDate(m.played)+" "+a+" "+score[0]+"-"+score[1]+" "+b+
       " ("+pts.map(s=>s.join(":")).join(", ")+") ganó "+m.winner+" ["+m.source+"]";
   }).join("; ") || "SIN VERIFICAR";
   const stats={
     h2h_historico:h2h.length?a+" "+hA+" - "+hB+" "+b+" ("+h2h.length+" observados)":"SIN VERIFICAR",
     h2h_reciente:recent,
     forma_ultimos_10:pairs(a,b,form(sa,10),form(sb,10)),
     forma_ultimos_5:pairs(a,b,form(sa,5),form(sb,5)),
     primer_set_conversion:pairs(a,b,rate(sa.first.wins,sa.first.played),rate(sb.first.wins,sb.first.played)),
     remontadas:pairs(a,b,rate(sa.comeback.wins,sa.comeback.played),rate(sb.comeback.wins,sb.comeback.played)),
     quinto_set_h2h:h5.length?pairs(a,b,rate(h5.filter(m=>norm(m.winner)===norm(a)).length,h5.length),rate(h5.filter(m=>norm(m.winner)===norm(b)).length,h5.length)):"SIN VERIFICAR",
     quinto_set_general:pairs(a,b,rate(sa.fifth.wins,sa.fifth.played),rate(sb.fifth.wins,sb.fifth.played)),
     rivales_comunes:commonText,
     fatiga_mismo_dia:rows.length?pairs(a,b,String(sa.sameDay)+" observados",String(sb.sameDay)+" observados")+" (muestra no exhaustiva)":"SIN VERIFICAR",
     alerta_sorpresa:surprise+" (observaciones NO autenticadas)",
     alerta_contradiccion_h2h:contradiction+" (observaciones NO autenticadas)",
     riesgo_remontada:pairs(a,b,rate(sa.comeback.wins,sa.comeback.played),rate(sb.comeback.wins,sb.comeback.played))+"; riesgo predictivo SIN VERIFICAR",
     cuotas_externas:"SIN VERIFICAR"
   };
   return {schema_version:"ptm-pregame-v1",player_a:a,player_b:b,scheduled_at_utc:p.scheduled_at_utc,
     statistics:stats,observed_rows:rows.length,cutoff_enforced:true,upstream_verified:false,
     research_elo:rawElo,
     model_probability_verified:false,decision:"DESCARTAR",amount_usd:0,provenance:prov};
 }
 root.PTMOnDemand=Object.freeze({analyze});
})(typeof globalThis!=="undefined"?globalThis:this);
