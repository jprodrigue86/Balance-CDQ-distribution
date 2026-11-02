// UI and scheduling only. The existing durable stores own all report writes.
export function networkLabelV2819(online){
  return online===false?'Sans réseau · sauvegarde sur cet appareil':'Réseau détecté · synchronisation automatique';
}
export function resumeOfflineWorkV2819(sync,refresh){
  // Invoke sync first, without awaiting a view refresh or an unrelated queue.
  const start=fn=>{try{return Promise.resolve(fn());}catch(error){return Promise.reject(error);}};
  return Promise.allSettled([start(sync),start(refresh)]);
}
export function reconnectOutboxV2819(queue){
  // Only transient PDF retries: no inventory replay and no conflict override.
  return queue.map(action=>/^pdf-(?:save-v2520|import)$/.test(action.kind||'')&&action.pausedV2746!==true&&Number(action.nextRetryAtV2746)>0
    ?{...action,nextRetryAtV2746:0}:action);
}
const themeProperties=['--cdq-page','--cdq-surface','--cdq-raised','--cdq-line','--cdq-ink','--cdq-muted','--cdq-accent','--cdq-selected','--cdq-bg-v2793','--cdq-bg-base-v2793'];
export function inheritOfflineThemeV2819(panel){
  if(!panel?.ownerDocument)return;
  const document=panel.ownerDocument;
  if(!document.getElementById('cdqOfflineExperienceStyleV2819')){
    const link=document.createElement('link');link.id='cdqOfflineExperienceStyleV2819';link.rel='stylesheet';link.href=new URL('./offline-experience-v2819.css',import.meta.url).href;document.head.append(link);
  }
  const copy=()=>{
    try{
      const source=document.getElementById('app')?.contentDocument?.documentElement;
      if(!source)return;
      const styles=source.ownerDocument.defaultView.getComputedStyle(source);
      for(const property of themeProperties){const value=styles.getPropertyValue(property);if(value)panel.style.setProperty(property,value);else panel.style.removeProperty(property);}
      return source;
    }catch{return null;}
  };
  const source=copy();
  if(source&&panel.cdqThemeSourceV2819!==source){
    panel.cdqThemeObserverV2819?.disconnect();panel.cdqThemeSourceV2819=source;
    panel.cdqThemeObserverV2819=new MutationObserver(()=>{if(!panel.hidden)copy();});
    panel.cdqThemeObserverV2819.observe(source,{attributes:true,attributeFilter:['class','style','data-cdq-palette','data-cdq-background-v2793']});
  }
}
export function installOfflineStatusV2819(){
  if(typeof document==='undefined')return;
  const paint=()=>{
    const host=document.getElementById('cdqTopActionsV2204');if(!host)return;
    let status=document.getElementById('cdqNetworkStateV2819');
    if(!status){status=document.createElement('p');status.id='cdqNetworkStateV2819';status.setAttribute('role','status');status.setAttribute('aria-live','polite');host.after(status);}
    const label=networkLabelV2819(navigator.onLine);
    if(status.textContent!==label)status.textContent=label;
    status.dataset.offline=String(navigator.onLine===false);
    const offline=document.getElementById('cdqV19OfflineStatus');
    if(offline){offline.removeAttribute('aria-pressed');offline.setAttribute('aria-haspopup','dialog');}
    window.cdqInterfaceV2708?.rows?.();
  };
  for(const event of ['online','offline','cdq:access-ready','cdq:client-content-ready-v2745'])window.addEventListener(event,paint);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
}
