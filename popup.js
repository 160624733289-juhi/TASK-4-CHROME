const $=id=>document.getElementById(id);
function mins(seconds){const m=Math.floor(seconds/60);const h=Math.floor(m/60);return h?`${h}h ${m%60}m`:`${m}m`;}
function refresh(){chrome.runtime.sendMessage({type:"GET_STATS"},data=>{
 if(!data||data.error)return;
 $("score").textContent=data.score;
 $("total").textContent=mins(data.stats.totalSeconds);
 $("switches").textContent=data.stats.switches;
 $("productive").textContent=mins(data.stats.productiveSeconds);
 $("distracting").textContent=mins(data.stats.distractingSeconds);
 $("ring").style.background=`conic-gradient(#a69af5 ${data.score*3.6}deg,#ffffff20 0deg)`;
 $("score-note").textContent=data.score>=75?"Nice focus rhythm today!":data.score>=45?"A little more focus could help.":"Try one small distraction-free session.";
 const active=data.focus&&data.focus.active;
 $("focus-btn").textContent=active?"End focus session":"Start focus session";
 $("focus-status").textContent=active?`Focus sprint started on ${data.focus.startedOn}.`:"Stay with one task. You've got this.";
});}
$("focus-btn").addEventListener("click",()=>{
 chrome.runtime.sendMessage({type:$("focus-btn").textContent.startsWith("End")?"STOP_FOCUS":"START_FOCUS"},refresh);
});
refresh();