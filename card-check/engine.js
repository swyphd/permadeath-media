// Card Check's rules engine: the data tables and every rule, with no page in
// sight, so the page, the tutorial, the tests and the bots all play the same game.
// Each function takes the game state `g` and changes it in place; player actions
// return an error string, or null when they went through.
//
// Every shuffle draws from the studio kit's seeded rng, so a seed deals the same
// game everywhere (an online table's devices, a replayed test).
import { createRng } from '../kit/rng.js';

const DEPTS={Eng:["Engineering","var(--eng)"],Art:["Art","var(--art)"],QA:["QA","var(--qa)"],Prod:["Production","var(--prod)"]};
const DISP=["Hostile","Undecided","Leaning","Signed","Steward"];
const W=[
[1,"Priya",1,"Eng","Senior gameplay engineer",2,["Crunch","Credit"],2],
[2,"Marcus",1,"Eng","Backend lead",2,["Pay"],1],
[3,"Dev",0,"Eng","Junior engineer",1,["Pay","Crunch"],2],
[4,"Tomasz",0,"Eng","Tools engineer",1,["Crunch"],1],
[5,"Aiko",0,"Eng","Graphics programmer",0,["Credit"],1],
[6,"Reggie",0,"Eng","Build engineer",1,["Layoffs"],0,0,"While Hostile: Fear +1 at every status check."],
[7,"Sam",0,"Eng","Contract engineer",0,["Pay","Layoffs"],2,1],
[8,"Gordon",0,"Eng","Principal engineer",1,[],0],
[9,"Lena",1,"Art","Art director's deputy",2,["Credit","Harassment"],1],
[10,"Jamal",1,"Art","Character artist",2,["Crunch","Pay"],2],
[11,"Rosa",0,"Art","Environment artist",1,["Crunch"],2],
[12,"Finn",0,"Art","Concept artist",0,["Credit"],1],
[13,"Mei",0,"Art","Technical artist",1,["Pay"],1],
[14,"Carlos",0,"Art","Animator",1,["Crunch","Layoffs"],2],
[15,"Ingrid",0,"Art","UI artist",0,["Harassment"],1],
[16,"Bart",0,"Art","Outsourcing coordinator",1,[],0],
[17,"Dani",1,"QA","QA lead",2,["Pay","Layoffs"],2],
[18,"Tyrell",1,"QA","Senior tester",2,["Pay","Harassment"],2],
[19,"Kenji",0,"QA","Tester",0,["Pay"],2],
[20,"Moira",0,"QA","Tester",0,["Pay","Crunch"],1],
[21,"Luis",0,"QA","Contract tester",0,["Layoffs"],2,1],
[22,"Hana",0,"QA","Contract tester",0,["Layoffs","Pay"],1,1],
[23,"Pete",0,"QA","Embedded tester",1,["Credit"],1,0,"While Signed: Mapping any department costs 1 action."],
[24,"Vic",0,"QA","Test automation",1,[],0],
[25,"Noor",1,"Prod","Producer",2,["Crunch"],1],
[26,"Esteban",1,"Prod","Associate producer",2,["Pay","Credit"],2],
[27,"Clara",0,"Prod","Community manager",1,["Harassment","Pay"],2],
[28,"Omar",0,"Prod","Localization coordinator",1,["Layoffs"],1],
[29,"Beth",0,"Prod","Office coordinator",1,["Pay"],2],
[30,"Yusuf",0,"Prod","Data analyst",0,["Credit"],1],
[31,"Rachel",0,"Prod","Executive producer",1,[],0],
[32,"Trent",0,"Prod","Release manager",0,["Crunch"],0],
[33,"New hire",0,"",  "New hire",0,[],1,0],
[34,"New hire",0,"",  "New hire",0,[],1,0],
[35,"New hire",0,"",  "New hire",0,[],1,0],
[36,"New hire",0,"",  "New hire",0,[],1,0],
];
const LOCKS={2:"Pay",19:"Pay",20:"Pay",22:"Pay",29:"Pay",11:"Crunch",14:"Crunch",25:"Crunch",32:"Crunch"};
const ORGS=[
 {k:"tester",n:"The Tester",d:"QA",a:"Map flips two cards per Map action."},
 {k:"senior",n:"The Senior Engineer",d:"Eng",a:"Immune to the first Burnout-dealing management card."},
 {k:"animator",n:"The Animator",d:"Art",a:"One-on-Ones with Crunch workers cost 0 actions."},
 {k:"ap",n:"The Associate Producer",d:"Prod",a:"May Reassure once per round as a free action, in addition to the committee's one."},
 {k:"cm",n:"The Community Manager",d:"Prod",a:"Fear −1 extra whenever a Small Win resolves."},
 {k:"contract",n:"The Contract Tester",d:"QA",a:"Signed contract workers can't be removed by Contract Ends."},
];
const ISSUES=[
 {id:"crunch",n:"End Crunch",icon:"Crunch",x:"Overwork costs no Burnout."},
 {id:"pay",n:"Pay Transparency",icon:"Pay",x:"Workers with Pay can't be moved down by anything, Hostile Leaders included."},
 {id:"layoffs",n:"Convert the Contractors",icon:"Layoffs",x:"Contract workers can't be removed, and Mapping any department costs 1 action."},
 {id:"credit",n:"Credit Policy",icon:"Credit",x:"Leaders' Influence becomes 3."},
 {id:"harass",n:"Harassment Procedure",icon:"Harassment",x:"Fear −2 instead of −1, and the Fear 7–9 Burnout at the status check no longer applies."},
 {id:"wild",n:"Just Cause",icon:"any",x:"Needs 4 sharing one icon. Every organizer removes 1 Burnout. All holdouts unlock, and no worker can be removed from the board."},
];
const MGMT=[
 [1,1,"Open Door Policy","Fear +1. One Leaning worker moves to Undecided."],
 [2,1,"Captive-Audience Meeting","One department: all Undecided move to Hostile."],
 [3,1,"Surprise Bonus","Two Leaning workers with Pay move to Undecided."],
 [4,1,"Town Hall","Fear +1. Each organizer's next paid One-on-One costs 2. A Steward's free One-on-One doesn't count."],
 [5,1,"Culture Survey","Fear +1. One Undecided worker moves to Hostile."],
 [6,1,"Pizza Friday","No Map actions next round."],
 [7,1,"New Hire","A Plant joins the department with the most Signed workers, Hostile. Each Plant adds +1 to One-on-One costs in its department."],
 [8,1,"Vague Email","Leaning workers in departments with no Steward move down one."],
 [9,2,"Layoff Rumor","Fear +2. Signed workers with Layoffs move to Leaning."],
 [10,2,"Promote the Leader","Remove one Signed or Steward Leader from the board. A Plant takes their desk."],
 [11,2,"Union Avoidance Consultant","All One-on-Ones and Maps cost 2 this round. Fear +1."],
 [12,2,"Contract Ends","Remove one contract worker from the board. A Plant takes their desk."],
 [13,2,"Reorganization","One department: its Steward does nothing this round and no Influence triggers there."],
 [14,2,"Mandatory Meeting with HR","One organizer gains 1 Burnout and loses one action this round."],
 [15,2,"Counter-Offer","Management resolves one unresolved Issue itself. Nobody moves; the Small Win is gone."],
 [25,2,"Turncoat","The Signed Leader with the highest Influence turns Hostile and pulls up to its Influence workers in its department down one. It keeps pulling one per round."],
 [16,2,"Supervisor Pressure","Each department with a Steward: two Leaning workers move to Undecided unless the Steward absorbs."],
 [17,3,"Fire the Organizer","The organizer with the most Signed workers in their department gains 2 Burnout."],
 [18,3,"Delay the Election","Add a round 9. Management draws two cards in it."],
 [19,3,"Mandatory Overtime","Every organizer has 2 actions this round instead of 3."],
 [20,3,"Decertify the Unit","One department's workers don't count at the vote unless two are Stewards."],
 [21,3,"Threat to Close the Studio","Fear +3. (Fear only ends the game at the end-of-round status check.)"],
 [22,3,"Buy Off the Hostiles","Each Hostile worker pulls one Undecided worker in its department down one."],
 [23,3,"Leaked Memo","If any Issue is unresolved, Fear +2; otherwise Fear −2."],
 [24,3,"Vote Delay Challenge","The vote counts only workers Signed before this round began."],
];
function clone(o){return JSON.parse(JSON.stringify(o));}

