/* Etapa 6: onboarding, datos de prueba, respaldo y distribución. */
const demoNow=()=>new Date().toISOString();
function demoData(){const created=demoNow();const ownerId='owner-demo-1',propId='prop-demo-1',clientId='client-demo-1';return {owner:{id:ownerId,name:'Propietario de ejemplo',phone:'70000000',email:'ejemplo@correo.com',stage:'contacted',nextDate:new Date(Date.now()+86400000*3).toISOString().slice(0,10),notes:'Registro de ejemplo para conocer el módulo de captación.',createdAt:created,updatedAt:created},property:{id:propId,code:'DEMO-001',operation:'venta',propertyType:'departamento',zone:'Centro',address:'Av. Principal 123',reference:'Cerca de la plaza',priceBs:420000,priceUsd:60345,bedrooms:2,bathrooms:2,landArea:0,builtArea:92,floor:'3',status:'disponible',ownerId,ownerName:'Propietario de ejemplo',ownerPhone:'70000000',services:{water:true,electricity:true,gas:true,internet:true},furnished:false,notes:'Propiedad de ejemplo. Reemplaza estos datos por información real.',photos:[],documents:[{name:'Folio real',checked:false},{name:'Impuestos al día',checked:false},{name:'Plano',checked:false},{name:'Carnet del propietario',checked:false}],priceHistory:[{priceBs:420000,priceUsd:60345,date:created}],createdAt:created,updatedAt:created},client:{id:clientId,name:'Cliente de ejemplo',phone:'71111111',search:'Departamento de 2 dormitorios',budgetBs:450000,zone:'Centro',operation:'venta',propertyType:'departamento',bedrooms:2,source:'Referido',followUpAt:new Date(Date.now()+86400000).toISOString().slice(0,16),status:'nuevo',notes:'Cliente creado para probar el pipeline.',interestedPropertyIds:[propId],interactions:[],createdAt:created,updatedAt:created}};}
function loadDemoData(){if(data.properties.length||data.clients.length||data.owners.length){if(!confirm('Ya tienes datos. ¿Agregar los ejemplos sin borrar los actuales?'))return;}const d=demoData(),next=clone(data);if(!next.owners.some(x=>x.id===d.owner.id))next.owners.push(d.owner);if(!next.properties.some(x=>x.id===d.property.id))next.properties.push(d.property);if(!next.clients.some(x=>x.id===d.client.id))next.clients.push(d.client);next.counters.property=Math.max(next.counters.property,2);next.counters.owner=Math.max(next.counters.owner,2);next.counters.client=Math.max(next.counters.client,2);if(commit(next)){renderProperties();renderClients();renderOwners();renderReports();updateDashboard();toast('Datos de ejemplo cargados');}}
function clearAllData(){if(!confirm('Se borrarán propiedades, clientes, propietarios, visitas, cierres y biblioteca. Descarga primero un respaldo. ¿Continuar?'))return;const next=clone(DEFAULT_DATA);next.settings={...clone(data.settings),onboardingCompleted:true};if(commit(next)){renderProperties();renderClients();renderOwners();renderClosures();renderLibrary();renderReports();updateDashboard();toast('Datos eliminados');}}
function saveOnboarding(e){e.preventDefault();const rate=Number($('#onboardingRate').value),commission=Number($('#onboardingCommission').value),days=Number($('#onboardingFollowDays').value);if(!Number.isFinite(rate)||rate<=0||!Number.isFinite(commission)||commission<0||commission>100||!Number.isFinite(days)||days<1){toast('Revisa los valores de configuración');return;}const next=clone(data);next.settings.advisor={name:$('#onboardingName').value.trim(),phone:$('#onboardingPhone').value.trim(),agency:$('#onboardingAgency').value.trim()};next.settings.exchangeRate=rate;next.settings.defaultCommission=commission;next.settings.followUpDays=days;next.settings.onboardingCompleted=true;if($('#onboardingDemo').checked){const d=demoData();next.owners.push(d.owner);next.properties.push(d.property);next.clients.push(d.client);next.counters.property=Math.max(next.counters.property,2);next.counters.owner=Math.max(next.counters.owner,2);next.counters.client=Math.max(next.counters.client,2);}if(commit(next)){$('#onboardingDialog').close();loadSettings();renderProperties();renderClients();renderOwners();renderReports();updateDashboard();toast('Configuración inicial guardada');}}
function openOnboarding(){const a=data.settings.advisor||{};$('#onboardingName').value=a.name||'';$('#onboardingPhone').value=a.phone||'';$('#onboardingAgency').value=a.agency||'';$('#onboardingRate').value=data.settings.exchangeRate||6.96;$('#onboardingCommission').value=data.settings.defaultCommission??3;$('#onboardingFollowDays').value=data.settings.followUpDays||7;$('#onboardingDemo').checked=false;$('#onboardingDialog').showModal();}
function updateBackupReminder(){const node=$('#backupReminder');if(!node)return;const last=data.settings.lastBackupAt;if(!last){node.textContent='Aún no tienes un respaldo descargado.';node.className='backup-reminder warning';return;}const days=Math.floor((Date.now()-new Date(last).getTime())/86400000);node.textContent=days>=7?`Último respaldo hace ${days} días. Descarga uno nuevo.`:`Último respaldo: ${new Date(last).toLocaleString('es-BO')}`;node.className='backup-reminder '+(days>=7?'warning':'ok');}
async function shareApplication(){const url=location.protocol==='file:'?'Copia la carpeta completa y compártela como ZIP.':location.href;try{if(navigator.share){await navigator.share({title:'Mi CRM Inmobiliario',text:'Aplicación CRM para gestión inmobiliaria',url});}else{await navigator.clipboard.writeText(url);toast('Enlace copiado');}}catch(error){if(error.name!=='AbortError')toast('Copia la dirección desde el navegador');}}
function stage6Init(){const actions={"new-client":()=>openClientDialog(),"new-visit":()=>{if(typeof openVisitDialog==='function')openVisitDialog();},"open-onboarding":openOnboarding};$$('[data-action]').forEach(b=>{const action=b.dataset.action;if(actions[action])b.onclick=actions[action];});$('#loadDemoButton').onclick=loadDemoData;$('#clearDemoButton').onclick=clearAllData;$('#shareAppButton').onclick=shareApplication;$('#onboardingForm').onsubmit=saveOnboarding;$('#closeOnboardingDialog').onclick=()=>$('#onboardingDialog').close();$('#skipOnboardingButton').onclick=()=>{$('#onboardingDialog').close();const next=clone(data);next.settings.onboardingCompleted=true;commit(next);};updateBackupReminder();const hadSetup=data.settings.onboardingCompleted;if(!hadSetup&&!data.properties.length&&!data.clients.length)setTimeout(openOnboarding,300);}
document.addEventListener('DOMContentLoaded',stage6Init);

