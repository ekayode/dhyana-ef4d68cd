/* Dhyana: screens, timing and audio.
   Practices: the seven chakras (content/days.json, one pool per weekday) plus the practices listed in content/practices.json,
   each described entirely by its own file in content/practices/. Recorded voice from audio/clips.json. */
const $=id=>document.getElementById(id);
let DATA=null, DAYS=[], SETTLE=10, todayIdx=0, CLIPS=null, PR={}, ORDER=[], pday=null, QUOTES=[];
let cur=0, segs=[], segI=-1, segElapsed=0, running=false, inSession=false, done=false, last=0, timer=null, wake=null, ctx=null, lastPhase=-1, tickAcc=0;
// mode: guided | silent. time: minutes chosen on Home per practice (0 = the practice's own length). defTime: the Settings default for every practice.
// goal: days per week. settle: seconds after Begin (null = the content default). theme: auto | light | dark.
const prefs={voice:true,tones:true,mode:"guided",practice:"chakras",time:{},defTime:0,goal:5,settle:null,theme:"auto"};
try{const p=JSON.parse(localStorage.getItem("sp-prefs")||"{}");Object.assign(prefs,p);delete prefs.len;prefs.time=prefs.time||{}}catch(e){}
document.documentElement.dataset.theme=prefs.theme==="auto"?"":prefs.theme;if(prefs.theme==="auto")delete document.documentElement.dataset.theme;
const canSpeak="speechSynthesis" in window;
const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const P=()=>PR[prefs.practice]||null; // the current practice file; null means the seven chakras

// The five steps of every chakra sit. All the teaching comes first; then a long silent meditation and a short seal.
// lines: [seconds into the step, ...keys] — the keys are spoken one after another from that point.
function SEGS(d){
  const T=DATA.timeline,G=DATA.guideSeconds||12;
  return [
   {key:"intention",name:"Intention",dur:T.intention,q:true,pre:`${DATA.common.arrive} ${d.say.today}`,read:d.ask,
    lines:[[2,"arrive","today","ask","hold_q"]]},
   {key:"breath",name:d.breath.name,dur:T.breath,read:d.breath.read,pattern:d.breath.pattern,guideUntil:T.breath-G,
    lines:[[0,"intro"],...(d.breath.lines||[]),[T.breath-G,"on_your_own"]]},
   {key:"pool",name:"The pool",dur:T.pool,read:d.say.pool.replace(/\.\.\./g,","),lines:[[1,"pool"]]},
   {key:"sit",name:"Meditation",dur:T.meditation,bell:true,flex:true,
    read:"Silence, with two brief check-ins from the guru, a third and two-thirds of the way through, on the breath, the pool and your question. When a thought pulls you away, notice it and return to the breath.",
    lines:[[3,"meditate"],...DATA.checkins.map((s,k)=>[s,"checkin_"+(k+1)])]},
   {key:"seal",name:"Seal",dur:T.seal,bell:true,read:d.seal,lines:[[3,"seal_intro","seal"]]}
  ];
}
// No guidance: straight into the meditation. A bell starts it, the guru's two check-ins are the only voice, three bells end it.
function SILENT(d){
  return [{key:"sit",name:"Meditation",dur:DATA.timeline.meditation,flex:true,lines:DATA.checkins.map((s,k)=>[s,"checkin_"+(k+1)]),q:true,read:d.ask,
    pre:"Silence. A bell begins the sit, the guru checks in briefly a third and two-thirds of the way through on the breath, the pool and this question, and three bells end it."}];
}
const LEDE={
  guided:"Take a minute with it. Once you press Begin, you won't need to look again. All the guidance comes first, in about two minutes: your intention, the breath, and the pool. Then ten minutes of quiet, where the guru checks in briefly every few minutes, and a short seal.",
  silent:"No guidance up front. Once you press Begin, you get ten seconds to settle, then the meditation starts straight away. Read the pool above and the question below first: the guru will check in on them twice."
};

/* ---------- steps, and fitting them to a chosen time ---------- */
// A step: dur in seconds. lines: [time, ...keys], time in seconds, negative (from the end) or "50%".
// every: {from, step, keys, endGap} adds check-ins at a steady interval, cycling through keys.
// flex: the step stretches or shrinks when a different time is chosen (true weighs it by its duration; a number is its weight).
// shrink: the step may get shorter for a short session, but never takes extra time.
// Only flexible steps change length; their check-ins and cues spread out in proportion, and the spoken guidance stays as it is.
const TIMES=[5,10,15,20,30,45,60,90,120]; // minutes offered besides each practice's default
function speechSecs(keys){return keys.reduce((a,k)=>{const m=CLIPS&&(k==="in"||k==="out"?null:CLIPS.clips[clipId(k)]);return a+(m&&m.dur||8)+GAP},0)}
// The shortest a flexible step can be: room for all its spoken cues plus a little quiet, and never shorter than its guided breathing.
function minDur(s){if(!s.dur)return 0;
  let m=Math.max(45,speechSecs((s.lines||[]).flatMap(l=>l.slice(1)))+20);
  if(s.guideUntil!=null)m=Math.max(m,s.guideUntil+20);return Math.min(m,s.dur)}