function newGame(seats,seed,script){
  const r=createRng(seed);
  const two=false;
  const workers={};
  W.forEach(w=>{const [id,name,leader,dept,role,infl,issues,start,contract,trait]=w;
    if(two&&[8,16,24,32].includes(id))return;
    workers[id]={id,name,leader:!!leader,dept,role,infl,issues,disp:id>32?-1:start,start,contract:!!contract,trait:trait||null,onBoard:false,inoc:false,reserve:id>32,absorbUsed:false,freeUsed:false,lock:LOCKS[id]||null};
  });
  const piles={};
  Object.keys(DEPTS).forEach(d=>{piles[d]=r.shuffle(Object.values(workers).filter(w=>w.dept===d).map(w=>w.id));});
  const deck={1:[],2:[],3:[]};
  [1,2,3].forEach(t=>{deck[t]=r.shuffle(MGMT.filter(m=>m[1]===t).map(m=>m[0]));});
  if(script){ /* a fixed opening: listed ids come first, the rest keep their shuffled order */
    Object.keys(script.piles||{}).forEach(d=>{const f=script.piles[d];piles[d]=[...f,...piles[d].filter(id=>!f.includes(id))];});
    Object.keys(script.deck||{}).forEach(t=>{const f=script.deck[t];deck[t]=[...f,...deck[t].filter(id=>!f.includes(id))];});
  }
  const orgs=seats.map(s=>{const o=ORGS.find(x=>x.k===s.k);return {k:o.k,n:o.n,d:o.d,playerId:s.playerId||null,burnout:0,actions:0,overworked:false,townhall:false,immuneUsed:false,apFree:false,skip:0};});
  return {
    v:1,seed,phase:"mgmt",round:0,maxRound:8,threshold:seats.length>=4?24:21,
    fear:3,workers,piles,reserve:Object.values(workers).filter(w=>w.reserve).map(w=>w.id),
    deck,row:[],orgs,cur:0,first:0,
    issues:ISSUES.map(i=>({id:i.id,state:"open"})),
    flags:{consultant:false,overtime:false,reorg:null,decert:null,delayed:false,vdc:null,contractImmune:false},won:{},unlocked:{},
    pending:null,log:[],result:null,
  };
}