/* Teléfonos de Bolivia: 8 dígitos -> +591 al salir del campo. */
document.addEventListener('focusout',e=>{const el=e.target;if(!el.matches||!el.matches('input[inputmode="tel"]'))return;const d=el.value.replace(/\D/g,'');if(d.length===8&&!el.value.trim().startsWith('+'))el.value='+591 '+d;});

/* Inicio: panel "Para hoy" (visitas del día y seguimientos) con Llamar / WhatsApp. */
function renderToday(){
  const box=document.getElementById('todayPanel');if(!box)return;
  const today=localDay(new Date()),tm=t=>new Date(t).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'}),start=new Date();start.setHours(0,0,0,0);
  const acts=c=>c?`<span class="today-actions"><a class="secondary-button" href="tel:+${phoneForWhatsApp(c.phone)}">Llamar</a><button type="button" class="secondary-button" data-today-wa="${esc(c.id)}">WhatsApp</button></span>`:'';
  const visits=data.visits.filter(v=>v.status==='scheduled'&&localDay(new Date(v.startsAt))===today).sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt));
  const fu=data.clients.filter(c=>c.followUpAt&&new Date(c.followUpAt)<=new Date(Date.now()+86400000)&&!['cerrado','perdido'].includes(c.status)).sort((a,b)=>new Date(a.followUpAt)-new Date(b.followUpAt));
  const vr=visits.map(v=>{const c=data.clients.find(x=>x.id===v.clientId),p=data.properties.find(x=>x.id===v.propertyId);return `<div class="compact-item"><span><strong>${tm(v.startsAt)} · ${esc(c?c.name:'Cliente')}</strong><br><small class="muted">${esc(p?p.code+' · '+p.zone:'Propiedad')}</small></span>${acts(c)}</div>`;}).join('');
  const fr=fu.slice(0,8).map(c=>`<div class="compact-item"><span><strong>${esc(c.name)}</strong><br><small class="muted">${new Date(c.followUpAt)<start?'Atrasado · ':''}${new Date(c.followUpAt).toLocaleDateString('es-BO')}</small></span>${acts(c)}</div>`).join('');
  box.innerHTML=`<div class="panel-heading"><h3>Para hoy</h3></div>`+(vr||fr?(vr?`<h4>Visitas (${visits.length})</h4><div class="compact-list">${vr}</div>`:'')+(fr?`<h4>Seguimientos (${fu.length})</h4><div class="compact-list">${fr}</div>${fu.length>8?'<p class="muted">Hay más en Clientes.</p>':''}`:''):'<p class="empty-state">Nada pendiente para hoy.</p>');
}
if(typeof updateDashboard==='function'){const _ud=updateDashboard;updateDashboard=function(){_ud.apply(this,arguments);renderToday();};}
document.addEventListener('click',e=>{const b=e.target.closest('[data-today-wa]');if(!b)return;const c=data.clients.find(x=>x.id===b.dataset.todayWa);if(c)openWhatsApp(c);});
try{renderToday();}catch(e){}