// Durations for each step so the session lasts target seconds, or null if it can't be that short.
function fitDurs(list,target){
  const base=list.map(s=>s.dur);if(!target)return base;
  const can=s=>s.flex||s.shrink,w=i=>list[i].flex===true?base[i]:(+list[i].flex||0),sum=a=>a.reduce((x,i)=>x+i,0);
  const flex=base.map((d,i)=>can(list[i])?i:-1).filter(i=>i>=0);if(!flex.length)return null;
  const mins=list.map(s=>can(s)?minDur(s):s.dur);
  const avail=target-sum(list.filter(s=>!can(s)).map(s=>s.dur)),fbase=sum(flex.map(i=>base[i])),fmin=sum(flex.map(i=>mins[i]));
  const W=sum(flex.map(w));
  if(avail<fmin||(avail>fbase&&!W))return null;
  const out=base.slice();
  if(avail>=fbase)flex.forEach(i=>out[i]=Math.round(base[i]+(avail-fbase)*w(i)/W));
  else{const room=fbase-fmin;flex.forEach(i=>out[i]=Math.round(base[i]-(fbase-avail)*(base[i]-mins[i])/room))}
  const big=flex.reduce((a,i)=>out[i]>out[a]?i:a,flex[0]);out[big]+=target-sum(out); // rounding, on the longest step
  return out;
}
function shape(list,target,fill=t=>t){
  const durs=(target&&fitDurs(list,target))||list.map(s=>s.dur);
  return list.map((s,i)=>{
    const dur=durs[i],r=s.dur?dur/s.dur:1,g=t=>t<0?dur+t:t;
    // Cues in a flexible step move with it, except the opening words and anything tied to the guided breathing.
    const at=t=>typeof t==="string"?Math.round(dur*parseFloat(t)/100):t<0?dur+t:(s.flex||s.shrink)&&t>5&&!(s.guideUntil!=null&&t<=s.guideUntil)?Math.round(t*r):t;
    const lines=(s.lines||[]).map(([t,...k])=>[at(t),...k]);
    if(s.every){const e=s.every,f=s.flex||s.shrink?r:1;for(let t=e.from*f,k=0;t<=dur-(e.endGap||60);t+=Math.max(60,e.step*f),k++)lines.push([Math.round(t),e.keys[k%e.keys.length]])}
    lines.sort((a,b)=>a[0]-b[0]);
    return {...s,dur,lines,name:fill(s.name),read:fill(s.read),
      guideUntil:s.guideUntil!=null?g(s.guideUntil):undefined,paceUntil:s.paceUntil!=null?g(s.paceUntil):undefined};
  }).filter(s=>s.dur>0);
}
const effTime=()=>{const t=prefs.time[prefs.practice];return t!=null?t:prefs.defTime||0}
const timeLabel=m=>m<60?`${m} min`:`${String(m/60).replace(".5","½")} hr`;
const hasSilent=()=>{const p=P();return p?!!p.silent:true};
const guided=()=>prefs.mode!=="silent"||!hasSilent();

// Progress through a practice's cycle: a log of sits per date. "Day" counts the days you have sat, so a missed day never resets it.
const progKey=p=>"sp-prog-"+p.id;
function progLoad(p){try{return JSON.parse(localStorage.getItem(progKey(p))||"{}")}catch(e){return {}}}
function progSave(p,s){try{localStorage.setItem(progKey(p),JSON.stringify(s))}catch(e){}}
function progress(p){
  const s=progLoad(p),id=p.cycles[s.cycle]?s.cycle:p.defaultCycle,c=p.cycles[id],log=s.log||{},today=log[dateKey()]||0;
  const sat=Object.keys(log).length,full=Object.values(log).filter(n=>n>=c.perDay).length,day=sat+(today?0:1);
  const complete=full>=c.days;
  const status=c.perDay>1?` · ${Math.min(today,c.perDay)} of ${c.perDay} sits today`:today?" · done today":"";
  return {id,c,day,today,complete,full,dayIndex:p.days?(day-1)%p.days.length:null,
    label:complete?`Cycle complete · ${c.days} days`:`Day ${Math.min(day,c.days)} of ${c.days}${status}`,
    short:complete?"Cycle complete":`Day ${Math.min(day,c.days)} of ${c.days}`};
}
function logSit(p){const s=progLoad(p),k=dateKey();s.cycle=s.cycle||p.defaultCycle;s.log=s.log||{};s.log[k]=(s.log[k]||0)+1;progSave(p,s)}

const minLabel=s=>{const m=s/60;if(m>=59.5){const h=Math.floor((m+.5)/60),r=Math.round(m-h*60);return r>0?`${h} hr ${r} min`:`${h} hr`}
  return (Number.isInteger(m)?m:Math.floor(m)+(m%1>=.5?"½":""))+" min"};
function dateKey(){const n=new Date();return n.getFullYear()+"-"+(n.getMonth()+1)+"-"+n.getDate()}
/* ---------- history: every finished sit, for the calendar and streak ---------- */
// sp-hist: {"2026-10-30": [["kriya", 15], ["chakras", 12.5]]} — practice id and minutes (null for sits logged before minutes were kept).
const keyOf=d=>d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
function histLoad(){try{const h=localStorage.getItem("sp-hist");if(h)return JSON.parse(h)}catch(e){return {}}
  // First run: rebuild from the older per-day counts and per-practice logs.
  const h={};try{
    for(const k of Object.keys(localStorage)){
      let m=k.match(/^sp-prog-(.+)$/);if(m){const log=(JSON.parse(localStorage.getItem(k))||{}).log||{};
        for(const [d,n] of Object.entries(log))for(let i=0;i<n;i++)(h[d]=h[d]||[]).push([m[1],null])}}
    for(const k of Object.keys(localStorage)){const m=k.match(/^sp-(\d{4}-\d{1,2}-\d{1,2})$/);if(!m)continue;
      const extra=(+localStorage.getItem(k)||0)-(h[m[1]]||[]).length;for(let i=0;i<extra;i++)(h[m[1]]=h[m[1]]||[]).push(["chakras",null])}
    localStorage.setItem("sp-hist",JSON.stringify(h))}catch(e){}
  return h}