function setupFlips(g){ g.orgs.forEach(o=>{ for(let i=0;i<2;i++){const w=mapTop(g,o.d); if(w)logit(g,`${o.n} knows ${w.name}: ${DISP[w.disp]}.`);} }); cleanPending(g); g.pending=[]; }
function wArr(g){return Object.values(g.workers);}
function onBoard(g,d){return wArr(g).filter(w=>w.onBoard&&(!d||w.dept===d));}
function signedCount(g,d){return onBoard(g,d).filter(w=>w.disp>=3).length;}
function logit(g,t,round){g.log.push(round?{r:t}:{t});if(g.log.length>160)g.log.shift();}

/* ---- movement helpers ---- */
function immovable(w){return !w.issues.length;}
function locked(g,w){return !!(w.lock&&!(g.unlocked&&g.unlocked[w.lock]));}
function unlockIcon(g,ic){ g.unlocked=g.unlocked||{}; if(!g.unlocked[ic]){g.unlocked[ic]=true; logit(g,`${ic} holdouts will now sign.`);} }
function moveUp(g,w,n=1){ if(!w.onBoard||immovable(w))return; const was=w.disp; w.disp=Math.min(locked(g,w)?2:3,w.disp+n); if(was<3&&w.disp===3){ queueInfluence(g,w);} }
function queueInfluence(g,w){
  const inf=infl(g,w); if(g.flags.reorg===w.dept||inf===0)return;
  const cands=onBoard(g,w.dept).filter(x=>x.id!==w.id&&x.disp<3&&!immovable(x)&&!(x.disp===2&&locked(g,x)));
  if(!cands.length)return;
  g.pending=g.pending||[]; if(!Array.isArray(g.pending))g.pending=[g.pending];
  g.pending.push({type:"influence",dept:w.dept,n:Math.min(inf,cands.length),from:w.name});
}
function addPlant(g,d){ const rid=g.reserve.shift(); if(rid==null){logit(g,"No Plants left in reserve.");return null;} const p=g.workers[rid]; p.dept=d; p.onBoard=true; p.disp=0; p.name="Plant"; p.role="Management plant"; p.issues=[]; p.contract=false; p.infl=0; p.leader=false; p.lock=null; logit(g,`A Plant takes the empty desk in ${DEPTS[d][0]}. One-on-Ones there cost +1.`); return p; }
function plantsIn(g,d){return onBoard(g,d).filter(w=>w.reserve).length;}
function removeWorker(g,w){ if(won(g,"wild")){logit(g,`Just Cause protects ${w.name}: nobody is removed.`);return;} const d=w.dept; w.onBoard=false; w.disp=-2; w.inoc=false; addPlant(g,d); }
const ABSORBABLE=new Set([1,2,3,5,9,10,12,16,22,25]);
function stewardsAvail(g){return onBoard(g).filter(w=>w.disp===4&&!w.absorbUsed&&g.flags.reorg!==w.dept);}
function stewardAbsorb(g,d,excludeId){
  if(g.flags.reorg===d)return false;
  const allow=(g.mgmt&&g.mgmt.allow)||{};
  const st=onBoard(g,d).find(w=>w.disp===4&&!w.absorbUsed&&w.id!==excludeId&&allow[w.id]);
  if(st){st.absorbUsed=true;logit(g,`${st.name} (Steward) absorbs it in ${DEPTS[d][0]} — their one absorb is spent.`);return true;}
  return false;
}
/* a management effect that would move workers down / remove in dept d */
function hitDept(g,d,fn,excludeId){
  if(stewardAbsorb(g,d,excludeId))return;
  fn();
}
function won(g,id){return !!(g.won&&g.won[id]);}
function canDrop(g,w){return !immovable(w)&&!(won(g,"pay")&&w.issues.includes("Pay"));}
function infl(g,w){return (won(g,"credit")&&w.leader)?3:w.infl;}
function addFear(g,n){g.fear=Math.max(0,Math.min(10,g.fear+n));}
function mapTop(g,d){const id=g.piles[d].shift();if(id==null)return null;const w=g.workers[id];w.onBoard=true;w.disp=w.start;w.inoc=false;return w;}
function addBurnout(g,o,n,fromCard){
  if(fromCard&&o.k==="senior"&&!o.immuneUsed){o.immuneUsed=true;logit(g,`${o.n} shrugs it off (immune once).`);return;}
  o.burnout=Math.min(3,o.burnout+n);
  if(o.burnout===3)logit(g,`${o.n} is burned out: 1 action, no ability.`);
}
function actionsFor(o){return [3,3,2,1][o.burnout];}
function hasAbility(g,o){return o.burnout<3;}
function orgHome(g,d){return g.orgs.some(o=>o.d===d&&o.burnout<3);}
function deptsSortedBy(g,fn){return Object.keys(DEPTS).map(d=>[d,fn(d)]).sort((a,b)=>b[1]-a[1]);}

