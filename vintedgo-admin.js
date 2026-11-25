(() => {
"use strict";
const STATES=["Enviado","Aprobado","Preparado","Entregado"];
const $=s=>document.querySelector(s);
const login=$("#adminLogin"),panel=$("#adminPanel"),notice=$("#adminWarning");
let requests=[],activeFilter="Todas",search="",busy=false;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const label={Enviado:"Nueva",Aprobado:"Por preparar",Preparado:"Lista para entregar",Entregado:"Entregada"};
const actions={Enviado:"Aprobar solicitud",Aprobado:"Marcar como preparado",Preparado:"Confirmar entrega"};
const priority={Enviado:0,Aprobado:1,Preparado:2,Entregado:3};
function notify(message,type="info"){notice.textContent=message;notice.dataset.type=type;notice.hidden=type==="success";}
function showLogin(){panel.hidden=true;login.hidden=false;$("#connectionLabel").textContent="Acceso seguro";}
function showPanel(){login.hidden=true;panel.hidden=false;$("#connectionLabel").textContent="Sistema disponible";}
function readableDate(v){if(!v)return "Sin fecha";const [y,m,d]=v.split("-");return `${d}/${m}/${y}`;}
function render(){
 const summary=$("#adminSummary");
 summary.innerHTML=STATES.map((s,i)=>`<button type="button" class="kpi kpi-${i} ${activeFilter===s?"selected":""}" data-kpi="${s}"><span class="kpi-label">${["Nuevas","Por preparar","Listas para entregar","Entregadas"][i]}</span><strong>${requests.filter(r=>r.status===s).length}</strong><small>${["Necesitan revisión","Buscar y separar","Esperan al cliente","Ya finalizadas"][i]}</small></button>`).join("");
 summary.querySelectorAll("[data-kpi]").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.kpi;render();}));
 document.querySelectorAll("[data-filter]").forEach(b=>{const on=b.dataset.filter===activeFilter;b.classList.toggle("selected",on);b.setAttribute("aria-pressed",String(on));});
 const rows=requests.filter(r=>(activeFilter==="Todas"||r.status===activeFilter)&&[r.customer_name,r.vinted_code,r.public_code].some(v=>String(v||"").toLocaleLowerCase("es").includes(search)));
 $("#resultsCount").textContent=`${rows.length} solicitud${rows.length===1?"":"es"}`;
 $("#requests").innerHTML=rows.length?rows.map(r=>{
  const finished=r.status==="Entregado";
  return `<article class="ticket ${selectedId===r.id?"ticket-selected":""}" data-open="${esc(r.id)}" tabindex="0" role="button" aria-label="Ver paquete de ${esc(r.customer_name)}">
  <div class="ticket-top"><span class="ticket-status state-${esc(r.status)}">${esc(label[r.status]||r.status)}</span><span class="ticket-date">${readableDate(r.arrival_date)} · ${esc(r.slot)}</span></div>
  <div class="ticket-body"><div class="ticket-customer"><h3>${esc(r.customer_name)}</h3><span class="ticket-code">${esc(r.vinted_code)}</span></div><span class="ticket-chevron" aria-hidden="true">›</span></div></article>`;
 }).join(""):`<div class="empty-state"><span>📦</span><h3>No hay solicitudes para mostrar</h3><p>Cambia el filtro o pulsa «Actualizar» para comprobar si hay nuevas recogidas.</p></div>`;
 document.querySelectorAll("[data-open]").forEach(b=>{b.addEventListener("click",()=>openPackage(b.dataset.open));b.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openPackage(b.dataset.open);}});});
}
async function refresh(){
 if(busy)return;
 $("#refreshBtn").disabled=true;notify("Actualizando solicitudes…");
 try{
  const {data,error}=await window.detoditoDB.from("pickup_requests").select("id,public_code,customer_name,vinted_code,arrival_date,slot,qr_data,status,created_at").order("created_at",{ascending:false}).limit(200);
  if(error)throw error;
  requests=(data||[]).sort((a,b)=>(priority[a.status]??9)-(priority[b.status]??9)||new Date(b.created_at)-new Date(a.created_at));
  render();
  if(selectedId && requests.some(r=>r.id===selectedId))openPackage(selectedId);
  else if(requests.length && desktopMode())openPackage(requests[0].id);
  notify("Solicitudes actualizadas. Puedes empezar a trabajar.","success");
 }catch(e){notify("No se pudieron cargar las solicitudes: "+(e.message||"Error de conexión"),"error");}
 finally{$("#refreshBtn").disabled=false;}
}
async function openPanel(){
 const {data,error}=await window.detoditoDB.rpc("is_pickup_staff");
 if(error||data!==true){showLogin();notify(error?"No se pudo comprobar el permiso de acceso.":"Esta cuenta no tiene permiso para gestionar recogidas.","error");return;}
 showPanel();
 const {data:userData}=await window.detoditoDB.auth.getUser();
 $("#adminUser").textContent=userData?.user?.email||"Personal autorizado";
 await refresh();
}

