'use strict';
/* Mi CRM de Clientes — datos en localStorage; sincronización opcional en firebase.js */
const APP_VERSION='2.0';
const STORAGE_KEY='crm_clientes_v2';
const STAGES=[['nuevo','Nuevo'],['contactado','Contactado'],['visita','Visita'],['negociando','Negociando'],['cerrado','Cerrado'],['perdido','Perdido']];
const STAGE_LABEL=Object.fromEntries(STAGES);
const ACTIVE_STAGES=['nuevo','contactado','visita','negociando'];
const SOURCES=['Marketplace','Facebook','Instagram','TikTok','WhatsApp','Página de la empresa','Letrero','Referido','Cliente anterior','Otro'];
const LOG_ICON={whatsapp:'💬',llamada:'📞',visita:'🏠',reunion:'🤝',nota:'📝',etapa:'➡️'};
const PRIORITY_ORDER={caliente:0,tibia:1,fria:2};
const DEFAULT_SETTINGS={name:'',rate:6.96,commission:3,followDays:3,greeting:'Hola {nombre}, ',autoLog:true};

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const pad=n=>String(n).padStart(2,'0');
const localISO=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const nowISO=()=>localISO(new Date());
const todayStr=()=>nowISO().slice(0,10);
const addDays=(n,hour=10)=>{const d=new Date();d.setDate(d.getDate()+n);d.setHours(hour,0,0,0);return localISO(d);};

/* ---------- Códigos DOM-000000 ---------- */
function normalizeCode(raw){
  const m=String(raw||'').trim().toUpperCase().match(/^(?:DOM)?\s*[-_ ]?\s*0*(\d{1,6})$/);
  if(!m||+m[1]===0)return null;
  return 'DOM-'+m[1].padStart(6,'0');
}

/* ---------- Datos ---------- */
function emptyData(){return {settings:{...DEFAULT_SETTINGS},clients:[],visits:[]};}
function sanitize(d){
  const out=emptyData();
  if(!d||typeof d!=='object')return out;
  out.settings={...DEFAULT_SETTINGS,...(d.settings||{})};
  out.clients=Array.isArray(d.clients)?d.clients.filter(c=>c&&c.id&&c.name):[];
  out.clients.forEach(c=>{c.properties=Array.isArray(c.properties)?c.properties:[];c.log=Array.isArray(c.log)?c.log:[];c.tags=Array.isArray(c.tags)?c.tags:[];});
  out.visits=Array.isArray(d.visits)?d.visits.filter(v=>v&&v.id):[];
  return out;
}
function loadData(){try{return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY)));}catch(e){return emptyData();}}
let data=loadData();
window.mediaPromise=Promise.resolve(); // compatibilidad con firebase.js
function saveData(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));$('#lastSavedLabel').textContent='Guardado '+new Date().toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'});}
  catch(e){alert('No se pudo guardar en este dispositivo (sin espacio). Descarga un respaldo.');throw e;}
}
async function replaceAllData(next){localStorage.setItem(STORAGE_KEY,JSON.stringify(sanitize(next)));}
const S=()=>data.settings;
const clientById=id=>data.clients.find(c=>c.id===id);

/* ---------- Formatos ---------- */
const dtf=new Intl.DateTimeFormat('es-BO',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const df=new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'short',year:'numeric'});
const tf=new Intl.DateTimeFormat('es-BO',{hour:'2-digit',minute:'2-digit'});
function dayDiff(iso){const a=new Date(iso);a.setHours(0,0,0,0);const b=new Date();b.setHours(0,0,0,0);return Math.round((a-b)/864e5);}
function whenLabel(iso){
  if(!iso)return '';
  const d=dayDiff(iso),t=tf.format(new Date(iso));
  if(d===0)return 'Hoy '+t;if(d===1)return 'Mañana '+t;if(d===-1)return 'Ayer '+t;
  if(d<0&&d>=-7)return `Hace ${-d} días`;if(d>0&&d<7)return dtf.format(new Date(iso));
  return df.format(new Date(iso));
}
const money=(n,cur)=>(cur==='Bs'?'Bs ':'$us ')+Number(n||0).toLocaleString('es-BO',{maximumFractionDigits:0});
const initials=n=>n.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
function followState(c){
  if(!c.followUp||!ACTIVE_STAGES.includes(c.stage))return null;
  const due=new Date(c.followUp);
  if(due<new Date()&&dayDiff(c.followUp)<0)return 'late';
  if(dayDiff(c.followUp)===0)return due<new Date()?'late':'today';
  return 'future';
}