function histAdd(id,mins){const h=histLoad(),k=dateKey();(h[k]=h[k]||[]).push([id,mins]);try{localStorage.setItem("sp-hist",JSON.stringify(h))}catch(e){}}
function streak(h=histLoad()){const d=new Date();if(!h[keyOf(d)])d.setDate(d.getDate()-1);let n=0;while(h[keyOf(d)]){n++;d.setDate(d.getDate()-1)}return n}
const pColor=id=>id==="chakras"?"#c2413a":(PR[id]&&PR[id].c)||"#888";
const pName=id=>id==="chakras"?"Seven chakras":(PR[id]&&PR[id].name)||id;
function readCount(){return (histLoad()[dateKey()]||[]).length}
// Days with a sit this week, Monday to today.
function weekDays(h=histLoad()){const d=new Date(),back=(d.getDay()+6)%7;let n=0;for(let i=0;i<=back;i++){const x=new Date(d);x.setDate(d.getDate()-i);if(h[keyOf(x)])n++}return n}
function showCount(){const h=histLoad(),st=streak(h),wk=weekDays(h),parts=[];
  if(st>1)parts.push(`${st}-day streak`);if(prefs.goal)parts.push(`${Math.min(wk,prefs.goal)} of ${prefs.goal} this week`);
  else if(readCount())parts.push(`${readCount()} today`);
  $("count").textContent=parts.join(" · ")}

let calMonth=new Date();calMonth.setDate(1);let calSel=null;
function renderCal(){
  const h=histLoad(),y=calMonth.getFullYear(),m=calMonth.getMonth(),today=dateKey();
  $("calTitle").textContent=calMonth.toLocaleDateString(undefined,{month:"long",year:"numeric"});
  const first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();let cells="",sits=0,mins=0,sat=0;
  for(let i=0;i<first;i++)cells+=`<span></span>`;
  for(let d=1;d<=days;d++){const k=`${y}-${m+1}-${d}`,list=h[k]||[];
    if(list.length){sat++;sits+=list.length;mins+=list.reduce((a,e)=>a+(e[1]||0),0)}
    const dots=list.slice(0,3).map(e=>`<i style="background:${pColor(e[0])}"></i>`).join("");
    cells+=`<button class="cday${list.length?" sat":""}${k===today?" now":""}${k===calSel?" sel":""}" data-k="${k}" style="--c:${list.length?pColor(list[0][0]):"transparent"}" aria-label="${d}${list.length?`, ${list.length} sit${list.length>1?"s":""}`:""}">${d}<b>${dots}</b></button>`}
  $("calGrid").innerHTML=cells;
  const wk=weekDays(h),g=prefs.goal;
  $("calStats").innerHTML=`<div><b>${streak(h)}</b><small>day streak</small></div><div><b>${sat}</b><small>days this month</small></div><div><b>${Math.round(mins)}</b><small>minutes this month</small></div>`;
  $("goalWrap").hidden=!g;if(g){$("goalBar").style.width=Math.min(100,wk/g*100)+"%";
    $("goalNote").textContent=wk>=g?`Weekly goal met: ${wk} of ${g} days. Lovely.`:`This week: ${wk} of ${g} days. ${g-wk} to go.`}
  const sel=calSel&&h[calSel];
  $("calDay").textContent=sel?`${new Date(calSel.replace(/-/g,"/")).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}: ${sel.map(e=>pName(e[0])+(e[1]?` · ${minLabel(e[1]*60)}`:"")).join(", ")}`:
    sits?"Tap a day to see what you practised.":"Days you sit will light up here.";
}
// "Share my week": a short summary to send to a friend, through the phone's own share sheet.
function weekSummary(){const h=histLoad(),d=new Date(),lines=[];let days=0,mins=0;
  for(let i=6;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-i);const l=h[keyOf(x)]||[];if(l.length)days++;mins+=l.reduce((a,e)=>a+(e[1]||0),0);
    lines.push(`${x.toLocaleDateString(undefined,{weekday:"short"})} ${l.length?"●":"○"}`)}
  return `My meditation week: ${days} of 7 days, ${Math.round(mins)} minutes, ${streak(h)}-day streak.\n${lines.join("  ")}\nSit with me: ${location.origin+location.pathname}`}
function greet(){const h=new Date().getHours();$("hello").textContent=h<5?"Good night":h<12?"Good morning":h<18?"Good afternoon":"Good evening"}
function savePrefs(){try{localStorage.setItem("sp-prefs",JSON.stringify(prefs))}catch(e){}}
function syncToggles(){const can=!!CLIPS||canSpeak;$("tVoice").setAttribute("aria-pressed",prefs.voice&&can);$("tTones").setAttribute("aria-pressed",prefs.tones);
  if(!can){$("tVoice").disabled=true;$("voiceNote").textContent="Voice guidance isn't available on this device. You'll get bells and breath tones only."}}
const fmtDur=s=>s<60?`${s} sec`:s>=3600?minLabel(s):s%60?`${Math.floor(s/60)} min ${s%60} sec`:`${s/60} min`;
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);

