/* Etapa 3: cruces y visitas. Script clásico compatible con file://. */
const normalizeZone = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const activeClient = c => !['cerrado', 'perdido'].includes(c.status);
const visitLabels = {scheduled:'Agendada', completed:'Realizada', cancelled:'Cancelada'};
const resultLabels = {liked:'Le gustó', disliked:'No le gustó', negotiate:'Quiere negociar'};
const visitDefaults = ['Confirmar asistencia', 'Coordinar acceso con propietario', 'Revisar ambientes y servicios', 'Consultar dudas y documentos', 'Acordar próximo paso'];

// Los requisitos declarados son obligatorios; los desconocidos no se inventan.
function matchProperty(c, p) {
  if (!c || !p || p.status !== 'disponible' || !activeClient(c)) return null;
  let score = 0; const reasons = [];
  if (c.operation) { if (c.operation !== p.operation) return null; score += 30; reasons.push('Operación'); }
  if (c.propertyType) { if (c.propertyType !== p.propertyType) return null; score += 15; reasons.push('Tipo'); }
  if (c.zone) {
    const wanted = normalizeZone(c.zone).split(/[,;]/).map(x=>x.trim()).filter(Boolean);
    if (!wanted.includes(normalizeZone(p.zone))) return null;
    score += 20; reasons.push('Zona');
  }
  if (c.budgetBs != null) {
    const price = p.priceBs != null ? p.priceBs : p.priceUsd != null ? p.priceUsd * Number(data.settings.exchangeRate) : null;
    if (price == null || price > c.budgetBs) return null;
    score += 20 + (c.budgetBs > 0 ? Math.min(5, 5 * price / c.budgetBs) : 0); reasons.push('Presupuesto');
  }
  if (c.bedrooms != null) { if (p.bedrooms == null || p.bedrooms < c.bedrooms) return null; score += 10; reasons.push('Dormitorios'); }
  if ((c.interestedPropertyIds || []).includes(p.id)) { score += 10; reasons.push('Interés registrado'); }
  return {property:p, client:c, score:Math.round(score), reasons};
}
function rankedProperties(client) { return data.properties.map(p=>matchProperty(client,p)).filter(Boolean).sort((a,b)=>b.score-a.score || a.property.code.localeCompare(b.property.code)); }
function matchRow(m, clientView) {
  const label = clientView ? `${m.property.code} · ${typeLabel(m.property.propertyType)} en ${m.property.zone} · ${money(m.property.priceBs)}` : `${m.client.name} · ${m.client.phone}`;
  return `<div class="match-row"><div><strong>${esc(label)}</strong><p class="small muted">${m.reasons.length ? esc(m.reasons.join(' · ')) : 'Sin requisitos definidos; revisar la ficha'} · Puntaje ${m.score}</p></div><div class="button-row"><button type="button" class="secondary-button" data-match-send data-client="${esc(m.client.id)}" data-property="${esc(m.property.id)}">WhatsApp</button><button type="button" class="secondary-button" data-match-visit data-client="${esc(m.client.id)}" data-property="${esc(m.property.id)}">Agendar visita</button></div></div>`;
}
function renderClientMatches(c) {
  const list = c ? rankedProperties(c) : [];
  $('#clientMatches').innerHTML = list.map(m=>matchRow(m,true)).join('') || '<p class="muted small">Guarda la ficha o ajusta requisitos: no hay propiedades disponibles coincidentes.</p>';
  bindMatches($('#clientMatches'));
}
function renderPropertyMatches(p) {
  const list = p ? data.clients.map(c=>matchProperty(c,p)).filter(Boolean).sort((a,b)=>b.score-a.score) : [];
  $('#propertyMatches').innerHTML = list.map(m=>matchRow(m,false)).join('') || '<p class="muted small">No hay clientes activos coincidentes con esta ficha guardada.</p>';
  bindMatches($('#propertyMatches'));
}
function bindMatches(root) {
  root.querySelectorAll('[data-match-send]').forEach(button=>button.onclick=()=>{
    const c=data.clients.find(c=>c.id===button.dataset.client),p=data.properties.find(p=>p.id===button.dataset.property);
    if (!c || !p) return;
    openWhatsApp(c, `Hola ${c.name}, te comparto ${typeLabel(p.propertyType).toLowerCase()} en ${operationLabel(p.operation).toLowerCase()} en ${p.zone}. Precio: ${tokens(p).precio}. ${features(p).join(' · ')}. Código ${p.code}. ¿Coordinamos una visita?`);
    // Abrir WhatsApp no demuestra que un mensaje fue enviado: registrar el contacto manualmente.
  });
  root.querySelectorAll('[data-match-visit]').forEach(button=>button.onclick=()=>openVisitDialog(null,button.dataset.client,button.dataset.property));
}
function localDay(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function calendarStart() { const date=new Date($('#calendarDate').value+'T12:00:00');if($('#calendarMode').value==='week')date.setDate(date.getDate()-((date.getDay()+6)%7));return date; }
function renderVisits() {
  if (!$('#visitCalendar') || !$('#calendarDate')) return;
  if (!$('#calendarDate').value) $('#calendarDate').value=localDay(new Date());
  const start=calendarStart(),days=$('#calendarMode').value==='week'?7:1;
  $('#visitCalendar').classList.toggle('week-calendar',days===7);
  $('#visitCalendar').innerHTML=Array.from({length:days},(_,i)=>{
    const date=new Date(start);date.setDate(date.getDate()+i);const key=localDay(date);
    const visits=data.visits.filter(v=>localDay(new Date(v.startsAt))===key).sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt));
    return `<article class="panel calendar-day"><h3>${date.toLocaleDateString('es-BO',{weekday:'short',day:'numeric',month:'short'})}</h3>${visits.map(visitCard).join('')||'<p class="muted small">Sin visitas</p>'}</article>`;
  }).join('');
  $('#visitCalendar').querySelectorAll('[data-visit-edit]').forEach(b=>b.onclick=()=>openVisitDialog(data.visits.find(v=>v.id===b.dataset.visitEdit)));
  renderVisitReminders();
}
function visitCard(v) {
  const c=data.clients.find(c=>c.id===v.clientId),p=data.properties.find(p=>p.id===v.propertyId);
  return `<div class="visit-card"><strong>${new Date(v.startsAt).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})} · ${esc(c?.name||'Cliente eliminado')}</strong><p>${esc(p?`${p.code} · ${p.zone}`:'Propiedad eliminada')}</p><span class="badge">${visitLabels[v.status]||'Agendada'}</span>${v.result?`<p class="small">${esc(resultLabels[v.result])}</p>`:''}<button class="secondary-button" type="button" data-visit-edit="${esc(v.id)}">Abrir / checklist</button></div>`;
}
function renderVisitReminders() {
  const now=Date.now();const visits=data.visits.filter(v=>v.status==='scheduled' && new Date(v.startsAt).getTime()-(v.reminderMinutes??30)*60000<=now && new Date(v.startsAt).getTime()+(v.durationMinutes||60)*60000>=now);
  $('#visitReminder').textContent=visits.length ? '🔔 Visitas próximas o en curso: '+visits.map(v=>`${data.clients.find(c=>c.id===v.clientId)?.name||'Cliente'} a las ${new Date(v.startsAt).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}`).join(' · ') : 'Recordatorios locales: se actualizan cada minuto mientras la app está abierta.';
}
function openVisitDialog(v=null, clientId='', propertyId='') {
  $('#visitTitle').textContent=v?'Detalle de visita':'Agendar visita';$('#visitId').value=v?.id||'';
  $('#visitClient').innerHTML='<option value="">Selecciona cliente</option>'+data.clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  $('#visitProperty').innerHTML='<option value="">Selecciona propiedad</option>'+data.properties.map(p=>`<option value="${esc(p.id)}">${esc(p.code)} · ${esc(p.zone)} · ${esc(statusLabel(p.status))}</option>`).join('');
  $('#visitClient').value=v?.clientId||clientId;$('#visitProperty').value=v?.propertyId||propertyId;
  $('#visitAt').value=v?toLocalInputValue(new Date(v.startsAt)):toLocalInputValue(new Date(Date.now()+3600000));
  $('#visitDuration').value=v?.durationMinutes||60;$('#visitReminderMinutes').value=v?.reminderMinutes??30;$('#visitStatus').value=v?.status||'scheduled';$('#visitResult').value=v?.result||'';$('#visitNotes').value=v?.notes||'';
  $('#deleteVisitButton').hidden=!v;
  const checklist=v?.checklist||visitDefaults.map(label=>({label,checked:false}));
  $('#visitChecklist').innerHTML=checklist.map(item=>`<label><input type="checkbox" data-check-label="${esc(item.label)}" ${item.checked?'checked':''}/> ${esc(item.label)}</label>`).join('');
  $('#visitDialog').showModal();
}
function saveVisit(event) {
  event.preventDefault();if(!$('#visitForm').reportValidity())return;
  const startsAt=new Date($('#visitAt').value),duration=Number($('#visitDuration').value),clientId=$('#visitClient').value,propertyId=$('#visitProperty').value,status=$('#visitStatus').value,result=$('#visitResult').value;
  if(!Number.isFinite(startsAt.getTime())){toast('Fecha inválida');return;}
  const client=data.clients.find(c=>c.id===clientId),property=data.properties.find(p=>p.id===propertyId);
  if(!client||!property){toast('Selecciona un cliente y una propiedad existentes');return;}
  if(result && status!=='completed'){toast('Para registrar un resultado, marca la visita como realizada');return;}
  if(status==='scheduled' && (!activeClient(client)||property.status!=='disponible')){toast('La visita necesita un cliente activo y una propiedad disponible');return;}
  const id=$('#visitId').value;
  const collision=status==='scheduled'&&data.visits.some(v=>v.id!==id&&v.status==='scheduled'&&startsAt.getTime()<new Date(v.startsAt).getTime()+(v.durationMinutes||60)*60000&&startsAt.getTime()+duration*60000>new Date(v.startsAt).getTime());
  if(collision){toast('Ya hay otra visita en ese horario. Cambia la fecha o duración.');return;}
  const previous=data.visits.find(v=>v.id===id),timestamp=nowIso();
  const v={...previous,id:id||'visit-'+newId(),clientId,propertyId,startsAt:startsAt.toISOString(),durationMinutes:duration,reminderMinutes:Number($('#visitReminderMinutes').value),status,result,notes:$('#visitNotes').value.trim(),checklist:[],createdAt:previous?.createdAt||timestamp,updatedAt:timestamp};
  v.checklist=$$('#visitChecklist input').map(input=>({label:input.dataset.checkLabel,checked:input.checked}));
  const next=clone(data);next.visits=previous?next.visits.map(item=>item.id===id?v:item):[...next.visits,v];
  const c=next.clients.find(c=>c.id===clientId);
  if(status==='scheduled')c.status='visita';
  if(status==='completed'&&result){
    if(!['cerrado','perdido'].includes(c.status))c.status=result==='negotiate'?'negociando':'contactado';
    if(result==='disliked')c.interestedPropertyIds=(c.interestedPropertyIds||[]).filter(id=>id!==propertyId);
    else c.interestedPropertyIds=[...new Set([...(c.interestedPropertyIds||[]),propertyId])];
  }
  if(status==='completed' && (previous?.status!=='completed'||previous?.result!==result)){
    c.interactions=c.interactions||[];c.interactions.push({id:'int-'+newId(),type:'visita',date:v.startsAt,note:`Visita ${property.code}: ${resultLabels[result]||'realizada'}. ${v.notes}`});
  }
  c.updatedAt=timestamp;
  if(!commit(next))return;
  $('#visitDialog').close();$('#calendarDate').value=localDay(startsAt);renderVisits();updateDashboard();toast('Visita guardada');
}
function validateVisits(visits,clients,properties) {
  const ids=new Set();for(const v of visits){
    if(!v||typeof v.id!=='string'||ids.has(v.id)||!Number.isFinite(new Date(v.startsAt).getTime())||!['scheduled','completed','cancelled'].includes(v.status)||!Array.isArray(v.checklist)||v.checklist.some(i=>typeof i.label!=='string'||typeof i.checked!=='boolean')||!Number.isFinite(v.durationMinutes)||v.durationMinutes<15||v.durationMinutes>480||!Number.isFinite(v.reminderMinutes)||v.reminderMinutes<0||v.reminderMinutes>1440||!['','liked','disliked','negotiate'].includes(v.result))throw Error('Visita inválida en el respaldo');
    ids.add(v.id);if(typeof v.clientId!=='string'||typeof v.propertyId!=='string')throw Error('Referencia de visita inválida');if(!clients.some(c=>c.id===v.clientId)||!properties.some(p=>p.id===v.propertyId))throw Error('La visita apunta a un cliente o propiedad inexistente');
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  $('#calendarDate').value=localDay(new Date());$('#newVisitButton').onclick=()=>openVisitDialog();$('#visitForm').onsubmit=saveVisit;
  ['calendarDate','calendarMode'].forEach(id=>$('#'+id).onchange=renderVisits);
  ['closeVisitDialog','cancelVisitButton'].forEach(id=>$('#'+id).onclick=()=>$('#visitDialog').close());
  $('#deleteVisitButton').onclick=()=>{const id=$('#visitId').value;if(!confirm('¿Eliminar esta visita? El historial del cliente se conserva.'))return;const next=clone(data);next.visits=next.visits.filter(v=>v.id!==id);if(commit(next)){$('#visitDialog').close();renderVisits();updateDashboard();toast('Visita eliminada');}};
  ['previousPeriod','nextPeriod'].forEach(id=>$('#'+id).onclick=()=>{const d=calendarStart();d.setDate(d.getDate()+(id==='previousPeriod'?-1:1)*($('#calendarMode').value==='week'?7:1));$('#calendarDate').value=localDay(d);renderVisits();});
  renderVisits();setInterval(renderVisitReminders,60000);
});