/* ---------- Teléfonos (Bolivia) ---------- */
function waNumber(phone){let d=String(phone||'').replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);if(d.length===8&&/^[67]/.test(d))d='591'+d;return d;}
function waLink(c){const first=(c.name||'').trim().split(/\s+/)[0]||'';const text=(S().greeting||'').replace(/\{nombre\}/g,first);return `https://wa.me/${waNumber(c.phone)}${text?'?text='+encodeURIComponent(text):''}`;}
const telLink=p=>'tel:'+String(p||'').replace(/[^\d+]/g,'');
const samePhone=(a,b)=>{const x=waNumber(a),y=waNumber(b);return x&&y&&x.slice(-8)===y.slice(-8);};

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600);}

/* ---------- Navegación ---------- */
let currentView='todayView';
function showView(id){
  currentView=id;
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  $$('.tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.view===id));
  $('#fab').hidden=!(id==='todayView'||id==='clientsView');
  render();window.scrollTo(0,0);
}

/* ---------- Render general ---------- */
function render(){
  if(currentView==='todayView')renderToday();
  else if(currentView==='clientsView')renderClients();
  else if(currentView==='visitsView')renderVisits();
  else if(currentView==='statsView')renderStats();
  else if(currentView==='settingsView')renderSettings();
}
function clientItem(c,extra=''){
  const fs=followState(c);
  const badge=fs==='late'?'<span class="badge late">Atrasado</span>':fs==='today'?'<span class="badge today">Hoy</span>':'';
  const want=[c.operation&&({venta:'Compra',alquiler:'Alquiler',anticretico:'Anticrético'}[c.operation]),c.type,c.zone,c.budget&&money(c.budget,c.currency)].filter(Boolean).join(' · ');
  return `<div class="item" data-client="${c.id}">
    <div class="avatar">${esc(initials(c.name))}<i class="p-${esc(c.priority||'tibia')}"></i></div>
    <div class="item-main"><strong>${esc(c.name)}</strong>
      <small>${badge}<span class="badge">${esc(STAGE_LABEL[c.stage]||'')}</span>${extra||esc(want||c.phone)}</small></div>
    <div class="item-actions"><a class="round wa" href="${waLink(c)}" target="_blank" rel="noopener" data-contact="whatsapp" data-id="${c.id}" aria-label="WhatsApp">💬</a><a class="round" href="${telLink(c.phone)}" data-contact="llamada" data-id="${c.id}" aria-label="Llamar">📞</a></div>
  </div>`;
}
const emptyMsg=t=>`<div class="empty">${t}</div>`;
const kpi=(label,value,cls='')=>`<div class="kpi ${cls}"><span>${label}</span><strong>${value}</strong></div>`;

function renderToday(){
  const active=data.clients.filter(c=>ACTIVE_STAGES.includes(c.stage));
  const late=active.filter(c=>followState(c)==='late').sort((a,b)=>a.followUp.localeCompare(b.followUp));
  const today=active.filter(c=>followState(c)==='today').sort((a,b)=>a.followUp.localeCompare(b.followUp));
  const fresh=data.clients.filter(c=>c.stage==='nuevo'&&!c.log.some(l=>l.type!=='etapa')).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  const now=nowISO(),week=addDays(7,23);
  const visits=data.visits.filter(v=>v.status==='programada'&&v.date>=now.slice(0,10)&&v.date<=week).sort((a,b)=>a.date.localeCompare(b.date));
  $('#todayKpis').innerHTML=kpi('Clientes activos',active.length)+kpi('Atrasados',late.length,late.length?'alert':'')+kpi('Para hoy',today.length)+kpi('Visitas 7 días',visits.length);
  $('#overdueList').innerHTML=late.map(c=>clientItem(c,esc(whenLabel(c.followUp)))).join('')||emptyMsg('¡Al día! No tienes seguimientos atrasados.');
  $('#todayList').innerHTML=today.map(c=>clientItem(c,esc(whenLabel(c.followUp)))).join('')||emptyMsg('Nada programado para hoy.');
  $('#upcomingVisits').innerHTML=visits.map(visitItem).join('')||emptyMsg('Sin visitas programadas esta semana.');
  $('#newList').innerHTML=fresh.slice(0,10).map(c=>clientItem(c)).join('')||emptyMsg('Todos tus clientes nuevos ya fueron contactados.');
}

function matchesQuery(c,q){
  if(!q)return true;
  const code=normalizeCode(q);
  if(code&&c.properties.some(p=>p.code===code))return true;
  const digits=q.replace(/\D/g,'');
  if(digits.length>=4&&(waNumber(c.phone).includes(digits)||waNumber(c.phone2).includes(digits)))return true;
  const hay=[c.name,c.zone,c.notes,c.type,c.source,...c.tags,...c.properties.map(p=>p.code+' '+(p.note||''))].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  return q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/\s+/).every(w=>hay.includes(w));
}
function renderClients(){
  const q=$('#clientSearch').value.trim(),st=$('#filterStage').value,pr=$('#filterPriority').value,so=$('#filterSource').value,sort=$('#sortClients').value;
  let list=data.clients.filter(c=>(!st||c.stage===st)&&(!pr||c.priority===pr)&&(!so||c.source===so)&&matchesQuery(c,q));
  const far='9999';
  if(sort==='follow')list.sort((a,b)=>((ACTIVE_STAGES.includes(a.stage)&&a.followUp)||far).localeCompare((ACTIVE_STAGES.includes(b.stage)&&b.followUp)||far)||(PRIORITY_ORDER[a.priority]-PRIORITY_ORDER[b.priority]));
  else if(sort==='recent')list.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  else list.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  $('#clientCount').textContent=`${list.length} de ${data.clients.length} clientes`;
  $('#clientList').innerHTML=list.map(c=>clientItem(c,c.followUp&&ACTIVE_STAGES.includes(c.stage)?esc(whenLabel(c.followUp)+' · '+(c.phone||'')):'')).join('')||emptyMsg(data.clients.length?'Ningún cliente coincide con la búsqueda.':'Aún no tienes clientes. Toca + para agregar el primero.');
}