/* ---- management card resolution (management chooses the worst for players) ---- */
function resolveMgmt(g,id){
  const m=MGMT.find(x=>x[0]===id); const name=m[2];
  logit(g,`Management: ${name}.`);
  const ob=onBoard(g);
  switch(id){
    case 1:{ addFear(g,1); const c=ob.filter(w=>w.disp===2&&canDrop(g,w)).sort((a,b)=>infl(g,b)-infl(g,a))[0]; if(c) hitDept(g,c.dept,()=>{c.disp=1;logit(g,`${c.name} drifts to Undecided.`);}); break;}
    case 2:{ const [d,n]=deptsSortedBy(g,d=>onBoard(g,d).filter(w=>w.disp===1&&canDrop(g,w)).length)[0];
      if(n>0) hitDept(g,d,()=>{onBoard(g,d).filter(w=>w.disp===1&&canDrop(g,w)).forEach(w=>w.disp=0);logit(g,`Undecided in ${DEPTS[d][0]} turn Hostile.`);});
      else logit(g,"No Undecided workers to target."); break;}
    case 3:{ const cs=ob.filter(w=>w.disp===2&&w.issues.includes("Pay")&&canDrop(g,w)).sort((a,b)=>infl(g,b)-infl(g,a)).slice(0,2);
      const byDept={}; cs.forEach(c=>{(byDept[c.dept]=byDept[c.dept]||[]).push(c);});
      Object.keys(byDept).forEach(d=>hitDept(g,d,()=>{byDept[d].forEach(c=>{c.disp=1;logit(g,`${c.name} takes the bonus and slips to Undecided.`);});})); break;}
    case 4: addFear(g,1); g.orgs.forEach(o=>o.townhall=true); break;
    case 5:{ addFear(g,1); const c=ob.filter(w=>w.disp===1&&canDrop(g,w)).sort((a,b)=>infl(g,b)-infl(g,a))[0]; if(c) hitDept(g,c.dept,()=>{c.disp=0;logit(g,`${c.name} turns Hostile after the survey.`);}); break;}
    case 6: g.flags.noMapNext=true; logit(g,"Nobody will Map next round."); break;
    case 7:{ const [d]=deptsSortedBy(g,d=>signedCount(g,d))[0]; addPlant(g,d); break;}
    case 8: Object.keys(DEPTS).forEach(d=>{ if(onBoard(g,d).some(w=>w.disp===4))return; const ls=onBoard(g,d).filter(w=>w.disp===2&&canDrop(g,w)); if(ls.length) hitDept(g,d,()=>{ls.forEach(w=>w.disp=1);logit(g,`Leaning workers in ${DEPTS[d][0]} drift to Undecided.`);}); }); break;
    case 9: addFear(g,2); Object.keys(DEPTS).forEach(d=>{const ss=onBoard(g,d).filter(w=>w.disp===3&&w.issues.includes("Layoffs")&&canDrop(g,w)); if(ss.length) hitDept(g,d,()=>{ss.forEach(w=>w.disp=2);logit(g,`Layoff rumor shakes ${ss.map(w=>w.name).join(", ")}.`);});}); break;
    case 10:{ if(won(g,"wild")){logit(g,"Just Cause: nobody can be removed from the board.");break;} const c=ob.filter(w=>w.leader&&w.disp>=3).sort((a,b)=>b.disp-a.disp)[0];
      if(c) hitDept(g,c.dept,()=>{removeWorker(g,c);logit(g,`${c.name} is promoted into management.`);},c.id); else logit(g,"No signed Leader to promote."); break;}
    case 11: addFear(g,1); g.flags.consultant=true; break;
    case 12:{ if(won(g,"wild")){logit(g,"Just Cause: nobody can be removed from the board.");break;} if(g.flags.contractImmune||won(g,"layoffs")){logit(g,"Contractors are converted; nothing happens.");break;}
      const c=ob.filter(w=>w.contract&&w.disp<4&&!(w.disp===3&&g.orgs.some(o=>o.k==="contract"&&hasAbility(g,o)))).sort((a,b)=>b.disp-a.disp)[0];
      if(c) hitDept(g,c.dept,()=>{removeWorker(g,c);logit(g,`${c.name}'s contract ends.`);},c.id); else logit(g,"No contract worker to cut."); break;}
    case 13:{ const [d]=deptsSortedBy(g,d=>onBoard(g,d).filter(w=>w.disp===4).length*10+signedCount(g,d))[0];
      g.flags.reorg=d;logit(g,`${DEPTS[d][0]} is reorganized this round.`); break;}
    case 14:{ const o=g.orgs.filter(o=>o.burnout<3).sort((a,b)=>signedCount(g,b.d)-signedCount(g,a.d))[0]||g.orgs[0];
      addBurnout(g,o,1,true); o.skip=1; logit(g,`${o.n} is called into HR.`); break;}
    case 15:{ const open=g.issues.filter(i=>i.state==="open"&&i.id!=="wild").map(i=>({i,n:readyCount(g,i.id)})).sort((a,b)=>b.n-a.n)[0];
      if(open){open.i.state="gone";const icn=ISSUES.find(x=>x.id===open.i.id).icon;logit(g,`Management grants "${ISSUES.find(x=>x.id===open.i.id).n}" on its own terms. That Small Win is gone.`); if(icn==="Pay"||icn==="Crunch")unlockIcon(g,icn);} else logit(g,"Nothing to counter."); break;}
    case 25:{ const c=ob.filter(w=>w.leader&&w.disp===3&&canDrop(g,w)).sort((a,b)=>infl(g,b)-infl(g,a))[0];
      if(!c){logit(g,"No Signed Leader to turn.");break;}
      hitDept(g,c.dept,()=>{ c.disp=0; logit(g,`${c.name} turns coat.`); const pulls=onBoard(g,c.dept).filter(w=>w.disp>0&&w.disp<4&&w.id!==c.id&&canDrop(g,w)).sort((a,b)=>b.disp-a.disp).slice(0,infl(g,c)); pulls.forEach(w=>{w.disp--;}); if(pulls.length)logit(g,`${c.name} drags ${pulls.map(w=>w.name).join(", ")} down.`); },c.id); break;}
    case 16: Object.keys(DEPTS).forEach(d=>{ if(!onBoard(g,d).some(w=>w.disp===4))return; const ls=onBoard(g,d).filter(w=>w.disp===2&&canDrop(g,w)).slice(0,2); if(ls.length) hitDept(g,d,()=>{ls.forEach(l=>l.disp=1);logit(g,`${ls.map(l=>l.name).join(" and ")} wilt under supervisor pressure.`);}); }); break;
    case 17:{ const o=g.orgs.slice().sort((a,b)=>signedCount(g,b.d)-signedCount(g,a.d))[0]; addBurnout(g,o,2,true); logit(g,`${o.n} is targeted for firing.`); break;}
    case 18: g.maxRound=9; g.flags.delayed=true; logit(g,"The election is delayed to round 9."); break;
    case 19: g.flags.overtime=true; break;
    case 20:{ const [d]=deptsSortedBy(g,d=>signedCount(g,d))[0]; g.flags.decert=d;logit(g,`${DEPTS[d][0]} is carved out of the unit.`); break;}
    case 21: addFear(g,3); break;
    case 22: Object.keys(DEPTS).forEach(d=>{ const hs=onBoard(g,d).filter(w=>w.disp===0).length; if(!hs)return; const us=onBoard(g,d).filter(w=>w.disp===1&&canDrop(g,w)).slice(0,hs); if(us.length) hitDept(g,d,()=>{us.forEach(w=>w.disp=0);logit(g,`Hostiles in ${DEPTS[d][0]} pull ${us.map(w=>w.name).join(", ")} down.`);}); }); break;
    case 23: if(g.issues.some(i=>i.state==="open"))addFear(g,2); else addFear(g,-2); break;
    case 24: g.flags.vdc=ob.filter(w=>w.disp>=3).map(w=>w.id); logit(g,"Only workers already Signed this round will count."); break;
  }
}
function reqN(g){return 3;}
function winsLeft(g){return 3-g.issues.filter(i=>i.state==="done").length;}
function readyCount(g,issueId){const ic=ISSUES.find(i=>i.id===issueId).icon; return ic==="any"?Math.max(...["Crunch","Pay","Layoffs","Credit","Harassment"].map(x=>onBoard(g).filter(w=>w.disp>=3&&w.issues.includes(x)).length)):onBoard(g).filter(w=>w.disp>=3&&w.issues.includes(ic)).length;}

