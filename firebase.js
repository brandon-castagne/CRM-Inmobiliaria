/* Sincronización con Firebase (Firestore + login Google). Local sigue funcionando sin conexión.
   Ahorro de datos:
   - El SDK de Firebase solo se descarga si la app está configurada.
   - Al abrir la app se lee 1 documento pequeño (meta/sync); solo si hubo cambios
     en otro dispositivo se descargan los registros modificados desde la última vez.
   - Al guardar solo se suben los registros que cambiaron. */
const firebaseConfig={apiKey:"PEGAR",authDomain:"PEGAR",projectId:"PEGAR",appId:"PEGAR"};
(function(){
if(firebaseConfig.apiKey==="PEGAR"){console.warn('Firebase sin configurar: solo modo local');return;}

const SDK='https://www.gstatic.com/firebasejs/10.12.2/';
const load=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=SDK+src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});

// --- Interfaz: punto de estado + botón de sesión (se muestran de inmediato) ---
const label=t=>{const n=document.getElementById('lastSavedLabel');if(n)n.textContent=t;};
const dot=document.createElement('span');dot.style.cssText='display:inline-block;width:12px;height:12px;border-radius:50%;margin:0 6px;flex:none;align-self:center';
const setS=(c,t)=>{dot.style.background=c;dot.title=t;dot.setAttribute('aria-label',t);label(t);};
const bar=document.querySelector('.topbar'),btn=document.createElement('button');
btn.className='secondary-button';btn.textContent='Iniciar sesión';btn.disabled=true;
if(bar){bar.appendChild(dot);bar.appendChild(btn);}
setS('#9aa0a6','Sin sesión: solo local');

// --- Utilidades ---
const COLS=['clients','visits'];
const LS={uid:'crm_fb_uid',snap:'crm_fb_snap',since:'crm_fb_since'};
const lsGet=(k,f)=>{try{const v=localStorage.getItem(k);return v==null?f:JSON.parse(v);}catch(e){return f;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){console.warn('No se pudo guardar el estado de sincronización',e);}};
function hash(str){let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return (h2>>>0).toString(36)+(h1>>>0).toString(36);}
const split=k=>{const i=k.indexOf('/');return [k.slice(0,i),k.slice(i+1)];};

/* Convierte los datos locales en documentos de Firestore: clave -> {doc, h}. */
function explode(d){
  const out={},rest={...d};COLS.forEach(c=>delete rest[c]);
  const mj=JSON.stringify(rest);out['meta/main']={doc:{json:mj},h:hash(mj)};
  COLS.forEach(c=>(d[c]||[]).forEach(r=>{if(!r||!r.id)return;const j=JSON.stringify(r);out[c+'/'+r.id]={doc:{json:j},h:hash(j),size:j.length};}));
  return out;
}
const hasLocal=d=>COLS.some(c=>(d[c]||[]).length);

let auth,db,TS,uid=null,snap={},timer=null,busy=false,again=false,ready=false;
const col=name=>db.collection('users').doc(uid).collection(name);
const ref=k=>{const [c,id]=split(k);return col(c).doc(id);};

// --- Subida: solo lo que difiere de lo que ya está en la nube (snap) ---
async function push(){
  if(!uid||!ready)return;
  await window.mediaPromise;
  if(busy){again=true;return;}
  busy=true;
  try{
    const now=explode(data),docOps=[];
    for(const k in now)if(snap[k]!==now[k].h)docOps.push(['set',k,now[k]]);
    for(const k in snap)if(!(k in now))docOps.push([k==='meta/main'?'skip':'del',k]);
    if(docOps.length)setS('#f9ab00','Sincronizando…');
    // Lotes de máx. 400 operaciones o ~7 MB (límite de Firestore: 10 MB por envío).
    const run=async ops=>{
      let b=db.batch(),n=0,bytes=0,pending=[];
      const flush=async()=>{
        if(!n)return;
        b.set(col('meta').doc('sync'),{r:TS()});
        await b.commit();
        pending.forEach(([t,k,v])=>{t==='set'?snap[k]=v.h:delete snap[k];});
        lsSet(LS.snap,snap);
        b=db.batch();n=0;bytes=0;pending=[];
      };
      for(const op of ops){
        const [t,k,v]=op;if(t==='skip')continue;
        const size=v&&v.size?v.size:2000;
        if(n&&(n>=400||bytes+size>7e6))await flush();
        if(t==='set')b.set(ref(k),{...v.doc,r:TS()});
        else b.set(ref(k),{del:true,r:TS()}); // marca de borrado para los demás dispositivos
        n++;bytes+=size;pending.push(op);
      }
      await flush();
    };
    await run(docOps);
    setS('#188038','Sincronizado '+new Date().toLocaleString('es-BO'));
  }catch(e){console.error(e);setS('#d93025','Error al sincronizar (se reintenta al guardar)');}
  busy=false;
  if(again){again=false;push();}
}
function queue(){if(!uid)return;setS('#f9ab00','Sincronizando…');clearTimeout(timer);timer=setTimeout(push,1500);}

/* Descarga solo los documentos con r > since y los combina con base.
   keepLocal: no tocar los datos locales, solo aprender qué hay en la nube (para luego reemplazarla).
   Un registro modificado en este dispositivo y aún no subido gana sobre el de la nube. */