/* ---------- Ficha de cliente ---------- */
let editing=null; // copia de trabajo del cliente abierto
function fillSelect(sel,opts,first){sel.innerHTML=(first?`<option value="">${first}</option>`:'')+opts.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('');}
function openDialog(d){d.showModal();history.pushState({dialog:d.id},'');}
function closeDialog(d){if(d.open){d.close();if(history.state&&history.state.dialog===d.id)history.back();}}
addEventListener('popstate',()=>{$$('dialog[open]').forEach(d=>d.close());});

function openClient(id){
  const c=id?clientById(id):null;
  editing=c?JSON.parse(JSON.stringify(c)):{id:'',properties:[],log:[],tags:[]};
  $('#clientTitle').textContent=c?c.name:'Nuevo cliente';
  $('#cId').value=c?c.id:'';
  $('#cName').value=c?.name||'';$('#cPhone').value=c?.phone||'';$('#cPhone2').value=c?.phone2||'';
  $('#cSource').value=c?.source||SOURCES[0];$('#cPriority').value=c?.priority||'tibia';$('#cTags').value=(c?.tags||[]).join(', ');
  $('#cStage').value=c?.stage||'nuevo';$('#cFollowUp').value=c?c.followUp||'':addDays(0,new Date().getHours()+2>22?22:new Date().getHours()+2);
  $('#cLostReason').value=c?.lostReason||'';
  const k=c?.closing||{};$('#kDate').value=k.date||todayStr();$('#kCode').value=k.code||(c?.properties.at(-1)?.code||'');$('#kAmount').value=k.amount||'';$('#kCurrency').value=k.currency||'USD';$('#kPct').value=k.pct??S().commission;
  $('#cOperation').value=c?.operation||'';$('#cType').value=c?.type||'';$('#cBudget').value=c?.budget||'';$('#cCurrency').value=c?.currency||'USD';
  $('#cZone').value=c?.zone||'';$('#cBedrooms').value=c?.bedrooms??'';$('#cPayment').value=c?.payment||'';$('#cNotes').value=c?.notes||'';
  $('#codeInput').value='';$('#codeNote').value='';$('#codeError').hidden=true;$('#logNote').value='';$('#dupWarning').hidden=true;
  $('#deleteClient').hidden=!c;$('#historyBox').hidden=false;
  renderContactBar();renderCodes();renderLog();toggleStageBoxes();calcCommission();
  openDialog($('#clientDialog'));
  if(!c)$('#cName').focus();
}
function renderContactBar(){
  const phone=$('#cPhone').value.trim();
  $('#contactBar').innerHTML=phone&&$('#cId').value?`<a class="wa" href="${waLink({name:$('#cName').value,phone})}" target="_blank" rel="noopener" data-contact="whatsapp" data-id="${$('#cId').value}">💬 WhatsApp</a><a class="call" href="${telLink(phone)}" data-contact="llamada" data-id="${$('#cId').value}">📞 Llamar</a>`:'';
}
function renderCodes(){
  $('#codeList').innerHTML=editing.properties.map((p,i)=>`<div class="code"><strong>${esc(p.code)}</strong><span>${esc(p.note||'')}${p.date?' · '+esc(df.format(new Date(p.date))):''}</span><button type="button" data-del-code="${i}" aria-label="Quitar">✕</button></div>`).join('')||'<p class="muted small">Aún no hay propiedades registradas.</p>';
}
function renderLog(){
  $('#logList').innerHTML=[...editing.log].sort((a,b)=>b.date.localeCompare(a.date)).map(l=>`<div class="log"><small><span>${LOG_ICON[l.type]||'•'} ${esc(dtf.format(new Date(l.date)))}</span><button type="button" data-del-log="${l.id}" aria-label="Borrar">✕</button></small><p>${esc(l.note)}</p></div>`).join('')||'<p class="muted small">Sin interacciones registradas.</p>';
}
function toggleStageBoxes(){const s=$('#cStage').value;$('#lostBox').hidden=s!=='perdido';$('#closeBox').hidden=s!=='cerrado';}
function commissionBs(k){if(!k||!k.amount)return 0;const v=k.amount*(k.pct||0)/100;return k.currency==='USD'?v*S().rate:v;}
function calcCommission(){const k={amount:+$('#kAmount').value,pct:+$('#kPct').value,currency:$('#kCurrency').value};const bs=commissionBs(k);$('#kResult').textContent=bs?`Bs ${bs.toLocaleString('es-BO',{maximumFractionDigits:0})}`+(k.currency==='USD'?` ($us ${(bs/S().rate).toLocaleString('es-BO',{maximumFractionDigits:0})})`:''):'—';}
function checkDuplicate(){
  const p=$('#cPhone').value,id=$('#cId').value;
  const dup=p.replace(/\D/g,'').length>=7&&data.clients.find(c=>c.id!==id&&(samePhone(c.phone,p)||samePhone(c.phone2,p)));
  $('#dupWarning').hidden=!dup;if(dup)$('#dupWarning').textContent=`⚠ Ya existe un cliente con este celular: ${dup.name}`;
}
function addCode(){
  const code=normalizeCode($('#codeInput').value);
  if(!code){$('#codeError').textContent='Código no válido. Ejemplos: DOM-000123, 123';$('#codeError').hidden=false;return;}
  $('#codeError').hidden=true;
  const note=$('#codeNote').value.trim(),ex=editing.properties.find(p=>p.code===code);
  if(ex){if(note)ex.note=note;}else editing.properties.push({code,note,date:todayStr()});
  $('#codeInput').value='';$('#codeNote').value='';renderCodes();
  if(!$('#kCode').value)$('#kCode').value=code;
}
function addLog(){
  const note=$('#logNote').value.trim();if(!note){$('#logNote').focus();return;}
  editing.log.push({id:uid(),type:$('#logType').value,date:nowISO(),note});
  $('#logNote').value='';renderLog();
  // al registrar un contacto, sugerir el próximo seguimiento
  if(!$('#cFollowUp').value||new Date($('#cFollowUp').value)<new Date())$('#cFollowUp').value=addDays(+S().followDays||3);
  if($('#cStage').value==='nuevo'&&$('#logType').value!=='nota'){$('#cStage').value='contactado';toggleStageBoxes();}
}
function saveClient(){
  const name=$('#cName').value.trim(),phone=$('#cPhone').value.trim();
  if(!name||!phone){toast('Nombre y celular son obligatorios');return false;}
  const id=$('#cId').value||uid(),prev=clientById(id),now=nowISO(),stage=$('#cStage').value;
  const c={...editing,id,name,phone,phone2:$('#cPhone2').value.trim(),source:$('#cSource').value,priority:$('#cPriority').value,
    tags:$('#cTags').value.split(',').map(t=>t.trim()).filter(Boolean),stage,followUp:$('#cFollowUp').value,
    lostReason:stage==='perdido'?$('#cLostReason').value:'',operation:$('#cOperation').value,type:$('#cType').value,
    budget:+$('#cBudget').value||0,currency:$('#cCurrency').value,zone:$('#cZone').value.trim(),bedrooms:$('#cBedrooms').value===''?'':+$('#cBedrooms').value,
    payment:$('#cPayment').value,notes:$('#cNotes').value.trim(),createdAt:prev?.createdAt||now,updatedAt:now};
  if(stage==='cerrado'){const code=normalizeCode($('#kCode').value);c.closing={date:$('#kDate').value||todayStr(),code:code||'',amount:+$('#kAmount').value||0,currency:$('#kCurrency').value,pct:+$('#kPct').value||0};}
  else delete c.closing;
  if(!prev||prev.stage!==stage){c.stageDate=now;if(prev)c.log.push({id:uid(),type:'etapa',date:now,note:`Etapa: ${STAGE_LABEL[prev.stage]} → ${STAGE_LABEL[stage]}`});}
  if(prev)Object.assign(prev,c);else data.clients.push(c);
  saveData();toast(prev?'Cliente actualizado':'Cliente creado');render();return true;
}
function deleteClient(){
  const id=$('#cId').value,c=clientById(id);if(!c)return;
  const nv=data.visits.filter(v=>v.clientId===id).length;
  if(!confirm(`¿Eliminar a ${c.name}?${nv?`\nTambién se borrarán sus ${nv} visitas.`:''}\nEsta acción no se puede deshacer.`))return;
  data.clients=data.clients.filter(x=>x.id!==id);data.visits=data.visits.filter(v=>v.clientId!==id);
  saveData();closeDialog($('#clientDialog'));render();toast('Cliente eliminado');
}
function logContact(id,type){
  const c=clientById(id);if(!c||!S().autoLog)return;
  const now=nowISO();
  const entry={id:uid(),type,date:now,note:type==='whatsapp'?'Escribí por WhatsApp':'Llamé'};
  c.log.push(entry);
  if(c.stage==='nuevo'){c.stage='contactado';c.stageDate=now;}
  if(!c.followUp||new Date(c.followUp)<new Date())c.followUp=addDays(+S().followDays||3);
  c.updatedAt=now;saveData();
  if(editing&&editing.id===id&&$('#clientDialog').open){
    editing.log.push({...entry});editing.stage=c.stage;editing.stageDate=c.stageDate;renderLog();
    if($('#cStage').value==='nuevo'){$('#cStage').value=c.stage;toggleStageBoxes();}
    if(!$('#cFollowUp').value||new Date($('#cFollowUp').value)<new Date())$('#cFollowUp').value=c.followUp;
  }
  setTimeout(render,300);
}