/* ---- round flow ---- */
function startRound(g){
  g.round++; g.reassuredRound=false; g.flags.consultant=false; g.flags.reorg=null; g.flags.vdc=null; g.flags.noMap=!!g.flags.noMapNext; g.flags.noMapNext=false;
  wArr(g).forEach(w=>{w.freeUsed=false;});
  const slot={cards:[],issues:(g.row[g.round-1]&&g.row[g.round-1].issues)||[]};
  g.row[g.round-1]=slot;
  const sc=signedCount(g);
  let n=1+(g.round>=7?1:0);
  const heat=(sc>=12?1:0)+(sc>=20?1:0);
  n+=heat+slot.issues.length;
  logit(g,`Round ${g.round} — management draws ${n} card${n>1?"s":""}.`,true);
  g.mgmt={left:n,card:null,decided:false,allow:{}};
  g.phase="mgmt";
  continueRound(g);
}
function continueRound(g){
  const slot=g.row[g.round-1];
  while(g.mgmt.left>0){
    if(g.mgmt.card==null){ const id=drawMgmt(g); if(id==null){g.mgmt.left=0;break;} g.mgmt.card=id; slot.cards.push(id); g.mgmt.decided=false; g.mgmt.allow={}; }
    const id=g.mgmt.card;
    if(ABSORBABLE.has(id)&&stewardsAvail(g).length&&!g.mgmt.decided){ g.phase="absorb"; return; }
    resolveMgmt(g,id); g.mgmt.card=null; g.mgmt.left--;
    if(checkLoss(g))return;
  }
  // steward phase: each Steward's flip is the players' choice
  g.pending=[];
  Object.keys(DEPTS).forEach(d=>{ if(g.flags.reorg===d)return; onBoard(g,d).filter(w=>w.disp===4).forEach(st=>{
    if(stewardTargets(g,d).length) g.pending.push({type:"steward",id:st.id,dept:d,from:st.name}); }); });
  g.phase="steward";
  if(!g.pending.length) finishRoundStart(g);
}
function stewardTargets(g,d){ return onBoard(g,d).filter(w=>w.disp<3&&!immovable(w)&&!(w.disp===2&&locked(g,w))); }
function doStewardPick(g,wid){ const p=g.pending&&g.pending[0]; if(!p||p.type!=="steward")return "No Steward choice pending."; const w=g.workers[wid];
  if(!w.onBoard||w.dept!==p.dept||!stewardTargets(g,p.dept).some(x=>x.id===wid))return "Pick a movable worker in that department below Signed.";
  moveUp(g,w); logit(g,`${p.from} (Steward) brings ${w.name} to ${DISP[w.disp]}.`); g.pending.shift();
  // influence may have queued; keep steward picks after influence picks
  g.pending.sort((a,b)=>(a.type==="influence"?0:1)-(b.type==="influence"?0:1)); cleanPending(g);
  if(!g.pending.length) finishRoundStart(g); return null; }
