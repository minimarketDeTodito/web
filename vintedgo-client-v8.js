(()=>{
"use strict";
const $=s=>document.querySelector(s);
const STATES=["Enviado","Aprobado","Preparado","Entregado"];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dialog=$("#flowDialog"),form=$("#requestForm"),check=$("#checkForm"),result=$("#resultScreen"),privacy=$("#privacyScreen");
const steps=[...document.querySelectorAll(".step")];
let mode="request",step=0,busy=false,returnTo="request";
function alertMessage(message){$("#flowAlert").textContent=message;$("#flowAlert").hidden=!message;}
function screen(name){
 form.hidden=name!=="request";check.hidden=name!=="lookup";result.hidden=name!=="result";privacy.hidden=name!=="privacy";
 alertMessage("");
 const headings={request:["NUEVA SOLICITUD","Avisar de mi recogida"],lookup:["SEGUIMIENTO","Consultar mi paquete"],result:["RESULTADO","Tu recogida"],privacy:["INFORMACIÓN","Privacidad de tus datos"]};
 $("#flowEyebrow").textContent=headings[name][0];$("#flowTitle").textContent=headings[name][1];
 dialog.querySelector(".modal-content").scrollTop=0;
}
function open(name){
 mode=name;screen(name);
 if(!dialog.open)dialog.showModal();
 if(name==="request")setStep(0);
 if(name==="lookup")$("#lookup").focus();
}
function close(){if(!busy)dialog.close();}
$("#startRequest").addEventListener("click",()=>open("request"));
$("#startLookup").addEventListener("click",()=>open("lookup"));
$("#closeFlow").addEventListener("click",close);
dialog.addEventListener("cancel",e=>{if(busy)e.preventDefault();});
function setStep(i){
 step=i;steps.forEach((s,n)=>s.hidden=n!==i);
 $("#progressLabel").textContent=`Paso ${i+1} de 4`;
 $("#progressFill").style.width=`${(i+1)*25}%`;
 $("#wizardBack").textContent=i===0?"Cancelar":"Atrás";
 $("#wizardNext").hidden=i===3;$("#wizardSubmit").hidden=i!==3;
 if(i===3){
  const f=new FormData(form);
  $("#reviewDetails").innerHTML=`<div><strong>Nombre:</strong> ${esc(f.get("name"))}</div><div><strong>Código Vinted:</strong> ${esc(f.get("vintedCode"))}</div><div><strong>Fecha:</strong> ${esc(f.get("arrivalDate"))}</div><div><strong>Horario:</strong> ${esc(f.get("slot"))}</div><div><strong>QR:</strong> ${esc(f.get("qr")?.name||"Sin imagen")}</div>`;
 }
 dialog.querySelector(".modal-content").scrollTop=0;
}
function validStep(){
 for(const field of steps[step].querySelectorAll("input,select")){
  if(!field.reportValidity())return false;
 }
 if(step===2){
  const file=form.elements.qr.files[0];
  if(!file||file.size>1048576||!["image/png","image/jpeg","image/webp"].includes(file.type)){
   alertMessage("Selecciona una imagen PNG, JPG o WebP de máximo 1 MB.");return false;
  }
 }
 return true;
}
$("#wizardNext").addEventListener("click",()=>{alertMessage("");if(validStep())setStep(Math.min(3,step+1));});
$("#wizardBack").addEventListener("click",()=>{if(step===0)close();else setStep(step-1);});
form.elements.qr.addEventListener("change",()=>{$("#fileName").textContent=form.elements.qr.files[0]?.name||"";});
$("#openPrivacy").addEventListener("click",()=>{returnTo="request";screen("privacy");});
$("#privacyBack").addEventListener("click",()=>{screen(returnTo);if(returnTo==="request")setStep(3);});
function fileData(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});}
function resultHTML(code){
 return `<div class="success-mark">✅</div><h3>¡Aviso enviado!</h3><p>Hemos recibido tu solicitud. Guarda este código para consultar cómo va tu paquete.</p><div class="tracking-code" id="trackingCode">${esc(code)}</div><div class="actions"><button class="btn secondary" type="button" id="copyCode">Copiar código</button><button class="btn primary" type="button" id="goStatus">Consultar estado</button></div><p style="margin-top:20px">Recuerda: el aviso no sustituye la validación oficial de entrega.</p>`;
}
form.addEventListener("submit",async e=>{
 e.preventDefault();if(busy||!validStep())return;
 if(!$("#consent").reportValidity())return;
 busy=true;const btn=$("#wizardSubmit");btn.disabled=true;btn.textContent="Enviando…";alertMessage("");
 try{
  if(!window.detoditoReady)throw Error("No se ha podido conectar con el servicio. Revisa tu conexión.");
  const f=new FormData(form),file=f.get("qr");
  const {data,error}=await window.detoditoDB.rpc("create_pickup",{p_name:String(f.get("name")||"").trim(),p_vinted_code:String(f.get("vintedCode")||"").trim(),p_arrival_date:String(f.get("arrivalDate")||""),p_slot:String(f.get("slot")||""),p_qr_data:await fileData(file)});
  if(error)throw error;
  const code=String(data);screen("result");result.innerHTML=resultHTML(code);
  $("#copyCode").addEventListener("click",()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).then(()=>$("#copyCode").textContent="¡Copiado!").catch(()=>alertMessage("Selecciona y copia el código manualmente."));else alertMessage("Selecciona y copia el código manualmente.");});
  $("#goStatus").addEventListener("click",()=>{$("#lookup").value=code;screen("lookup");});
  form.reset();$("#fileName").textContent="";setStep(0);
 }catch(err){alertMessage("No se pudo enviar el aviso: "+(err.message||"Inténtalo de nuevo."));}
 finally{busy=false;btn.disabled=false;btn.textContent="Confirmar y enviar";}
});
$("#lookupBack").addEventListener("click",close);
check.addEventListener("submit",async e=>{
 e.preventDefault();if(busy)return;busy=true;alertMessage("");
 const btn=$("#lookupSubmit");btn.disabled=true;btn.textContent="Consultando…";
 try{
  if(!window.detoditoReady)throw Error("Sin conexión. Comprueba Internet.");
  const code=$("#lookup").value.trim().toUpperCase();
  const {data,error}=await window.detoditoDB.rpc("lookup_pickup",{p_code:code});
  if(error)throw error;
  screen("result");
  if(!data){
   result.innerHTML=`<h3>No encontramos tu solicitud</h3><p>Comprueba que has escrito el código privado completo, que empieza por DT-.</p><button class="btn primary" type="button" id="retryLookup">Volver a intentarlo</button>`;
  }else{
   const n=STATES.indexOf(data.status);
   const messages={Enviado:"Hemos recibido tu aviso. Nuestro personal lo revisará.",Aprobado:"Hemos aprobado tu aviso. Aún estamos buscando tu paquete.",Preparado:"Tu paquete está localizado y preparado. Ven con el código oficial y la documentación necesaria.",Entregado:"La entrega ya se ha completado."};
   result.innerHTML=`<h3>Estado de tu paquete</h3><span class="status-pill">${esc(data.status)}</span><p style="margin-top:20px">${esc(messages[data.status]||"Consulta de nuevo más tarde.")}</p><div class="status-steps">${STATES.map((s,i)=>`<span class="${i<=n?"done":""}">${esc(s)}</span>`).join("")}</div><button class="btn secondary" type="button" id="retryLookup">Consultar de nuevo</button>`;
  }
  $("#retryLookup").addEventListener("click",()=>screen("lookup"));
 }catch(err){alertMessage("No se pudo consultar el estado: "+(err.message||"Inténtalo de nuevo."));}
 finally{busy=false;btn.disabled=false;btn.textContent="Consultar estado";}
});
if(location.hash==="#consultar")open("lookup");
})();