async function pull(since,base,baseSnap,keepLocal){
  const d=JSON.parse(JSON.stringify(base)),snapOut={...baseSnap},local=explode(base);
  COLS.forEach(c=>{d[c]=d[c]||[];});
  const mine=k=>keepLocal||(local[k]?local[k].h:undefined)!==baseSnap[k];
  const after=firebase.firestore.Timestamp.fromMillis(since);
  let maxR=since,changed=false;
  const seen=r=>{if(r&&r.toMillis)maxR=Math.max(maxR,r.toMillis());};
  for(const c of ['meta',...COLS]){
    const qs=await col(c).where('r','>',after).get();
    for(const x of qs.docs){
      const v=x.data(),k=c+'/'+x.id;seen(v.r);
      if(k==='meta/sync')continue;
      if(v.del){
        if(!mine(k)&&d[c].some(r=>r.id===x.id)){d[c]=d[c].filter(r=>r.id!==x.id);changed=true;}
        delete snapOut[k];continue;
      }
      const h=hash(v.json);snapOut[k]=h;
      if(mine(k)||(local[k]&&local[k].h===h))continue; // cambio local pendiente, o ya es igual
      if(c==='meta'){const keep={};COLS.forEach(n=>keep[n]=d[n]);Object.keys(d).forEach(n=>delete d[n]);Object.assign(d,JSON.parse(v.json),keep);changed=true;continue;}
      const rec=JSON.parse(v.json);
      const i=d[c].findIndex(r=>r.id===rec.id);
      if(i>=0)d[c][i]=rec;else d[c].push(rec);
      changed=true;
    }
  }
  return {data:d,snap:snapOut,since:maxR,changed};
}

async function apply(res){
  snap=res.snap;lsSet(LS.snap,snap);lsSet(LS.since,res.since);lsSet(LS.uid,uid);
  if(res.changed){await replaceAllData(res.data);location.reload();return true;}
  return false;
}
function backupLocal(){const l=document.createElement('a');l.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));l.download='respaldo-local-antes-de-sincronizar.json';l.click();}
const empty=()=>{const e={...data};COLS.forEach(c=>e[c]=[]);return e;};

async function onLogin(u){
  uid=u.uid;ready=false;
  btn.textContent='Cerrar sesión ('+(u.displayName||u.email)+')';
  setS('#f9ab00','Sincronizando…');
  await window.mediaPromise;
  const known=lsGet(LS.uid,null)===uid;
  snap=known?lsGet(LS.snap,{}):{};
  const since=known?lsGet(LS.since,0):0;
  const meta=await col('meta').doc('sync').get();
  if(!meta.exists){ // nube vacía: subir todo lo local
    snap={};lsSet(LS.uid,uid);lsSet(LS.since,0);ready=true;await push();return;
  }
  if(known){ // dispositivo ya sincronizado: bajar solo cambios
    const r=meta.data().r;
    if(r&&r.toMillis()>since&&await apply(await pull(since,data,snap,false)))return;
    ready=true;await push();return;
  }
  // Primera vez en este dispositivo con esta cuenta
  if(!hasLocal(data)){if(!(await apply(await pull(0,empty(),{},false)))){ready=true;await push();}return;}
  const useCloud=confirm('La nube ya tiene datos de tu cuenta.\n\nAceptar = usar los de la nube (tu copia local se descarga como respaldo).\nCancelar = subir los de este dispositivo y reemplazar la nube.');
  if(useCloud){backupLocal();if(!(await apply(await pull(0,empty(),{},false)))){ready=true;await push();}return;}
  const res=await pull(0,data,{},true);snap=res.snap;lsSet(LS.snap,snap);lsSet(LS.since,res.since);lsSet(LS.uid,uid);
  ready=true;await push();
}

// --- Arranque: cargar el SDK solo ahora ---
(async()=>{
  try{await load('firebase-app-compat.js');await Promise.all([load('firebase-auth-compat.js'),load('firebase-firestore-compat.js')]);}
  catch(e){setS('#9aa0a6','Sin conexión: solo local');addEventListener('online',()=>location.reload(),{once:true});return;}
  firebase.initializeApp(firebaseConfig);
  auth=firebase.auth();db=firebase.firestore();TS=()=>firebase.firestore.FieldValue.serverTimestamp();
  const _save=saveData;
  saveData=function(){_save.apply(this,arguments);queue();};
  btn.disabled=false;
  btn.onclick=()=>uid?auth.signOut():auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>alert('No se pudo iniciar sesión: '+e.message));
  auth.onAuthStateChanged(async u=>{
    if(!u){uid=null;ready=false;snap={};btn.textContent='Iniciar sesión';setS('#9aa0a6','Sin sesión: solo local');return;}
    try{await onLogin(u);}catch(e){console.error(e);setS('#d93025','Error al leer Firebase (se reintenta al guardar)');ready=lsGet(LS.uid,null)===u.uid;}
  });
  addEventListener('offline',()=>{if(uid)setS('#f9ab00','Sin conexión: se sincronizará al volver');});
  addEventListener('online',()=>{if(uid&&ready)push();});
})();
})();
