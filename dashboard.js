const $=id=>document.getElementById(id);
const fmt=s=>{const m=Math.round(s/60);return m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m}m`;};
chrome.runtime.sendMessage({type:"GET_STATS"},data=>{
 if(!data||data.error)return;
 const s=data.stats; $("date").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
 $("score").innerHTML=`${data.score}<small>/100</small>`;$("total").textContent=fmt(s.totalSeconds);
 $("switches").textContent=s.switches;$("cost").textContent=fmt(s.switches*15);
 $("scoreText").textContent=data.score>=75?"You're keeping a steady focus rhythm.":data.score>=45?"There is room to reduce interruptions.":"Try a short focus session and fewer tab changes.";
 $("productive").textContent=fmt(s.productiveSeconds);$("distracting").textContent=fmt(s.distractingSeconds);$("neutral").textContent=fmt(s.neutralSeconds);
 const total=Math.max(1,s.totalSeconds);
 $("productiveBar").style.width=`${s.productiveSeconds/total*100}%`;
 $("distractingBar").style.width=`${s.distractingSeconds/total*100}%`;
 $("neutralBar").style.width=`${s.neutralSeconds/total*100}%`;
 const sites=Object.entries(s.domains||{}).sort((a,b)=>b[1]-a[1]);
 const siteBox=$("sites");siteBox.replaceChildren();
 if(!sites.length){siteBox.innerHTML='<p class="empty">No browsing data yet. Browse a few websites first.</p>';}
 else sites.slice(0,8).forEach(([domain,seconds])=>{
   const row=document.createElement("div");row.className="site-row";
   const name=document.createElement("span");name.className="site-name";name.textContent=domain;
   const bar=document.createElement("div");bar.className="bar";const fill=document.createElement("i");
   fill.style.width=`${seconds/Math.max(1,sites[0][1])*100}%`;bar.append(fill);
   const time=document.createElement("b");time.textContent=fmt(seconds);row.append(name,bar,time);siteBox.append(row);
 });
 const timeline=$("timeline");timeline.replaceChildren();
 const hours=s.hourly||{};const max=Math.max(1,...Object.values(hours));
 for(let h=0;h<24;h++){const key=String(h).padStart(2,"0");const box=document.createElement("div");box.className="hour";
   const bar=document.createElement("i");bar.style.height=`${Math.max(2,(hours[key]||0)/max*88)}px`;
   const label=document.createElement("span");label.textContent=h%3===0?(h===0?"12a":h<12?`${h}a`:h===12?"12p":`${h-12}p`):"";
   box.append(bar,label);timeline.append(box);}
 const top=sites[0];
 $("insight").textContent=top?`Your most-visited site is ${top[0]} (${fmt(top[1])}). You switched tabs ${s.switches} times today. Consider grouping similar tasks into one focused session.`:"Your attention picture is just getting started. Browse normally and MindTrace will collect domain-level time.";
});