/* Pide al navegador no borrar los datos locales por falta de espacio. */
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}

/* Visitas programadas -> archivo .ics (Google Calendar, Apple, Outlook) con recordatorio. */
function buildIcs(){
  const start=new Date();start.setHours(0,0,0,0);
  const z=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),t=s=>String(s||'').replace(/\\/g,'\\\\').replace(/[,;]/g,m=>'\\'+m).replace(/\r?\n/g,'\\n');
  const ev=data.visits.filter(v=>v.status==='scheduled'&&new Date(v.startsAt)>=start).map(v=>{
    const c=data.clients.find(x=>x.id===v.clientId),p=data.properties.find(x=>x.id===v.propertyId),end=new Date(new Date(v.startsAt).getTime()+(v.durationMinutes||60)*60000);
    return ['BEGIN:VEVENT','UID:'+v.id+'@crm-inmobiliario','DTSTAMP:'+z(new Date()),'DTSTART:'+z(v.startsAt),'DTEND:'+z(end),
      'SUMMARY:'+t('Visita: '+(c?c.name:'Cliente')+(p?' · '+p.code:'')),'LOCATION:'+t(p?[p.address,p.zone].filter(Boolean).join(', '):''),
      'DESCRIPTION:'+t((c&&c.phone?'Tel: '+c.phone:'')+(v.notes?'\n'+v.notes:'')),
      'BEGIN:VALARM','TRIGGER:-PT'+(Number.isFinite(+v.reminderMinutes)?+v.reminderMinutes:30)+'M','ACTION:DISPLAY','DESCRIPTION:Visita','END:VALARM','END:VEVENT'].join('\r\n');});
  return {count:ev.length,text:['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CRM Inmobiliario//ES','CALSCALE:GREGORIAN',...ev,'END:VCALENDAR'].join('\r\n')};
}
document.addEventListener('click',e=>{if(!e.target.closest('#exportIcs'))return;const r=buildIcs();if(!r.count){toast('No hay visitas programadas para exportar');return;}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([r.text],{type:'text/calendar'}));a.download='visitas-crm.ics';a.click();toast(r.count+' visita(s) exportadas');});