const packageDialog=$("#packageDialog"),confirmDialog=$("#confirmDialog");
let selectedId=null;
const desktopDetail=$("#desktopDetails");
const desktopMode=()=>window.matchMedia("(min-width: 1000px)").matches;
function openPackage(id){
 const r=requests.find(x=>x.id===id);if(!r)return;
 selectedId=id;
 document.querySelectorAll(".ticket").forEach(el=>el.classList.toggle("ticket-selected",el.dataset.open===id));
 const qr=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(r.qr_data||"")?r.qr_data:"";
 $("#packageDetails").innerHTML=`<div class="detail-grid"><p><small>Cliente</small><strong>${esc(r.customer_name)}</strong></p><p><small>Estado</small><strong>${esc(r.status)}</strong></p><p><small>Código Vinted</small><strong>${esc(r.vinted_code)}</strong></p><p><small>Fecha y horario</small><strong>${readableDate(r.arrival_date)} · ${esc(r.slot)}</strong></p><p class="full"><small>Referencia privada</small><strong>${esc(r.public_code)}</strong></p></div><div class="qr-view-action">${qr?'<button type="button" class="btn btn-secondary" data-view-qr>Ver QR</button>':'<p>QR no disponible</p>'}</div>`;
 const action=$("#packageAction");
 action.hidden=r.status==="Entregado";
 if(!action.hidden)action.textContent=actions[r.status]+" →";
 if(desktopMode()){
  desktopDetail.innerHTML=`<div class="detail-heading"><div><small>FICHA DEL PAQUETE</small><h2>${esc(r.customer_name)}</h2></div><span class="ticket-status state-${esc(r.status)}">${esc(label[r.status]||r.status)}</span></div>`+$("#packageDetails").innerHTML+`<div class="desktop-detail-actions">${action.hidden?"<p>✓ Recogida finalizada</p>":`<button id="desktopNext" type="button" class="btn btn-primary">${esc(actions[r.status])} →</button>`}</div>`;
  const nextButton=$("#desktopNext");if(nextButton)nextButton.addEventListener("click",()=>startTransition());
 }else packageDialog.showModal();
}
const qrDialog=$("#qrViewer"),qrImage=$("#qrViewerImage"),qrStage=$("#qrViewerStage");
let qrZoom=1;
function setQrZoom(value){
 qrZoom=Math.max(1,Math.min(4,value));
 qrImage.style.width=(qrZoom*100)+"%";
 qrImage.style.height=(qrZoom*100)+"%";
 $("#qrZoomReset").textContent=Math.round(qrZoom*100)+"%";
 $("#qrZoomOut").disabled=qrZoom===1;
 $("#qrZoomIn").disabled=qrZoom===4;
}
document.addEventListener("click",event=>{
 const trigger=event.target.closest("[data-view-qr]");if(!trigger)return;
 const r=requests.find(x=>x.id===selectedId);
 const qr=r?.qr_data||"";
 if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(qr))return;
 qrImage.src=qr;setQrZoom(1);qrDialog.showModal();
 qrStage.scrollTop=0;qrStage.scrollLeft=0;
});
$("#qrViewerClose").addEventListener("click",()=>qrDialog.close());
$("#qrZoomIn").addEventListener("click",()=>setQrZoom(qrZoom+.5));
$("#qrZoomOut").addEventListener("click",()=>setQrZoom(qrZoom-.5));
$("#qrZoomReset").addEventListener("click",()=>{setQrZoom(1);qrStage.scrollTop=0;qrStage.scrollLeft=0;});
qrDialog.addEventListener("close",()=>{qrImage.removeAttribute("src");setQrZoom(1);});
$("#closePackage").addEventListener("click",()=>packageDialog.close());
function startTransition(){
 const r=requests.find(x=>x.id===selectedId);if(!r)return;
 const next=STATES[STATES.indexOf(r.status)+1];
 $("#confirmTitle").textContent=next==="Entregado"?"Confirmar entrega":"Confirmar cambio de estado";
 $("#confirmMessage").textContent=next==="Entregado"
 ?`¿Has comprobado la identidad, el código y completado la entrega oficial a ${r.customer_name}?`
 :`¿Confirmas que la solicitud de ${r.customer_name} pasará a «${next}»?`;
 if(packageDialog.open)packageDialog.close();confirmDialog.showModal();
}
$("#packageAction").addEventListener("click",startTransition);
$("#cancelAction").addEventListener("click",()=>{confirmDialog.close();openPackage(selectedId);});
$("#confirmAction").addEventListener("click",async()=>{
 if(busy)return;
 const r=requests.find(x=>x.id===selectedId);if(!r)return;
 busy=true;const btn=$("#confirmAction");btn.disabled=true;btn.textContent="Guardando…";
 try{
  const {error}=await window.detoditoDB.rpc("advance_pickup",{p_id:r.id,p_expected_status:r.status});
  if(error)throw error;
  confirmDialog.close();
  busy=false;
  await refresh();
  openPackage(selectedId);
 }catch(e){notify("No se pudo guardar: "+(e.message||"Error"),"error");confirmDialog.close();}
 finally{busy=false;btn.disabled=false;btn.textContent="Confirmar";}
});
$("#loginForm").addEventListener("submit",async e=>{
 e.preventDefault();const loginForm=e.currentTarget;const button=$("#loginBtn");button.disabled=true;button.textContent="Comprobando acceso…";
 try{
  if(!window.detoditoReady)throw Error("No se ha podido cargar la conexión a Supabase.");
  const f=new FormData(loginForm);
  const {error}=await window.detoditoDB.auth.signInWithPassword({email:String(f.get("email")).trim(),password:String(f.get("password"))});
  if(error)throw error;
  loginForm.querySelector('[name="password"]').value="";
  await openPanel();
 }catch(err){notify("Error de acceso: "+(err?.message||"No se pudo iniciar sesión."),"error");}
 finally{button.disabled=false;button.textContent="Entrar al centro de recogidas";}
});
$("#logoutBtn").addEventListener("click",async()=>{
 const b=$("#logoutBtn");b.disabled=true;b.textContent="Cerrando…";
 try{
  const {error}=await window.detoditoDB.auth.signOut({scope:"local"});
  if(error)throw error;
  requests=[];selectedId=null;desktopDetail.innerHTML="<p>Sesión cerrada.</p>";$("#loginForm").reset();showLogin();notify("Sesión cerrada correctamente.","success");
 }catch(err){notify("No se pudo cerrar sesión: "+err.message,"error");}
 finally{b.disabled=false;b.textContent="Cerrar sesión";}
});
$("#refreshBtn").addEventListener("click",refresh);
$("#requestSearch").addEventListener("input",e=>{search=e.target.value.trim().toLocaleLowerCase("es");render();});
document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;render();}));
$("#todayDate").textContent=new Intl.DateTimeFormat("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
async function init(){
 showLogin();
 if(!window.detoditoReady){notify("No se pudo cargar Supabase. Revisa tu conexión a Internet y vuelve a cargar la página.","error");return;}
 try{
  const {data,error}=await window.detoditoDB.auth.getSession();
  if(error)throw error;
  if(data?.session)await openPanel();
  else notify("Introduce tu correo y contraseña para comenzar.");
 }catch(e){notify("No se pudo comprobar la sesión. Vuelve a intentarlo.","error");}
}
init();
})();