function doStewardSkip(g){ const p=g.pending&&g.pending[0]; if(p&&p.type==="steward"){logit(g,`${p.from} makes no move this round.`);g.pending.shift();} cleanPending(g); if(!g.pending.length) finishRoundStart(g); return null; }
function finishRoundStart(g){
  // hostile leaders pull
  Object.keys(DEPTS).forEach(d=>{ onBoard(g,d).filter(w=>w.disp===0&&w.leader).forEach(h=>{
    const c=onBoard(g,d).filter(w=>w.disp>0&&w.disp<4&&w.id!==h.id&&canDrop(g,w)).sort((a,b)=>b.disp-a.disp||infl(g,b)-infl(g,a))[0];
    if(c){c.disp--;logit(g,`${h.name} (Hostile Leader) drags ${c.name} down to ${DISP[c.disp]}.`);} }); });
  // organizer phase
  g.orgs.forEach(o=>{o.actions=(g.flags.overtime?Math.min(actionsFor(o),2):actionsFor(o))-o.skip; if(o.actions<0)o.actions=0; o.skip=0; o.overworked=false; o.apFree=false; o.done=false; o.turnTotal=o.actions; o.reassured=0;});
  g.flags.overtime=false;
  g.phase="org"; g.cur=g.first; cleanPending(g);
  skipDone(g);
}
function doAbsorbDecision(g,allow){ if(g.phase!=="absorb")return "Nothing to decide."; g.mgmt.allow=allow||{}; g.mgmt.decided=true; g.phase="mgmt"; continueRound(g); return null; }
function tierFor(g){return g.round>=7?3:g.round>=4?2:1;}
function drawMgmt(g){ for(let t=tierFor(g);t<=3;t++){ if(g.deck[t]&&g.deck[t].length)return g.deck[t].shift(); } logit(g,"Management has no cards left at this tier or above."); return null; }
function deckLeft(g){return [1,2,3].reduce((a,t)=>a+((g.deck[t]||[]).length),0);}
function checkLoss(g,roundEnd){
  if(roundEnd&&g.fear>=10){g.phase="over";g.result="loss";g.why="Fear hit 10 before the vote. The drive collapsed.";logit(g,"Fear hits 10. The drive collapses.");return true;}
  if(g.orgs.every(o=>o.burnout>=3)){g.phase="over";g.result="loss";g.why="Every organizer burned out before the vote.";logit(g,"The committee is burned out.");return true;}
  if(g.orgs.length===1&&g.orgs[0].burnout>=3&&g.orgs[0].actions<=0){/* solo keeps playing at 1 action */}
  return false;
}
function skipDone(g){ let guard=0; while(guard++<10&&g.orgs[g.cur].done&&g.orgs.some(o=>!o.done)){g.cur=(g.cur+1)%g.orgs.length;} if(g.orgs.every(o=>o.done)&&!(g.pending&&g.pending.length))endRound(g); }
function endRound(g){
  logit(g,"Status check.");
  { const reg=g.workers[6]; if(reg&&reg.onBoard&&reg.disp===0){ addFear(g,1); logit(g,"Reggie is still Hostile: Fear +1."); } }
  if(checkLoss(g,true))return;
  if(g.fear>=7){ if(won(g,"harass"))logit(g,"Fear is high, but the Harassment Procedure holds: no Burnout."); else {g.orgs.forEach(o=>addBurnout(g,o,1,false));logit(g,"Fear is high: everyone takes +1 Burnout.");} }
  if(checkLoss(g,true))return;
  if(g.round>=g.maxRound){vote(g);return;}
  g.first=(g.first+1)%g.orgs.length;
  startRound(g);
}
function voteCount(g){ return onBoard(g).filter(w=>w.disp>=3).filter(w=>!(g.flags.decert===w.dept&&onBoard(g,w.dept).filter(x=>x.disp===4).length<2)).filter(w=>!g.flags.vdc||g.flags.vdc.includes(w.id)).length; }
function vote(g){ const n=voteCount(g); g.phase="over"; g.result=n>=g.threshold?"win":"loss"; g.why=n>=g.threshold?`The vote carried, ${n} of ${g.threshold}.`:`The vote fell short, ${n} of ${g.threshold}.`; logit(g,`The vote: ${n} of ${g.threshold} needed. ${g.result==="win"?"The union is certified.":"The drive falls short."}`,true); }