/* ---------- screens ---------- */
function renderPractices(){
  const all=[{id:"chakras",name:"Seven chakras",sub:"A pool for each weekday",c:"#c2413a"},...ORDER.map(id=>PR[id])];
  $("practices").innerHTML=all.map(p=>`<button class="prac" style="--c:${p.c}" data-id="${p.id}" aria-pressed="${prefs.practice===p.id}"><span>${esc(p.name)}</span><small>${esc(p.sub)}</small></button>`).join("");
}
function renderDays(){
  $("days").innerHTML=DAYS.map((d,i)=>`<button class="day${i===todayIdx?" today":""}" style="--c:${d.c}" aria-pressed="${i===cur}" data-i="${i}"><small>${d.short}</small><i class="dot"></i><span>${d.el}</span></button>`).join("");
}
const facts=rows=>$("facts").innerHTML=rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
function selectDay(i){cur=i;render()}
function render(){
  const p=P();
  $("days").hidden=!!p;$("cycle").hidden=!p;$("progWrap").hidden=!p;
  document.querySelectorAll("[data-only]").forEach(el=>el.hidden=el.dataset.only!==(p?"other":"chakras"));
  renderPractices();
  let rawFull,rawQuiet,lede,fill;
  if(p){
    const pr=progress(p);pday=pr.dayIndex;const day=pday!=null?p.days[pday]:null;
    document.documentElement.style.setProperty("--chakra",p.c);
    $("poolEyebrow").textContent=pr.label;
    $("poolTitle").innerHTML=p.title;$("heroSub").textContent=day?`${p.tagline||p.sub} · today, ${day.label.toLowerCase()}`:p.sub;
    $("progBar").style.width=Math.min(100,pr.full/pr.c.days*100)+"%";$("progNote").textContent=`${pr.full} of ${pr.c.days} days · ${pr.c.label.split(" · ")[1]||pr.c.label}`;
    facts(p.facts);$("release").textContent=(day&&day.release)||p.release;
    $("teach").innerHTML=`<b>Guidelines</b><ul>${p.guidelines.map(g=>`<li>${g}</li>`).join("")}</ul>`;
    $("cycleChips").innerHTML=Object.entries(p.cycles).map(([id,c])=>`<button data-cycle="${id}" aria-pressed="${pr.id===id}">${esc(c.label.replace(" · ",", "))}</button>`).join("");
    $("cycleNote").textContent=p.cycleNote||"The day count goes up each day you sit; a missed day doesn't reset it.";
    rawFull=p.guided;rawQuiet=p.silent;lede=p.lede;
    fill=t=>t&&t.replace(/\{(\w+)\}/g,(m,k)=>day&&day[k]!=null?day[k]:m);
  }else{
    pday=null;const d=DAYS[cur];document.documentElement.style.setProperty("--chakra",d.c);renderDays();
    $("poolEyebrow").textContent=`${cur===todayIdx?"Today · ":""}${d.short}`;
    $("poolTitle").innerHTML=`The <em>${d.el}</em> pool`;$("heroSub").textContent=`${d.skt} · ${d.where}`;
    facts([["Where",d.where],["Deals with",d.deals],["Blocked by",d.block],["Silent sound",d.bija]]);
    $("release").textContent=d.release;
    $("teach").innerHTML=`<b>If you teach this</b>${d.teach}`;
    rawFull=SEGS(d);rawQuiet=SILENT(d);lede=LEDE;
  }
  // The chosen time applies to both modes where it fits; otherwise that mode uses its default.
  const want=effTime()*60,fit=list=>shape(list,want&&fitDurs(list,want)?want:0,fill);
  const full=fit(rawFull),quiet=rawQuiet?fit(rawQuiet):null,act=guided()?rawFull:rawQuiet;
  const def=act.reduce((a,s)=>a+s.dur,0),sel=want&&fitDurs(act,want)?want/60:0;
  $("timeChips").innerHTML=[`<button data-time="0" aria-pressed="${!sel}">Default · ${minLabel(def)}</button>`,
    ...TIMES.filter(m=>Math.abs(m*60-def)>=90&&fitDurs(act,m*60)).map(m=>`<button data-time="${m}" aria-pressed="${sel===m}">${timeLabel(m)}</button>`)].join("");
  const tc=$("timeChips"),on=tc.querySelector('[aria-pressed="true"]');if(on)tc.scrollLeft=Math.max(0,on.offsetLeft-tc.clientWidth/2+on.offsetWidth/2); // keep the chosen time in view
  segs=guided()?full:quiet;done=false;drawClock();
  $("mGuided").setAttribute("aria-pressed",guided());$("mSilent").setAttribute("aria-pressed",!guided());
  $("mGuided").textContent=`Guided · ${minLabel(full.reduce((a,s)=>a+s.dur,0))}`;
  $("modeRow").hidden=!quiet;if(quiet)$("mSilent").textContent=`No guidance · ${minLabel(quiet.reduce((a,s)=>a+s.dur,0))}`;
  $("lede").textContent=guided()?lede.guided:lede.silent;$("begin").textContent=`Begin · ${minLabel(total())}`;
  $("flowMeta").textContent=`${segs.length} step${segs.length>1?"s":""} · ${minLabel(total())}`;
  $("steps").innerHTML=segs.map((s,k)=>`<li><span class="n">${k+1}</span><span class="t">${esc(s.name)}</span><span class="m">${fmtDur(s.dur)}</span>${s.q?`<span class="d">${s.pre}</span><span class="q">“${s.read}”</span><span class="hear">Hold it lightly as your intention for the sit.</span>`:`<span class="d">${s.read}</span>`}</li>`).join("");
}

