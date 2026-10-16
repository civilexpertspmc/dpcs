(function(root){
 'use strict';
 function date(s){if(!/^\d{2}-\d{2}-\d{4}$/.test(s))throw Error('Expected DD-MM-YYYY');const [d,m,y]=s.split('-').map(Number);const t=new Date(Date.UTC(y,m-1,d));if(t.getUTCDate()!==d||t.getUTCMonth()!==m-1)throw Error('Invalid calendar date');return t.getTime();}
 function num(v){if(v===''||v==null)return null;const n=Number(String(v).replaceAll(',',''));if(!Number.isFinite(n))throw Error('Invalid quantity');return n;}
 function validate(s){if(s?.schema_version!=='1.0'||!s.project?.project_id||!Array.isArray(s.activities)||!Array.isArray(s.baseline))throw Error('Snapshot contract mismatch');date(s.as_of);const ids=s.activities.map(a=>a.entry_id);if(ids.length!==new Set(ids).size)throw Error('Duplicate activity IDs');const ids2=s.baseline.map(b=>b.wbs_id);if(ids2.length!==new Set(ids2).size)throw Error('Duplicate WBS IDs');for(const a of s.activities){date(a.report_date);if(a.verification_status==='VERIFIED'){const b=s.baseline.find(b=>b.wbs_id===a.wbs_id);if(!b||b.unit!==a.unit||num(a.verified_qty)===null||num(a.verified_qty)<0)throw Error('Invalid verified activity');}}}
 function calculate(s,block='all'){
  validate(s);const end=date(s.as_of),start=s.period_start?date(s.period_start):end;
  const baseline=s.baseline.filter(b=>block==='all'||b.block.split('+').includes(block));const keys=new Set(baseline.map(b=>b.wbs_id));
  const acts=s.activities.filter(a=>date(a.report_date)<=end&&(block==='all'||keys.has(a.wbs_id)));
  const pending=acts.filter(a=>date(a.report_date)>=start&&a.verification_status!=='VERIFIED').length;
  let actual=null,planned=null,series=[];
  const complete=baseline.length&&s.coverage_complete===true&&baseline.every(b=>b.baseline_status==='APPROVED'&&num(b.boq_qty)>0&&num(b.weight)>0&&b.planned_start&&b.planned_finish&&date(b.planned_finish)>=date(b.planned_start));
  if(complete){
   const total=baseline.reduce((n,b)=>n+num(b.weight),0);
   function at(t){let p=0,a=0;for(const b of baseline){const q=num(b.boq_qty),w=num(b.weight),bs=date(b.planned_start),bf=date(b.planned_finish);p+=w*Math.max(0,Math.min(1,(t-bs+86400000)/(bf-bs+86400000)));const done=acts.filter(x=>x.wbs_id===b.wbs_id&&x.verification_status==='VERIFIED'&&date(x.report_date)<=t).reduce((n,x)=>n+num(x.verified_qty),0);a+=w*Math.min(1,done/q);}return {date:t,planned:p/total*100,actual:a/total*100};}
   const first=Math.min(...baseline.map(b=>date(b.planned_start)),end);const span=end-first;
   series=Array.from({length:7},(_,i)=>at(first+Math.round(span*i/6/86400000)*86400000));const last=at(end);actual=last.actual;planned=last.planned;
  }
  return {pending,actual,planned,series};
 }
 function chart(series){const point=(x,k)=>`${35+x*95},${175-series[x][k]*1.55}`;return `<svg class="chart" viewBox="0 0 620 210" role="img" aria-label="Approved planned versus verified cumulative progress"><line x1="35" x2="605" y1="175" y2="175" stroke="#e3e9ed"/><polyline points="${series.map((_,i)=>point(i,'planned')).join(' ')}" fill="none" stroke="#a4b9c7" stroke-width="2" stroke-dasharray="5 4"/><polyline points="${series.map((_,i)=>point(i,'actual')).join(' ')}" fill="none" stroke="#00858c" stroke-width="3"/><text x="35" y="200" fill="#71818e" font-size="10">Approved baseline start</text><text x="510" y="200" fill="#71818e" font-size="10">Reporting cutoff</text></svg>`;}
 const api={validate,calculate,chart,date};if(typeof module!=='undefined')module.exports=api;root.DPCSModel=api;
})(typeof window==='undefined'?globalThis:window);