/* ---------- Visitas ---------- */
let visitTab='next';
const VISIT_LABEL={programada:'Programada',realizada:'Realizada',no_asistio:'No asistió',cancelada:'Cancelada'};
function visitItem(v){
  const c=clientById(v.clientId);
  return `<div class="item" data-visit="${v.id}"><div class="avatar">🏠</div><div class="item-main"><strong>${esc(v.code)} · ${esc(c?c.name:'(cliente eliminado)')}</strong><small><span class="badge">${VISIT_LABEL[v.status]}</span>${esc(whenLabel(v.date))}${v.note?' · '+esc(v.note):''}</small></div>${c?`<div class="item-actions"><a class="round wa" href="${waLink(c)}" target="_blank" rel="noopener" aria-label="WhatsApp">💬</a></div>`:''}</div>`;
}
function renderVisits(){
  const now=nowISO();
  const list=data.visits.filter(v=>visitTab==='next'?(v.status==='programada'&&v.date>=now.slice(0,10)):!(v.status==='programada'&&v.date>=now.slice(0,10)));
  list.sort((a,b)=>visitTab==='next'?a.date.localeCompare(b.date):b.date.localeCompare(a.date));
  $('#visitList').innerHTML=list.map(visitItem).join('')||emptyMsg(visitTab==='next'?'No tienes visitas programadas.':'Aún no hay visitas anteriores.');
}
function openVisit(id,clientId){
  if(!data.clients.length){toast('Primero agrega un cliente');return;}
  const v=id?data.visits.find(x=>x.id===id):null;
  $('#visitTitle').textContent=v?'Editar visita':'Nueva visita';
  $('#vClient').innerHTML=[...data.clients].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#vId').value=v?.id||'';$('#vClient').value=v?.clientId||clientId||$('#vClient').value;
  $('#vCode').value=v?.code||(clientId?clientById(clientId)?.properties.at(-1)?.code||'':'');
  $('#vDate').value=v?.date||addDays(1,10);$('#vStatus').value=v?.status||'programada';$('#vNote').value=v?.note||'';
  $('#deleteVisit').hidden=!v;
  openDialog($('#visitDialog'));
}
function saveVisit(){
  const code=normalizeCode($('#vCode').value);if(!code){toast('Código no válido (ej.: DOM-000123)');return false;}
  const id=$('#vId').value||uid(),prev=data.visits.find(v=>v.id===id),now=nowISO();
  const v={id,clientId:$('#vClient').value,code,date:$('#vDate').value,status:$('#vStatus').value,note:$('#vNote').value.trim(),updatedAt:now};
  const c=clientById(v.clientId);
  if(c){
    if(!c.properties.some(p=>p.code===code))c.properties.push({code,note:'Visita',date:todayStr()});
    if(!prev&&['nuevo','contactado'].includes(c.stage)){c.log.push({id:uid(),type:'etapa',date:now,note:`Etapa: ${STAGE_LABEL[c.stage]} → Visita`});c.stage='visita';c.stageDate=now;}
    if(v.status!=='programada'&&(!prev||prev.status!==v.status))c.log.push({id:uid(),type:'visita',date:now,note:`Visita ${code}: ${VISIT_LABEL[v.status]}${v.note?' — '+v.note:''}`});
    c.updatedAt=now;
  }
  if(prev)Object.assign(prev,v);else data.visits.push(v);
  saveData();toast('Visita guardada');render();return true;
}