/* ---------- countdown ---------- */
const RING=339.29; // circumference of the r=54 ring
const fmt=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const total=()=>segs.reduce((a,s)=>a+s.dur,0);
function timeLeft(){if(!inSession)return done?0:total();if(segI<0)return total();
  let r=segs[segI].dur-segElapsed;for(let k=segI+1;k<segs.length;k++)r+=segs[k].dur;return r}
function drawClock(){
  const l=timeLeft(),t=fmt(l);let now;
  if(!inSession)now=done?(P()?P().doneText:"Complete. Carry the seal with you."):`Ready · ${segs.length} step${segs.length>1?"s":""}`;
  else if(segI<0)now=`Settling · starts in ${fmt(SETTLE-segElapsed)}`;
  else now=`${segs[segI].name} · ${fmt(segs[segI].dur-segElapsed)} left`;
  const sub=inSession&&segI>=0?`Step ${segI+1} of ${segs.length} · ${now}`:now;
  if($("clockTime").textContent!==t){$("clockTime").textContent=t;$("sitClock").textContent=t}
  if($("clockSub").textContent!==sub)$("clockSub").textContent=sub;
  if($("sitSub").textContent!==now)$("sitSub").textContent=now;
  const off=RING*(1-l/total());$("ringProg").style.strokeDashoffset=off;$("sitRing").style.strokeDashoffset=off;
}

/* ---------- audio: bells and tones ---------- */
// "playback" lets Safari play through the silent switch (iOS 17+).
try{if(navigator.audioSession)navigator.audioSession.type="playback"}catch(e){}
function ac(){try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state!=="running")ctx.resume()}catch(e){}return ctx}
// After the phone locks or the app is left, iOS can leave the audio context "interrupted" and silent.
// Called from a tap (Resume), so a fresh context is allowed to start; decoded recordings work in it as-is.
function wakeAudio(){try{if(ctx&&ctx.state!=="running"){ctx.close().catch(()=>{});ctx=null}}catch(e){ctx=null}return ac()}
function bell(n=1,delay=0){const c=ac();if(!c)return;
  for(let r=0;r<n;r++){const t0=c.currentTime+delay+r*1.6;
    [[220,.2],[330,.08],[607,.05]].forEach(([f,v])=>{const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=f;
      g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(v,t0+.02);g.gain.exponentialRampToValueAtTime(.0001,t0+4.5);
      o.connect(g).connect(c.destination);o.start(t0);o.stop(t0+4.6)})}}
function tone(type,dur){ // inhale rises, exhale falls; holds are silent
  if(!prefs.tones)return;const c=ac();if(!c)return;const t0=c.currentTime;
  if(type==="tick"){const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=520;g.gain.setValueAtTime(.05,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+.12);o.connect(g).connect(c.destination);o.start(t0);o.stop(t0+.15);return}
  if(type!=="in"&&type!=="out")return;
  const o=c.createOscillator(),g=c.createGain();o.type="sine";
  const lo=174,hi=261;o.frequency.setValueAtTime(type==="in"?lo:hi,t0);o.frequency.linearRampToValueAtTime(type==="in"?hi:lo,t0+dur);
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.05,t0+.4);g.gain.setValueAtTime(.05,t0+dur-.5);g.gain.linearRampToValueAtTime(0,t0+dur);
  o.connect(g).connect(c.destination);o.start(t0);o.stop(t0+dur+.05)}

/* ---------- audio: the voice ---------- */
// Each spoken line is a recording (audio/<id>.mp3). Until recordings exist, the device's own voice reads the same text.
// Ids: common-<key>, <weekday>-<key> for the chakras, <practice>-<key>, and <practice>-d<n>-<key> for a day of a practice's cycle.
const GAP=1.8; // seconds of quiet between consecutive lines
const buffers={}, voiceQ=[];
let speaking=false, gapTimer=null, curSrc=null, rot={in:0,out:0};
function clipId(key,d=DAYS[cur]){
  const p=P();
  if(p){const day=pday!=null&&p.days[pday].say;
    if(day&&day[key]!=null)return `${p.id}-d${pday+1}-${key}`;return p.say[key]!=null?`${p.id}-${key}`:"common-"+key}
  if(key==="in"||key==="out"){const k=`${key}_${"abc"[rot[key]++%3]}`;return "common-"+k}
  return d.say[key]!=null?`${d.short.toLowerCase()}-${key}`:"common-"+key}
function clipText(id){const [pfx,...rest]=id.split("-"),key=rest.join("-");
  if(pfx==="common")return DATA.common[key];
  const p=PR[pfx];if(p){const m=key.match(/^d(\d+)-(.+)$/);return m?p.days[m[1]-1].say[m[2]]:p.say[key]}
  const d=DAYS.find(x=>x.short.toLowerCase()===pfx);return d&&d.say[key]}
function sessionClipIds(){const common=Object.keys(DATA.common).map(k=>"common-"+k),p=P();
  if(!p){const d=DAYS[cur];return [...common,...Object.keys(d.say).map(k=>`${d.short.toLowerCase()}-${k}`)]}
  return [...common,...Object.keys(p.say).map(k=>`${p.id}-${k}`),...(pday!=null?Object.keys(p.days[pday].say||{}).map(k=>`${p.id}-d${pday+1}-${k}`):[])]}
function loadClips(ids){if(!CLIPS)return;const c=ac();if(!c)return;
  ids.forEach(id=>{const meta=CLIPS.clips[id];if(!meta||buffers[id])return;buffers[id]="loading";
    fetch("audio/"+meta.file).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(b=>c.decodeAudioData(b)).then(buf=>buffers[id]=buf).catch(()=>{delete buffers[id]})})}