/* ---- player actions; return error string or null ---- */
function canAct(g,oi){return g.phase==="org"&&g.cur===oi&&!(g.pending&&g.pending.length);}
function oneCost(g,o,w){ if(o.k==="animator"&&hasAbility(g,o)&&w.issues.includes("Crunch"))return 0;
  const st=onBoard(g,w.dept).find(x=>x.disp===4&&!x.freeUsed); if(st&&g.flags.reorg!==w.dept)return 0;
  let c=1; if(g.fear>=7||g.flags.consultant||o.townhall)c=2; return c+plantsIn(g,w.dept); }
function spend(g,o,n){ o.actions-=n; }
function mapCost(g,o,d){ const pete=g.workers[23]; const c=(won(g,"layoffs")||(pete&&pete.onBoard&&pete.disp>=3)||d===o.d||onBoard(g,d).some(w=>w.disp>=3))?1:2; return g.flags.consultant?Math.max(2,c):c; }
function doMap(g,oi,d){ const o=g.orgs[oi]; if(g.flags.noMap)return "Pizza Friday: no Map actions this round."; const c=mapCost(g,o,d); if(o.actions<c)return c===2?"Mapping another department costs 2 actions (1 once someone there is Signed).":"No actions left.";
  if(!g.piles[d].length)return "That pile is empty.";
  const k=(o.k==="tester"&&hasAbility(g,o))?2:1; spend(g,o,c);
  for(let i=0;i<k;i++){const w=mapTop(g,d); if(w)logit(g,`${o.n} maps ${w.name}: ${DISP[w.disp]}.`);} return null; }
function doOne(g,oi,wid){ const o=g.orgs[oi]; const w=g.workers[wid]; if(!w.onBoard||w.disp>=3)return "Pick a revealed worker below Signed."; if(immovable(w))return `${w.name} has no issues to organize around. Immovable.`; if(w.disp===2&&locked(g,w))return `${w.name} won't sign until ${w.lock==="Pay"?"Pay Transparency":"End Crunch"} is won.`;
  const c=oneCost(g,o,w); if(o.actions<c)return `That One-on-One costs ${c}.`;
  if(c===0){ const st=onBoard(g,w.dept).find(x=>x.disp===4&&!x.freeUsed); if(st&&!(o.k==="animator"&&w.issues.includes("Crunch")))st.freeUsed=true; }
  spend(g,o,c); if(o.townhall&&c>0)o.townhall=false;
  moveUp(g,w); logit(g,`${o.n} talks with ${w.name}: now ${DISP[w.disp]}.`); return null; }
function doSmallWin(g,oi,iid,icon){ const o=g.orgs[oi]; const is=g.issues.find(i=>i.id===iid); if(is.state!=="open")return "That Issue is no longer available.";
  const def=ISSUES.find(i=>i.id===iid); const ic=def.icon==="any"?icon:def.icon;
  if(winsLeft(g)<=0)return "All three Small Win slots are used.";
  const needN=iid==="wild"?reqN(g)+1:reqN(g);
  if(def.icon==="any"&&!ic){ if(readyCount(g,iid)<needN)return `Requirement not met: ${needN} Signed or Steward workers sharing one icon.`; const cost0=g.fear>=8?2:1; if(o.actions<cost0)return `A Small Win costs ${cost0} right now.`; g.pending=[{type:"icon",issue:iid}];return null;}
  if(onBoard(g).filter(w=>w.disp>=3&&w.issues.includes(ic)).length<needN)return `Requirement not met: ${needN} Signed or Steward workers with that icon.`;
  const cost=g.fear>=8?2:1; if(o.actions<cost)return `A Small Win costs ${cost} right now.`;
  spend(g,o,cost); is.state="done"; g.won=g.won||{}; g.won[iid]=true; if(ic==="Pay"||ic==="Crunch")unlockIcon(g,ic);
  const ups=onBoard(g).filter(w=>w.issues.includes(ic)&&w.disp<3); ups.forEach(w=>{moveUp(g,w);});
  let f=(iid==="harass"||won(g,"harass"))?-2:-1; if(g.orgs.some(x=>x.k==="cm"&&hasAbility(g,x)))f-=1; addFear(g,f);
  if(iid==="layoffs")g.flags.contractImmune=true;
  if(iid==="wild"){g.orgs.forEach(x=>x.burnout=Math.max(0,x.burnout-1)); unlockIcon(g,"Pay"); unlockIcon(g,"Crunch");}
  { const slot=g.round<g.row.length?g.row[g.round]:(g.row[g.round]={cards:[],issues:[]}); slot.issues.push(iid); }
  logit(g,`Small Win: ${def.n}. ${ups.length} worker${ups.length===1?"":"s"} move up. Fear ${f}. Management draws +1 next round. ${def.x}`); return null; }