/* Importar propiedades desde CSV (Excel > Guardar como > CSV UTF-8): actualiza por código o crea nuevas. */
(function(){
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const SYN={code:['codigo','cod','ref','codigoinmueble','codigopropiedad','idinmueble','nroinmueble','nropropiedad'],zone:['zona','barrio','ubicacion','sector'],address:['direccion','domicilio','calle'],reference:['referencia','referenciadireccion'],operation:['operacion','tipooperacion','transaccion'],propertyType:['tipo','tipoinmueble','tipopropiedad','inmueble','categoria'],priceBs:['preciobs','bs','precioenbs','bolivianos'],priceUsd:['preciousd','usd','dolares','preciosus','sus','precioendolares'],price:['precio','valor','monto'],currency:['moneda'],bedrooms:['dormitorios','habitaciones','dorm','hab'],bathrooms:['banos','bano','nbanos'],landArea:['terreno','superficieterreno','m2terreno','mt2terreno','areaterreno'],builtArea:['construccion','construido','superficieconstruida','m2construidos','m2construccion','mt2construccion','areaconstruida'],floor:['piso','nivel'],status:['estado'],ownerName:['propietario','dueno','nombrepropietario'],ownerPhone:['telefonopropietario','celularpropietario','telefono','celular','tel'],notes:['notas','observaciones','descripcion'],furnished:['amoblado','amueblado']};
const OPS=[['venta',/venta|vender/],['alquiler',/alquil|renta/],['anticretico',/antic/]];
const TYPES=[['departamento',/depart|depto|dpto|apart/],['casa',/casa|chalet/],['cuarto',/cuarto|habitaci/],['local',/local|comerc|tienda/],['terreno',/terreno|lote/],['oficina',/ofic/]];
const STAT=[['vendido',/vend|alquilad|cerrad|anticretad/],['reservado',/reserv/],['disponible',/dispon|libre/]];
const pick=(list,v)=>{const s=norm(v);if(!s)return null;const f=list.find(([,re])=>re.test(s));return f?f[0]:null;};
function parseCsv(text){text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0]||'';const del=[';','\t',','].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}else if(c==='"')q=true;else if(c===del){row.push(cur);cur='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);rows.push(row);row=[];cur='';}else cur+=c;}
  if(cur!==''||row.length){row.push(cur);rows.push(row);}return rows.filter(r=>r.some(x=>String(x).trim()!==''));}
function num(v){let s=String(v||'').replace(/[^\d.,]/g,'');if(!s)return null;const lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');
  if(lc>-1&&ld>-1){s=lc>ld?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');}
  else if(lc>-1){s=/,\d{1,2}$/.test(s)&&s.split(',').length===2?s.replace(',','.'):s.replace(/,/g,'');}
  else if(ld>-1){s=/\.\d{3}$/.test(s)||s.split('.').length>2?s.replace(/\./g,''):s;}
  const n=Number(s);return Number.isFinite(n)&&n>=0?n:null;}
function toRecords(rows){const head=rows[0].map(norm),idx={};Object.entries(SYN).forEach(([k,names])=>{const i=head.findIndex(h=>names.includes(h));if(i>-1)idx[k]=i;});const used=new Set(Object.values(idx));return {idx,ignored:rows[0].filter((h,i)=>!used.has(i)&&String(h).trim()),rows:rows.slice(1)};}
function applyImport(parsed){const {idx,rows}=parsed;if(idx.code==null)return {error:'No encontré una columna de código (por ejemplo "Código" o "Ref").'};
  const get=(r,k)=>idx[k]==null?'':String(r[idx[k]]??'').trim();
  const next=clone(data),ts=nowIso(),seen=new Set();let created=0,updated=0,skipped=0,placeholders=0;
  for(const r of rows){const code=get(r,'code');if(!code||seen.has(code.toLowerCase())){skipped++;continue;}seen.add(code.toLowerCase());
    const f={},op=pick(OPS,get(r,'operation')),ty=pick(TYPES,get(r,'propertyType')),st=pick(STAT,get(r,'status'));
    if(op)f.operation=op;if(ty)f.propertyType=ty;if(st)f.status=st;
    ['zone','address','reference','floor','ownerName','ownerPhone','notes'].forEach(k=>{const v=get(r,k);if(v)f[k]=v;});
    ['bedrooms','bathrooms','landArea','builtArea'].forEach(k=>{const v=num(get(r,k));if(v!=null)f[k]=v;});
    let bs=num(get(r,'priceBs')),us=num(get(r,'priceUsd'));
    if(idx.price!=null){const v=num(get(r,'price'));if(v!=null){if(/usd|\$|dolar|sus/i.test(get(r,'currency'))||/usd|\$|dolar/i.test(get(r,'price')))us=v;else bs=bs??v;}}
    if(bs!=null)f.priceBs=bs;if(us!=null)f.priceUsd=us;
    if(get(r,'furnished'))f.furnished=/^(si|sí|s|1|true|x)$/i.test(get(r,'furnished'));
    const ex=next.properties.find(p=>p.code.toLowerCase()===code.toLowerCase());
    if(ex){const ob=ex.priceBs,ou=ex.priceUsd;Object.assign(ex,f,{updatedAt:ts});if(ex.priceBs!==ob||ex.priceUsd!==ou)(ex.priceHistory=ex.priceHistory||[]).push({priceBs:ex.priceBs,priceUsd:ex.priceUsd,date:ts});updated++;}
    else{if(!f.zone||!f.address)placeholders++;const p={id:newId(),code,operation:'venta',propertyType:'casa',zone:'Sin zona',address:'Sin dirección',reference:'',priceBs:null,priceUsd:null,bedrooms:null,bathrooms:null,landArea:null,builtArea:null,floor:'',status:'disponible',ownerName:'',ownerPhone:'',services:{water:false,electricity:false,gas:false,internet:false},furnished:false,notes:'',photos:[],documents:['Folio real','Impuestos al día','Plano','Carnet del propietario'].map(name=>({name,checked:false})),priceHistory:[],createdAt:ts,updatedAt:ts,...f};p.priceHistory=[{priceBs:p.priceBs,priceUsd:p.priceUsd,date:ts}];next.properties.push(p);next.counters.property++;created++;}}
  return {next,created,updated,skipped,placeholders};}
window.CSVIMPORT={parseCsv,toRecords,applyImport};
document.addEventListener('click',e=>{if(e.target.closest('#importCsvButton'))document.getElementById('importCsvFile').click();});
document.addEventListener('change',async e=>{if(e.target.id!=='importCsvFile')return;const file=e.target.files[0];e.target.value='';if(!file)return;
  try{const buf=await file.arrayBuffer();let t=new TextDecoder('utf-8').decode(buf);if(t.includes('\uFFFD'))t=new TextDecoder('windows-1252').decode(buf);
    const rows=parseCsv(t);if(rows.length<2){toast('El archivo no tiene filas');return;}
    const parsed=toRecords(rows),r=applyImport(parsed);if(r.error){alert(r.error+'\nColumnas encontradas: '+rows[0].join(', '));return;}
    if(!r.created&&!r.updated){alert('No hay nada para importar.');return;}
    const msg=`Se crearán ${r.created} y se actualizarán ${r.updated} propiedades.`+(r.skipped?`\n${r.skipped} filas omitidas (sin código o repetidas).`:'')+(r.placeholders?`\n${r.placeholders} nuevas quedan con "Sin zona" o "Sin dirección" por falta de datos.`:'')+(parsed.ignored.length?`\nColumnas ignoradas: ${parsed.ignored.join(', ')}.`:'')+'\n\nSe descargará un respaldo antes de importar. ¿Continuar?';
    if(!confirm(msg))return;exportJson();if(commit(r.next)){renderProperties();updateDashboard();toast('Importación lista');}
  }catch(err){console.error(err);alert('No se pudo leer el archivo: '+err.message);}});
})();

