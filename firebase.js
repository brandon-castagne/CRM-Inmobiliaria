/* Sincronización con Firebase (Firestore + login Google). Local sigue funcionando sin conexión. */
const firebaseConfig={apiKey:"PEGAR",authDomain:"PEGAR",projectId:"PEGAR",appId:"PEGAR"};
(function(){
if(!window.firebase||firebaseConfig.apiKey==="PEGAR"){console.warn('Firebase sin configurar: solo modo local');return;}
firebase.initializeApp(firebaseConfig);
const auth=firebase.auth(),db=firebase.firestore();
db.enablePersistence({synchronizeTabs:true}).catch(()=>{});
const COLS=['clients','owners','visits','closures'];
let uid=null,snap={},timer=null,busy=false,again=false;
const col=name=>db.collection('users').doc(uid).collection(name);
const label=t=>{const n=document.getElementById('lastSavedLabel');if(n)n.textContent=t;};
const dot=document.createElement('span');dot.style.cssText='display:inline-block;width:12px;height:12px;border-radius:50%;margin:0 6px;flex:none;align-self:center';
const setS=(c,t)=>{dot.style.background=c;dot.title=t;dot.setAttribute('aria-label',t);label(t);};
setS('#9aa0a6','Sin sesión: solo local');

function explode(d){
  const out={},{properties=[],clients,owners,visits,closures,...rest}=d;
  out['meta/main']={json:JSON.stringify(rest)};
  COLS.forEach(c=>(d[c]||[]).forEach((r,i)=>{out[c+'/'+(r.id||'i'+i)]={json:JSON.stringify(r)};}));
  properties.forEach(r=>{
    const {photos=[],documents=[],...p}=r;
    out['properties/'+r.id]={json:JSON.stringify(p),np:photos.length,nd:documents.length};
    photos.forEach((v,i)=>{out['files/'+r.id+'__p'+i]={v};});
    documents.forEach((x,i)=>{out['files/'+r.id+'__d'+i]={json:JSON.stringify(x)};});
  });
  return out;
}
const split=k=>{const i=k.indexOf('/');return [k.slice(0,i),k.slice(i+1)];};

async function push(){
  if(!uid)return;
  await window.mediaPromise;
  if(busy){again=true;return;}
  busy=true;
  try{
    const now=explode(data),ops=[];
    for(const k in now){const s=JSON.stringify(now[k]);if(snap[k]!==s)ops.push(['set',k,now[k],s]);}
    for(const k in snap)if(!(k in now))ops.push(['del',k]);
    for(let i=0;i<ops.length;i+=400){
      const b=db.batch();
      ops.slice(i,i+400).forEach(([t,k,v])=>{const [c,id]=split(k);const r=col(c).doc(id);t==='set'?b.set(r,v):b.delete(r);});
      await b.commit();
    }
    ops.forEach(([t,k,v,s])=>{t==='set'?snap[k]=s:delete snap[k];});
    if(!again)localStorage.removeItem('crm_fb_dirty');
    setS('#188038','Sincronizado '+new Date().toLocaleString('es-BO'));
  }catch(e){console.error(e);setS('#d93025','Error al sincronizar (se reintenta al guardar)');}
  busy=false;
  if(again){again=false;push();}
}
function queue(){try{localStorage.setItem('crm_fb_dirty','1');}catch(e){}if(uid)setS('#f9ab00','Sincronizando…');clearTimeout(timer);timer=setTimeout(push,1500);}

async function pull(){
  const m=await col('meta').doc('main').get();
  if(!m.exists)return null;
  const d={...JSON.parse(m.data().json),properties:[]};
  for(const c of COLS){d[c]=(await col(c).get()).docs.map(x=>JSON.parse(x.data().json));}
  const files={};(await col('files').get()).forEach(x=>{files[x.id]=x.data();});
  d.properties=(await col('properties').get()).docs.map(x=>{
    const v=x.data(),p=JSON.parse(v.json);p.photos=[];p.documents=[];
    for(let i=0;i<(v.np||0);i++)if(files[p.id+'__p'+i])p.photos.push(files[p.id+'__p'+i].v);
    for(let i=0;i<(v.nd||0);i++)if(files[p.id+'__d'+i])p.documents.push(JSON.parse(files[p.id+'__d'+i].json));
    return p;
  });
  return d;
}

const _save=saveData;
saveData=function(){_save.apply(this,arguments);queue();};

const bar=document.querySelector('.topbar'),btn=document.createElement('button');
btn.className='secondary-button';btn.textContent='Iniciar sesión';
btn.onclick=()=>uid?auth.signOut():auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>alert('No se pudo iniciar sesión: '+e.message));
if(bar){bar.appendChild(dot);bar.appendChild(btn);}

const toSnap=d=>{const e=explode(d),o={};for(const k in e)o[k]=JSON.stringify(e[k]);return o;};
const same=(a,b)=>{const ka=Object.keys(a);return ka.length===Object.keys(b).length&&ka.every(k=>a[k]===b[k]);};
const hasLocal=()=>['properties','clients','owners','visits','closures'].some(c=>(data[c]||[]).length);
auth.onAuthStateChanged(async u=>{
  uid=u?u.uid:null;snap={};
  btn.textContent=u?'Cerrar sesión ('+(u.displayName||u.email)+')':'Iniciar sesión';
  if(!u){setS('#9aa0a6','Sin sesión: solo local');return;}
  try{
    setS('#f9ab00','Sincronizando…');
    await window.mediaPromise;
    const cloud=await pull();
    if(!cloud){snap={};await push();localStorage.setItem('crm_fb_uid',uid);return;}
    const cs=toSnap(cloud);
    if(same(cs,toSnap(data))){snap=cs;localStorage.removeItem('crm_fb_dirty');localStorage.setItem('crm_fb_uid',uid);setS('#188038','Sincronizado');return;}
    let useLocal=localStorage.getItem('crm_fb_dirty')==='1';
    if(!useLocal&&hasLocal()&&localStorage.getItem('crm_fb_uid')!==uid)useLocal=!confirm('La nube ya tiene datos distintos a los de este dispositivo.\n\nAceptar = usar los de la nube (tu copia local se guarda aparte).\nCancelar = subir los de este dispositivo y reemplazar la nube.');
    localStorage.setItem('crm_fb_uid',uid);
    if(useLocal){snap=cs;await push();}
    else{
      if(hasLocal()){const l=document.createElement('a');l.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));l.download='respaldo-local-antes-de-sincronizar.json';l.click();}
      await replaceAllData(cloud);
      localStorage.removeItem('crm_fb_dirty');location.reload();
    }
  }catch(e){console.error(e);setS('#d93025','Error al leer Firebase');}
});
addEventListener('offline',()=>{if(uid)setS('#f9ab00','Sin conexión: se sincronizará al volver');});
addEventListener('online',()=>{if(uid){setS('#f9ab00','Sincronizando…');push();}});
})();
