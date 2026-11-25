(()=>{"use strict";
const KEY="detodito:pwa-install-skip:v1";
const isMobile=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||((navigator.maxTouchPoints||0)>1&&Math.min(screen.width,screen.height)<=900);
const standalone=()=>window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
const ios=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const android=()=>/Android/i.test(navigator.userAgent);
let deferredPrompt=null,installed=false,overlay=null,action=null,steps=null,status=null;
const skipped=()=>{try{return localStorage.getItem(KEY)==="1"}catch{return false}};
const skip=()=>{try{localStorage.setItem(KEY,"1")}catch{}};
function close(){if(overlay){overlay.hidden=true;document.body.classList.remove("dt-install-open");}}
function showStatus(s){status.textContent=s;status.hidden=false;}
function setAction(label,fn){action.textContent=label;action.onclick=fn;action.disabled=false;}
function show(){
 if(!overlay||overlay.hidden===false||standalone()||skipped()||installed)return;
 overlay.hidden=false;
 if(ios()){
  steps.hidden=false;
  steps.innerHTML='<p><strong>1.</strong> Abre esta página en <strong>Safari</strong>.</p><p><strong>2.</strong> Pulsa <strong>Compartir</strong> (cuadrado con flecha hacia arriba).</p><p><strong>3.</strong> Selecciona <strong>Añadir a pantalla de inicio</strong> y confirma.</p><p><strong>4.</strong> Abre <strong>De Todito</strong> desde su icono.</p>';
  setAction("Entendido",()=>{skip();close()});
 }else if(android()){
  steps.hidden=true;
  setAction("Instalar aplicación",async()=>{
   if(!deferredPrompt){
    steps.hidden=false;
    steps.innerHTML='<p>En Chrome, abre el menú <strong>⋮</strong> y pulsa <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</p><p>Después abre De Todito desde su icono.</p>';
    setAction("Entendido",()=>{skip();close()});
    return;
   }
   const prompt=deferredPrompt;deferredPrompt=null;
   action.disabled=true;
   try{
    await prompt.prompt();
    const choice=await prompt.userChoice;
    if(choice?.outcome==="accepted"){
     showStatus("Instalación iniciada. Cuando termine, abre De Todito desde su icono.");
     setAction("Continuar en la web",()=>{skip();close()});
    }else{
     setAction("Continuar en la web",()=>{skip();close()});
    }
   }catch{
    setAction("Ver cómo instalar",()=>{steps.hidden=false;steps.innerHTML='<p>Abre el menú del navegador y selecciona <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</p>'});
   }
  });
 }else{
  steps.hidden=false;
  steps.innerHTML='<p>Abre el menú del navegador y busca <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</p>';
  setAction("Entendido",()=>{skip();close()});
 }
}
window.addEventListener("beforeinstallprompt",event=>{
 event.preventDefault();deferredPrompt=event;
 /* Existing install button will use the newly available prompt. */
});
window.addEventListener("appinstalled",()=>{
 installed=true;deferredPrompt=null;skip();
 if(overlay&&!overlay.hidden){
  steps.hidden=true;showStatus("¡Aplicación instalada! Ya puedes abrirla desde el icono de De Todito en tu móvil.");
  setAction("Continuar en la web",close);
 }
});
function init(){
 if(!isMobile()||standalone()||skipped())return;
 overlay=document.createElement("div");overlay.id="dt-install-overlay";overlay.hidden=true;
 overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","dt-install-title");
 overlay.innerHTML='<div class="dt-install-card"><img class="dt-install-icon" src="icon-192.png" width="82" height="82" alt="Icono de De Todito"><div class="dt-install-kicker">MINIMARKET DE TODITO</div><h2 id="dt-install-title">Lleva De Todito contigo</h2><p>Instala nuestra aplicación para acceder a la tienda y consultar tus recogidas fácilmente.</p><div class="dt-install-steps" hidden></div><button class="dt-install-main" type="button">Instalar aplicación</button><p class="dt-install-status" aria-live="polite" hidden></p><button class="dt-install-skip" type="button">Omitir por ahora</button></div>';
 document.body.append(overlay);
 action=overlay.querySelector(".dt-install-main");
 steps=overlay.querySelector(".dt-install-steps");
 status=overlay.querySelector(".dt-install-status");
 overlay.querySelector(".dt-install-skip").addEventListener("click",()=>{skip();close()});
 setTimeout(show,550);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();