function doCommittee(g,oi,wid){ const o=g.orgs[oi]; const w=g.workers[wid]; if(!w.onBoard||!w.leader||w.disp!==3)return "Pick a Signed Leader (★).";
  if(o.actions<2)return "Build Committee costs 2 actions."; spend(g,o,2); w.disp=4; logit(g,`${w.name} becomes a Steward.`); return null; }
const REASSURE={cost:1,perOrg:9,perTable:true};
function doReassure(g,oi){ const o=g.orgs[oi]; const free=o.k==="ap"&&hasAbility(g,o)&&!o.apFree; if(g.fear<=0)return "Fear is already 0.";
  if(REASSURE.perTable&&g.reassuredRound&&!free)return "Once per round for the whole committee.";
  if((o.reassured||0)>=REASSURE.perOrg&&!free)return "Once per round.";
  if(!free&&o.actions<REASSURE.cost)return `Reassure costs ${REASSURE.cost}.`;
  if(free)o.apFree=true; else {spend(g,o,REASSURE.cost); o.reassured=(o.reassured||0)+1; g.reassuredRound=true;} addFear(g,-1); logit(g,`${o.n} steadies the room. Fear ${g.fear}.`); return null; }
function doReset(g,oi){ const o=g.orgs[oi]; if(o.actions<1)return "No actions left."; if(o.burnout===0)return "No Burnout to remove."; spend(g,o,1); o.burnout--; logit(g,`${o.n} rests. Burnout ${o.burnout}.`); return null; }
function doOverwork(g,oi){ const o=g.orgs[oi]; if(o.overworked)return "Once per round."; if(o.burnout>=3)return "Already burned out."; o.overworked=true; if(!won(g,"crunch"))addBurnout(g,o,1,false); o.actions++; o.turnTotal=(o.turnTotal||0)+1; logit(g,`${o.n} overworks. Burnout ${o.burnout}.`); return null; }
function doEnd(g,oi){ const o=g.orgs[oi]; o.done=true; logit(g,`${o.n} ends their turn.`); g.cur=(g.cur+1)%g.orgs.length; return null; }
function doInfluencePick(g,wid){ const p=g.pending&&g.pending[0]; if(!p||p.type!=="influence")return "Nothing to choose."; const w=g.workers[wid];
  if(!w.onBoard||w.dept!==p.dept||w.disp>=3||immovable(w)||(w.disp===2&&locked(g,w)))return "Pick a movable worker in that department below Signed (holdouts stop at Leaning).";
  moveUp(g,w); logit(g,`${p.from}'s influence moves ${w.name} to ${DISP[w.disp]}.`); p.n--; if(p.n<=0||!onBoard(g,p.dept).some(x=>x.disp<3&&!immovable(x)&&!(x.disp===2&&locked(g,x))))g.pending.shift();
  g.pending.sort((a,b)=>(a.type==="influence"?0:1)-(b.type==="influence"?0:1)); cleanPending(g); if(g.phase==="steward"&&!g.pending.length)finishRoundStart(g); return null; }
function doSkipInfluence(g){ if(g.pending&&g.pending.length&&g.pending[0].type==="influence"){g.pending.shift();} cleanPending(g); if(g.phase==="steward"&&!g.pending.length)finishRoundStart(g); return null; }
function cleanPending(g){ if(!g.pending)return; g.pending=g.pending.filter(p=>p.type==="icon"||(p.type==="influence"?onBoard(g,p.dept).some(w=>w.disp<3&&!immovable(w)&&!(w.disp===2&&locked(g,w))):stewardTargets(g,p.dept).length>0)); }
function afterAction(g){ if(g.phase!=="org")return; cleanPending(g); if(g.pending&&g.pending.length)return; if(checkLoss(g))return; skipDone(g); }

export {
  DEPTS, DISP, W, LOCKS, ORGS, ISSUES, MGMT, clone,
  newGame, setupFlips, wArr, onBoard, signedCount, logit, immovable, locked,
  unlockIcon, moveUp, queueInfluence, addPlant, plantsIn, removeWorker, ABSORBABLE, stewardsAvail,
  stewardAbsorb, hitDept, won, canDrop, infl, addFear, mapTop, addBurnout,
  actionsFor, hasAbility, orgHome, deptsSortedBy, resolveMgmt, reqN, winsLeft, readyCount,
  startRound, continueRound, stewardTargets, doStewardPick, doStewardSkip, finishRoundStart, doAbsorbDecision, tierFor,
  drawMgmt, deckLeft, checkLoss, skipDone, endRound, voteCount, vote, canAct,
  oneCost, spend, mapCost, doMap, doOne, doSmallWin, doCommittee, REASSURE,
  doReassure, doReset, doOverwork, doEnd, doInfluencePick, doSkipInfluence, cleanPending, afterAction,
};
