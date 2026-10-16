/* Same-origin embedded view. The parent DPCS app keeps the PIN session; no token in URL or frame attributes. */
let requestNo=0;
const friendly={SIGNIN_REQUIRED:'Sign in to DPCS to view project control.',FORBIDDEN:'Your account does not have project-control access.',UNKNOWN_ACTION:'The backend reporting operation is not deployed yet.',OFFLINE:'No internet connection.'};
function disconnected(message){SNAP=null;$('notice').textContent=message;$('content').innerHTML='<article class="card"><h2>Project data unavailable</h2><p>Open this dashboard from the signed-in DPCS app (Control › Dashboard) and refresh.</p></article>';$('basis').textContent='No live data loaded';$('projectName').textContent='DPCS project';}
async function loadConnected(){
  const request=++requestNo, bridge=window.parent!==window?window.parent.DPCSControlBridge:null;
  if(!bridge||typeof bridge.load!=='function'){disconnected('Open this dashboard from your signed-in DPCS app. Direct access has no session bridge.');return;}
  $('notice').textContent='Loading authorised project data…';
  try{
    const result=await bridge.load({kind:({daily:'DPR',weekly:'WEEKLY',monthly:'MONTHLY'})[$('period').value]});
    if(request!==requestNo)return;
    if(!result||!result.ok)throw Error(friendly[result&&result.error]||('Unable to load authorised project data: '+(result&&result.error)));
    window.DPCSModel.validate(result.snapshot); SNAP=result.snapshot;
    $('projectName').textContent=SNAP.project.project_name;
    $('notice').textContent=`${SNAP.basis} · ${SNAP.period_start||SNAP.as_of} to ${SNAP.as_of}. Only PM-verified quantities count as achieved; unknown values show N/A / Awaiting.`;
    $('basis').textContent=`Snapshot cutoff ${SNAP.as_of} · ${SNAP.project.status||''}`;
    render();
  }catch(e){if(request===requestNo)disconnected(e.message);}
}
$('period').onchange=loadConnected;$('block').onchange=render;$('mode').disabled=true;
$('reset').onclick=()=>{$('block').value='all';$('period').value='daily';loadConnected();};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadConnected();});
loadConnected();