/* Aviso de teléfono repetido al guardar cliente o propietario. */
document.addEventListener('submit',e=>{
  const f=e.target,cfg=f.id==='clientForm'?{ph:'#clientPhone',id:'#clientId',list:()=>data.clients,kind:'un cliente'}:f.id==='ownerForm'?{ph:'#ownerPhoneForm',id:'#ownerId',list:()=>data.owners,kind:'un propietario'}:null;
  if(!cfg||!f.checkValidity())return;
  const key=v=>{const d=String(v||'').replace(/\D/g,'');return d.length>=8?d.slice(-8):d;},k=key(f.querySelector(cfg.ph).value),id=f.querySelector(cfg.id).value;
  if(!k)return;const dup=cfg.list().find(x=>x.id!==id&&key(x.phone)===k);
  if(dup&&!confirm(`Ya existe ${cfg.kind} con este teléfono: ${dup.name}.\n¿Guardar de todas formas?`)){e.preventDefault();e.stopImmediatePropagation();}
},true);

/* Reportes: embudo y métricas. */
function renderMetrics(){
  const box=document.getElementById('metricsPanel');if(!box)return;
  const C=data.clients,V=data.visits,K=data.closures,P=data.properties;
  const uniq=a=>new Set(a).size,pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
  const total=C.length,visited=uniq(V.filter(v=>v.status==='completed').map(v=>v.clientId)),closedIds=new Set(K.map(k=>k.clientId));C.filter(c=>c.status==='cerrado').forEach(c=>closedIds.add(c.id));
  const closed=closedIds.size,lost=C.filter(c=>c.status==='perdido').length,neg=C.filter(c=>c.status==='negociando').length;
  const days=K.map(k=>{const c=C.find(x=>x.id===k.clientId);return c&&c.createdAt&&k.date?(new Date(k.date)-new Date(c.createdAt))/86400000:null;}).filter(d=>d!=null&&d>=0);
  const avg=days.length?Math.round(days.reduce((a,b)=>a+b,0)/days.length)+' días':'—';
  const com=k=>(k.amountBs||0)*(k.rate||0)/100,paid=K.filter(k=>k.paid).reduce((s,k)=>s+com(k),0),due=K.filter(k=>!k.paid).reduce((s,k)=>s+com(k),0);
  const rate=data.settings.exchangeRate||1,pc=(data.settings.defaultCommission??3)/100;
  const proj=P.filter(p=>p.status==='reservado').reduce((s,p)=>s+(p.priceBs||(p.priceUsd||0)*rate)*pc,0);
  const labels={};document.querySelectorAll('#clientSource option').forEach(o=>{labels[o.value]=o.textContent;});
  const src=new Map();C.forEach(c=>{const k=c.source||'';const r=src.get(k)||{n:0,c:0};r.n++;if(closedIds.has(c.id))r.c++;src.set(k,r);});
  const rows=[...src].sort((a,b)=>b[1].n-a[1].n).map(([k,r])=>`<tr><td>${esc(labels[k]||k||'Sin dato')}</td><td>${r.n}</td><td>${r.c}</td><td>${pct(r.c,r.n)}</td></tr>`).join('');
  const bar=(label,n,base)=>`<div class="funnel-row"><span>${label}</span><div class="funnel-bar"><i style="width:${base?Math.round(n/base*100):0}%"></i></div><strong>${n}</strong></div>`;
  box.innerHTML=`<h3>Embudo y métricas</h3>${bar('Clientes registrados',total,total)}${bar('Con visita realizada',visited,total)}${bar('Cerraron',closed,total)}
  <div class="metrics-grid"><div><small class="muted">Visita / registrados</small><strong>${pct(visited,total)}</strong></div><div><small class="muted">Cierre / con visita</small><strong>${pct(closed,visited)}</strong></div><div><small class="muted">Cierre / registrados</small><strong>${pct(closed,total)}</strong></div><div><small class="muted">Perdidos</small><strong>${pct(lost,total)}</strong></div><div><small class="muted">Tiempo promedio hasta cerrar</small><strong>${avg}</strong></div><div><small class="muted">En negociación</small><strong>${neg}</strong></div><div><small class="muted">Comisión cobrada</small><strong>${money(paid)}</strong></div><div><small class="muted">Comisión por cobrar</small><strong>${money(due)}</strong></div><div><small class="muted">Proyectada (propiedades reservadas)</small><strong>${money(proj)}</strong></div></div>
  ${rows?`<div class="table-wrap"><table class="metrics-table"><thead><tr><th>Origen</th><th>Clientes</th><th>Cerrados</th><th>% cierre</th></tr></thead><tbody>${rows}</tbody></table></div>`:''}`;
}
if(typeof renderReports==='function'){const _rr=renderReports;renderReports=function(){try{renderMetrics();}catch(e){console.error(e);}_rr.apply(this,arguments);};}
try{renderMetrics();}catch(e){}