let deviceVoice=null;
function pickVoice(){if(!canSpeak)return;const vs=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));
  deviceVoice=vs.find(v=>/Samantha|Daniel|Google UK English Male|Karen|Moira|Serena/i.test(v.name))||vs[0]||null}
if(canSpeak){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
function playClip(id,doneFn){
  doneFn=doneFn||(()=>{});
  if(!prefs.voice){doneFn();return}
  const buf=buffers[id];
  if(buf&&buf!=="loading"){const c=ac(),s=c.createBufferSource(),g=c.createGain();g.gain.value=1;s.buffer=buf;s.connect(g).connect(c.destination);
    // If the audio is stalled, onended never fires; the timeout keeps one stuck line from silencing the rest.
    let fired=false;const fin=()=>{if(!fired&&curSrc===s){fired=true;curSrc=null;doneFn()}};
    curSrc=s;s.onended=fin;s.start();setTimeout(fin,(buf.duration+2)*1000);return}
  const text=clipText(id);
  if(!canSpeak||!text){doneFn();return}
  try{let fired=false;const fin=()=>{if(!fired){fired=true;doneFn()}};
    const u=new SpeechSynthesisUtterance(text.replace(/\.\.\./g,","));if(deviceVoice)u.voice=deviceVoice;u.rate=.8;u.pitch=.95;u.onend=fin;
    speechSynthesis.speak(u);setTimeout(fin,text.length*85+2500)} // onend can fail to fire on iOS
  catch(e){doneFn()}
}
let curLine=null, heldLines=[]; // the line being spoken, and lines kept aside while paused
function speak(ids){voiceQ.push(...ids);if(!speaking)nextLine()}
function nextLine(){
  const id=voiceQ.shift();
  if(!id){speaking=false;onVoiceIdle();return}
  speaking=true;curLine=id;playClip(id,()=>{curLine=null;gapTimer=setTimeout(nextLine,GAP*1000)});
}
// Pausing keeps the interrupted line and everything queued after it, so Resume can pick up where the guru left off.
function holdVoice(){heldLines=[...(curLine?[curLine]:[]),...voiceQ];stopVoice()}
function stopVoice(){voiceQ.length=0;clearTimeout(gapTimer);speaking=false;curLine=null;
  if(curSrc){const s=curSrc;curSrc=null;try{s.stop()}catch(e){}}try{speechSynthesis.cancel()}catch(e){}}
// Breath pacing waits for the breath's spoken introduction to finish.
function onVoiceIdle(){const seg=segs[segI];if(seg&&seg.pattern&&seg.paceFrom==null&&running)seg.paceFrom=segElapsed+.5}

/* ---------- session ---------- */
function keepAwake(){try{navigator.wakeLock&&navigator.wakeLock.request("screen").then(w=>wake=w).catch(()=>{})}catch(e){}}
function phaseIdx(seg,t){const len=seg.pattern.reduce((a,p)=>a+p[1],0);let x=t%len,k=0,cyc=Math.floor(t/len);
  for(;k<seg.pattern.length;k++){if(x<seg.pattern[k][1])break;x-=seg.pattern[k][1]}return cyc*100+k}
function enterSeg(i){segI=i;segElapsed=0;lastPhase=-1;tickAcc=0;rot={in:0,out:0};
  const s=segs[i];s.fired=0;s.paceFrom=null;
  if(s.bell)bell(1);$("sitStep").textContent=segs.length>1?`Step ${i+1} of ${segs.length}`:s.name}
function begin(){
  wakeAudio();loadClips(sessionClipIds());stopVoice();heldLines=[];
  $("sit").hidden=false;$("sitLive").hidden=false;$("paused").hidden=true;$("sitStep").textContent="Settling";
  segI=-1;segElapsed=0;inSession=true;done=false;run();keepAwake();drawClock();
  if(guided())setTimeout(()=>{if(running&&segI<0)speak(["common-settle"])},600);
}
function run(){running=true;last=performance.now();clearInterval(timer);timer=setInterval(()=>{tick();drawClock()},100)}
function tick(){
  const now=performance.now(),dt=Math.min((now-last)/1000,1);last=now;segElapsed+=dt;
  if(segI===-1){if(segElapsed>=SETTLE){bell(1);enterSeg(0)}return}
  const seg=segs[segI];
  if(segElapsed>=seg.dur){if(segI<segs.length-1){enterSeg(segI+1)}else{finish()}return}
  // Spoken lines scheduled for this step.
  while(seg.fired<seg.lines.length&&segElapsed>=seg.lines[seg.fired][0]){
    const [,...keys]=seg.lines[seg.fired++];speak(keys.map(k=>clipId(k)))}
  // Breath pacing: a tone and a soft spoken cue at each phase, until paceUntil if the step sets one.
  if(seg.pattern&&(seg.paceUntil==null||segElapsed<seg.paceUntil)){
    if(seg.paceFrom==null&&segElapsed>25)seg.paceFrom=segElapsed; // in case the introduction never reports finishing
    if(seg.paceFrom!=null&&segElapsed>=seg.paceFrom){
      const pi=phaseIdx(seg,segElapsed-seg.paceFrom),p=seg.pattern[pi%100];
      if(pi!==lastPhase){lastPhase=pi;tone(p[0],p[1]);if(!speaking&&segElapsed<seg.guideUntil)playClip(clipId(p[2]))}
      if(p[0]==="pump"){tickAcc+=dt;if(tickAcc>=.9){tickAcc=0;tone("tick")}}
    }
  }
}
function finish(){stop();stopVoice();inSession=false;bell(3);if(guided())setTimeout(()=>playClip(clipId("complete")),4200);
  histAdd(prefs.practice,Math.round(total()/30)/2);showCount();
  const p=P();if(p){logSit(p);render()}done=true;drawClock();
  setTimeout(()=>{$("sit").hidden=true},7500)}
function stop(){running=false;clearInterval(timer);timer=null;try{wake&&wake.release()}catch(e){}wake=null}
function pause(why){if(!running)return;stop();holdVoice();$("sitLive").hidden=true;$("paused").hidden=false;
  const s=segI<0?"settling":`step ${segI+1}, ${segs[segI].name}`;$("pausedNote").textContent=(why||"Paused")+` during ${s}`}

$("begin").onclick=begin;
$("sit").onclick=e=>{if(e.target.closest("#paused"))return;pause()};
$("resume").onclick=()=>{wakeAudio();$("paused").hidden=true;$("sitLive").hidden=false;run();keepAwake();
  const held=heldLines;heldLines=[];if(held.length)setTimeout(()=>{if(running)speak(held)},800)};
$("end").onclick=()=>{stop();stopVoice();heldLines=[];inSession=false;drawClock();$("sit").hidden=true};
$("tVoice").onclick=()=>{prefs.voice=!prefs.voice;savePrefs();syncToggles()};
$("tTones").onclick=()=>{prefs.tones=!prefs.tones;savePrefs();syncToggles()};
$("test").onclick=()=>{ac();loadClips(["common-test"]);bell(1);setTimeout(()=>tone("in",3),600);setTimeout(()=>tone("out",3),3700);
  setTimeout(()=>{stopVoice();speak(["common-test"])},900)};
$("days").onclick=e=>{const b=e.target.closest(".day");if(b)selectDay(+b.dataset.i)};
$("practices").onclick=e=>{const b=e.target.closest(".prac");if(!b)return;prefs.practice=b.dataset.id;savePrefs();
  if(prefs.practice==="chakras")cur=todayIdx;render()};
$("cycleChips").onclick=e=>{const p=P(),b=e.target.closest("[data-cycle]");if(!p||!b)return;const s=progLoad(p);s.cycle=b.dataset.cycle;progSave(p,s);render()};
$("restart").onclick=()=>{const p=P();if(!p||!confirm(`Start ${p.name} over from day 1? Your sits so far will be cleared.`))return;
  const s=progLoad(p);s.log={};progSave(p,s);render()};
$("timeChips").onclick=e=>{const b=e.target.closest("[data-time]");if(!b)return;prefs.time[prefs.practice]=+b.dataset.time;savePrefs();render()};
$("calPrev").onclick=()=>{calMonth.setMonth(calMonth.getMonth()-1);renderCal()};
$("calNext").onclick=()=>{calMonth.setMonth(calMonth.getMonth()+1);renderCal()};
$("calGrid").onclick=e=>{const b=e.target.closest(".cday");if(b){calSel=b.dataset.k;renderCal()}};
$("shareWeek").onclick=async()=>{const text=weekSummary();
  try{if(navigator.share){await navigator.share({text});return}}catch(e){if(e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text);$("shareWeek").textContent="Copied. Paste it to a friend";setTimeout(()=>$("shareWeek").textContent="Share my week",2500)}catch(e){}};
/* ---------- pages: Home, Today, Calendar, Settings ---------- */
const PAGES={home:"pHome",today:"pToday",calendar:"pCal",settings:"pSettings"};
function go(name){if(!PAGES[name])name="home";
  for(const [k,id] of Object.entries(PAGES))$(id).hidden=k!==name;
  document.querySelectorAll(".tabs button").forEach(b=>b.dataset.go===name?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current"));
  document.body.dataset.page=name;
  if(name==="today")renderQuote();
  if(name==="calendar"){calMonth=new Date();calMonth.setDate(1);calSel=null;renderCal()}
  if(name==="settings")renderSettings();
  if(name==="home")render();
  try{history.replaceState(null,"",name==="home"?location.pathname:"#"+name)}catch(e){}
  scrollTo(0,0)}
document.querySelector(".tabs").onclick=e=>{const b=e.target.closest("[data-go]");if(b)go(b.dataset.go)};

// Today: one quote and intention per day, the same for everyone on that date.
const THEME_C={Mindfulness:"#2f8f83",Courage:"#d0782a",Devotion:"#c25a86",Motivation:"#c2413a",Wisdom:"#5b54c9",Patience:"#3f7fb5",Surrender:"#4f7f9f",Compassion:"#c25a86",Gratitude:"#a8772f",Discipline:"#6a6f7a"};
let qOff=0; // days from today while browsing
function quoteFor(date){if(!QUOTES.length)return null;const n=Math.floor((Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()))/864e5);
  return QUOTES[((n*37)%QUOTES.length+QUOTES.length)%QUOTES.length]} // 37 is coprime with the list length, so themes interleave
function renderQuote(){const d=new Date();d.setDate(d.getDate()+qOff);const q=quoteFor(d);if(!q)return;
  $("qDate").textContent=qOff===0?d.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"}):
    `${qOff<0?"Earlier":"Coming up"} · ${d.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}`;
  $("pToday").querySelector("h1").textContent=qOff===0?"Today":qOff===-1?"Yesterday":qOff===1?"Tomorrow":d.toLocaleDateString(undefined,{weekday:"long"});
  $("pToday").style.setProperty("--q",THEME_C[q.theme]||"var(--chakra)");
  $("qTheme").textContent=q.theme;$("qText").textContent=q.quote;$("qBy").textContent=q.by;$("qIntent").textContent=q.intention;}
$("qPrev").onclick=()=>{qOff--;renderQuote()};
$("qNext").onclick=()=>{qOff++;renderQuote()};
$("qSit").onclick=()=>{qOff=0;go("home")};
$("qShare").onclick=async()=>{const d=new Date();d.setDate(d.getDate()+qOff);const q=quoteFor(d);if(!q)return;
  const text=`“${q.quote}” — ${q.by}\n\nIntention: ${q.intention}`;
  try{if(navigator.share){await navigator.share({text});return}}catch(e){if(e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text);$("qShare").textContent="Copied";setTimeout(()=>$("qShare").textContent="Share",2000)}catch(e){}};

// Settings: defaults for every practice.
const SETTLES=[5,10,20,30],GOALS=[0,1,2,3,4,5,6,7];
function applyTheme(){const r=document.documentElement;if(prefs.theme==="auto")delete r.dataset.theme;else r.dataset.theme=prefs.theme}
function renderSettings(){
  $("setTime").innerHTML=[`<button data-time="0" aria-pressed="${!prefs.defTime}">Each practice's own</button>`,
    ...TIMES.map(m=>`<button data-time="${m}" aria-pressed="${prefs.defTime===m}">${timeLabel(m)}</button>`)].join("");
  const tc=$("setTime"),on=tc.querySelector('[aria-pressed="true"]');if(on)tc.scrollLeft=Math.max(0,on.offsetLeft-tc.clientWidth/2+on.offsetWidth/2);
  $("sGuided").setAttribute("aria-pressed",prefs.mode!=="silent");$("sSilent").setAttribute("aria-pressed",prefs.mode==="silent");
  $("setSettle").innerHTML=SETTLES.map(n=>`<button data-settle="${n}" aria-pressed="${SETTLE===n}">${n} sec</button>`).join("");
  $("setGoal").innerHTML=GOALS.map(n=>`<button data-goal="${n}" aria-pressed="${prefs.goal===n}">${n||"Off"}</button>`).join("");
  $("setGoalNote").textContent=prefs.goal?`${prefs.goal} day${prefs.goal>1?"s":""} a week. Your progress shows on Home and in Calendar.`:"No weekly goal. Home shows your streak.";
  document.querySelectorAll("#setTheme button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.theme===prefs.theme));
}
$("setTime").onclick=e=>{const b=e.target.closest("[data-time]");if(!b)return;prefs.defTime=+b.dataset.time;prefs.time={};savePrefs();renderSettings()}; // a new default applies everywhere
$("sGuided").onclick=()=>{prefs.mode="guided";savePrefs();renderSettings()};
$("sSilent").onclick=()=>{prefs.mode="silent";savePrefs();renderSettings()};
$("setSettle").onclick=e=>{const b=e.target.closest("[data-settle]");if(!b)return;prefs.settle=SETTLE=+b.dataset.settle;savePrefs();renderSettings()};
$("setGoal").onclick=e=>{const b=e.target.closest("[data-goal]");if(!b)return;prefs.goal=+b.dataset.goal;savePrefs();renderSettings();showCount()};
$("setTheme").onclick=e=>{const b=e.target.closest("[data-theme]");if(!b)return;prefs.theme=b.dataset.theme;savePrefs();applyTheme();renderSettings()};
$("clearHist").onclick=()=>{if(!confirm("Clear your practice history? Your calendar, streak and cycle days start again from zero."))return;
  try{for(const k of Object.keys(localStorage))if(/^sp-(hist|prog-|\d)/.test(k))localStorage.removeItem(k);localStorage.setItem("sp-hist","{}")}catch(e){}
  showCount();alert("History cleared.")};
const setMode=m=>{prefs.mode=m;savePrefs();render()};
$("mGuided").onclick=()=>setMode("guided");
$("mSilent").onclick=()=>setMode("silent");
// Timers stop when the phone locks, so pause cleanly instead of skipping ahead.
document.addEventListener("visibilitychange",()=>{if(document.hidden&&running)pause("Paused (screen locked or app left)")});

const getJSON=u=>fetch(u).then(r=>r.json());
Promise.all([
  getJSON("content/days.json"),
  getJSON("content/daily.json").catch(()=>[]),
  getJSON("content/practices.json").then(ids=>Promise.all(ids.map(id=>getJSON(`content/practices/${id}.json`).then(p=>({...p,id}))))).catch(()=>[]),
  fetch("audio/clips.json").then(r=>r.ok?r.json():null).catch(()=>null)
]).then(([data,daily,practices,clips])=>{
  DATA=data;DAYS=data.days;SETTLE=prefs.settle||data.settleSeconds||10;QUOTES=daily;CLIPS=clips&&clips.clips?clips:null;
  practices.forEach(p=>PR[p.id]=p);ORDER=practices.map(p=>p.id);
  if(prefs.practice!=="chakras"&&!PR[prefs.practice])prefs.practice="chakras";
  todayIdx=DAYS.findIndex(d=>d.dow===new Date().getDay());cur=todayIdx;
  greet();showCount();syncToggles();go((location.hash||"").slice(1));
});

if(!standalone&&/iPhone|iPad|iPod/.test(navigator.userAgent))$("install").classList.add("show");
if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