/* ---------- Estadísticas ---------- */
function periodRange(p){
  const n=new Date(),y=n.getFullYear(),m=n.getMonth();
  if(p==='month')return [localISO(new Date(y,m,1)),localISO(new Date(y,m+1,1))];
  if(p==='prev')return [localISO(new Date(y,m-1,1)),localISO(new Date(y,m,1))];
  if(p==='year')return [localISO(new Date(y,0,1)),localISO(new Date(y+1,0,1))];
  return ['0000','9999'];
}
function bars(entries){const max=Math.max(1,...entries.map(e=>e[1]));return entries.map(([l,v])=>`<div class="bar"><span>${esc(l)}</span><div><i style="width:${v/max*100}%"></i></div><b>${v}</b></div>`).join('')||emptyMsg('Sin datos en este periodo.');}
function renderStats(){
  const [a,b]=periodRange($('#statsPeriod').value),inP=d=>d&&d>=a&&d<b;
  const fresh=data.clients.filter(c=>inP(c.createdAt));
  const closed=data.clients.filter(c=>c.stage==='cerrado'&&inP(c.closing?.date||c.stageDate));
  const lost=data.clients.filter(c=>c.stage==='perdido'&&inP(c.stageDate));
  const comm=closed.reduce((s,c)=>s+commissionBs(c.closing),0);
  const rate=closed.length+lost.length?Math.round(closed.length/(closed.length+lost.length)*100)+'%':'—';
  $('#statsKpis').innerHTML=kpi('Clientes nuevos',fresh.length)+kpi('Cierres',closed.length)+kpi('Comisión (Bs)',Math.round(comm).toLocaleString('es-BO'))+kpi('Tasa de cierre',rate);
  $('#funnel').innerHTML=bars(STAGES.map(([k,l])=>[l,data.clients.filter(c=>c.stage===k).length]));
  const bySrc={};fresh.forEach(c=>{bySrc[c.source||'Otro']=(bySrc[c.source||'Otro']||0)+1;});
  $('#bySource').innerHTML=bars(Object.entries(bySrc).sort((x,y)=>y[1]-x[1]));
  $('#closingsList').innerHTML=closed.sort((x,y)=>(y.closing?.date||'').localeCompare(x.closing?.date||'')).map(c=>clientItem(c,esc([c.closing?.code,c.closing?.amount&&money(c.closing.amount,c.closing.currency),commissionBs(c.closing)&&'Comisión Bs '+Math.round(commissionBs(c.closing)).toLocaleString('es-BO')].filter(Boolean).join(' · ')))).join('')||emptyMsg('Sin cierres en este periodo.');
  const lr={};lost.forEach(c=>{const r=c.lostReason||'Sin motivo';lr[r]=(lr[r]||0)+1;});
  $('#lostReasons').innerHTML=bars(Object.entries(lr).sort((x,y)=>y[1]-x[1]));
}

