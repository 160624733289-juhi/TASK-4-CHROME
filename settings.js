const $=id=>document.getElementById(id);
chrome.runtime.sendMessage({type:"GET_SETTINGS"},s=>{
 $("goal").value=s.dailyGoalMinutes||120;
 $("productive").value=(s.productiveDomains||[]).join("\n");
 $("distracting").value=(s.distractingDomains||[]).join("\n");
 $("backend").value=s.backendUrl||"http://localhost:3000";
});
$("save").addEventListener("click",()=>{
 const domains=id=>$(id).value.split(/\r?\n/).map(x=>x.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/^www\./,"").split("/")[0]).filter(Boolean);
 const settings={dailyGoalMinutes:Math.max(15,Math.min(1440,Number($("goal").value)||120)),
 productiveDomains:domains("productive"),distractingDomains:domains("distracting"),
 backendUrl:$("backend").value.trim().replace(/\/$/,"")};
 chrome.runtime.sendMessage({type:"SAVE_SETTINGS",settings},()=>{$("message").textContent="Settings saved!";});
});