/* ---------- Ajustes, tema y respaldos ---------- */
function renderSettings(){
  const s=S();$('#setName').value=s.name||'';$('#setRate').value=s.rate;$('#setCommission').value=s.commission;$('#setFollowDays').value=s.followDays;$('#setGreeting').value=s.greeting||'';$('#setAutoLog').checked=!!s.autoLog;
  const t=localStorage.getItem('crm_theme')||'auto';$$('#themeTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  $('#appVersion').textContent='versión '+APP_VERSION;
}
function applyTheme(){const t=localStorage.getItem('crm_theme')||'auto';if(t==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=t;}
function download(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}
function exportCsv(){
  const cols=[['Nombre','name'],['Celular','phone'],['Celular 2','phone2'],['Etapa',c=>STAGE_LABEL[c.stage]],['Prioridad','priority'],['Origen','source'],['Etiquetas',c=>c.tags.join(', ')],['Operación','operation'],['Tipo','type'],['Zona','zone'],['Presupuesto',c=>c.budget||''],['Moneda','currency'],['Dormitorios','bedrooms'],['Forma de pago','payment'],['Próximo seguimiento','followUp'],['Propiedades',c=>c.properties.map(p=>p.code).join(' ')],['Notas','notes'],['Creado','createdAt']];
  const cell=v=>{v=String(v??'');return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const rows=[cols.map(c=>c[0]),...data.clients.map(c=>cols.map(([,k])=>typeof k==='function'?k(c):c[k]))];
  download(`clientes-${todayStr()}.csv`,'﻿'+rows.map(r=>r.map(cell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
}

/* ---------- Eventos ---------- */
function init(){
  applyTheme();
  fillSelect($('#filterStage'),STAGES,'Todas las etapas');fillSelect($('#cStage'),STAGES);
  fillSelect($('#filterSource'),SOURCES.map(s=>[s,s]),'Todo origen');fillSelect($('#cSource'),SOURCES.map(s=>[s,s]));
  $$('.tabbar button').forEach(b=>b.onclick=()=>showView(b.dataset.view));
  $('#fab').onclick=()=>openClient(null);
  ['#clientSearch','#filterStage','#filterPriority','#filterSource','#sortClients'].forEach(s=>$(s).addEventListener('input',renderClients));
  $('#statsPeriod').onchange=renderStats;
  $$('#visitTabs button').forEach(b=>b.onclick=()=>{visitTab=b.dataset.v;$$('#visitTabs button').forEach(x=>x.classList.toggle('on',x===b));renderVisits();});
  $('#newVisitBtn').onclick=()=>openVisit(null);

  // Clic en listas: abrir cliente/visita o registrar contacto
  document.addEventListener('click',e=>{
    const contact=e.target.closest('[data-contact]');
    if(contact){e.stopPropagation();logContact(contact.dataset.id,contact.dataset.contact);return;}
    if(e.target.closest('a'))return;
    const ci=e.target.closest('[data-client]');if(ci&&!ci.closest('dialog')){openClient(ci.dataset.client);return;}
    const vi=e.target.closest('[data-visit]');if(vi){openVisit(vi.dataset.visit);return;}
  });
  $$('[data-close]').forEach(b=>b.onclick=()=>closeDialog(b.closest('dialog')));

  // Ficha de cliente
  $('#clientForm').addEventListener('submit',e=>{e.preventDefault();if(saveClient())closeDialog($('#clientDialog'));});
  $('#cStage').onchange=toggleStageBoxes;
  $('#cPhone').addEventListener('input',()=>{checkDuplicate();renderContactBar();});
  ['#kAmount','#kPct','#kCurrency'].forEach(s=>$(s).addEventListener('input',calcCommission));
  $('#kCode').addEventListener('change',()=>{const c=normalizeCode($('#kCode').value);if(c)$('#kCode').value=c;});
  $('#addCode').onclick=addCode;
  $('#codeInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCode();}});
  $('#codeNote').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCode();}});
  $('#codeList').addEventListener('click',e=>{const b=e.target.closest('[data-del-code]');if(b){editing.properties.splice(+b.dataset.delCode,1);renderCodes();}});
  $('#addLog').onclick=addLog;
  $('#logNote').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addLog();}});
  $('#logList').addEventListener('click',e=>{const b=e.target.closest('[data-del-log]');if(b&&confirm('¿Borrar esta interacción?')){editing.log=editing.log.filter(l=>l.id!==b.dataset.delLog);renderLog();}});
  $('#deleteClient').onclick=deleteClient;

  // Visitas
  $('#visitForm').addEventListener('submit',e=>{e.preventDefault();if(saveVisit())closeDialog($('#visitDialog'));});
  $('#vCode').addEventListener('change',()=>{const c=normalizeCode($('#vCode').value);if(c)$('#vCode').value=c;});
  $('#deleteVisit').onclick=()=>{if(!confirm('¿Eliminar esta visita?'))return;data.visits=data.visits.filter(v=>v.id!==$('#vId').value);saveData();closeDialog($('#visitDialog'));render();};

  // Ajustes
  $('#settingsForm').addEventListener('submit',e=>{e.preventDefault();Object.assign(data.settings,{name:$('#setName').value.trim(),rate:+$('#setRate').value||6.96,commission:+$('#setCommission').value||0,followDays:Math.max(1,+$('#setFollowDays').value||3),greeting:$('#setGreeting').value,autoLog:$('#setAutoLog').checked});saveData();toast('Ajustes guardados');});
  $$('#themeTabs button').forEach(b=>b.onclick=()=>{try{localStorage.setItem('crm_theme',b.dataset.t);}catch(e){}applyTheme();renderSettings();});
  $('#exportJson').onclick=()=>download(`respaldo-crm-${todayStr()}.json`,JSON.stringify(data,null,1),'application/json');
  $('#exportCsv').onclick=exportCsv;
  $('#importJsonBtn').onclick=()=>$('#importJson').click();
  $('#importJson').onchange=async e=>{
    const f=e.target.files[0];e.target.value='';if(!f)return;
    try{const next=sanitize(JSON.parse(await f.text()));
      if(!confirm(`El respaldo tiene ${next.clients.length} clientes y ${next.visits.length} visitas.\n¿Reemplazar los datos actuales?`))return;
      data=next;saveData();render();toast('Respaldo restaurado');}
    catch(err){alert('El archivo no es un respaldo válido.');}
  };
  $('#wipeAll').onclick=()=>{if(prompt('Escribe BORRAR para eliminar todos los datos de este dispositivo')!=='BORRAR')return;data=emptyData();saveData();render();toast('Datos borrados');};

  // Volver a calcular "atrasado/hoy" cada minuto
  setInterval(()=>{if(!$$('dialog[open]').length)render();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$$('dialog[open]').length)render();});

  if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))registerSW();
  showView('todayView');
}
function registerSW(){
  navigator.serviceWorker.register('service-worker.js').then(reg=>{
    const ask=w=>{if(confirm('Hay una versión nueva de la app. ¿Actualizar ahora?'))w.postMessage('SKIP_WAITING');};
    if(reg.waiting&&navigator.serviceWorker.controller)ask(reg.waiting);
    reg.addEventListener('updatefound',()=>{const w=reg.installing;if(w)w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)ask(w);});});
    let reloaded=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloaded){reloaded=true;location.reload();}});
  }).catch(()=>{});
}
document.addEventListener('DOMContentLoaded',init);
