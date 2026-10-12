// Upload progress is a status. Cancelling an unsent report belongs in its menu.
export function installPendingReportMenuV2731(row, options){
 if(row.cdqPendingMenuV2731){row.cdqPendingMenuV2731.update(options);return row.cdqPendingMenuV2731;}
 const document=row.ownerDocument,host=document.defaultView,actions=row.querySelector('.file-actions');
 if(!actions)return null;
 let current=options,menu=null;
 const button=document.createElement('button');button.type='button';button.className='cdq-pending-menu-button-v2731';button.textContent='⋮';button.title='Actions du rapport en attente';button.setAttribute('aria-label',button.title);button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');
 function close(focus=false){if(!menu)return;menu.remove();menu=null;button.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',keydown,true);host.removeEventListener('resize',hide);host.removeEventListener('scroll',hide,true);host.removeEventListener('cdq:access-state-v2527',hide);host.removeEventListener('cdq:drive-cleared-v2632',hide);if(focus&&button.isConnected)button.focus();}
 const hide=()=>close();
 function outside(event){if(!menu?.contains(event.target)&&!button.contains(event.target))close();}
 function keydown(event){if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true);}}
 function show(event){
  event?.preventDefault();event?.stopImmediatePropagation();
  if(!current.canWrite()||!row.isConnected)return;
  if(menu){close(true);return;}
  document.querySelectorAll('.cdq-pending-menu-v2731').forEach(other=>other.cdqClosePendingV2731?.());
  menu=document.createElement('div');menu.className='cdq-pending-menu-v2731';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Actions du rapport en attente');menu.cdqClosePendingV2731=close;
  const retire=document.createElement('button');retire.type='button';retire.textContent='Retirer le rapport en attente';retire.setAttribute('role','menuitem');retire.setAttribute('aria-label',retire.textContent);
  retire.onclick=event=>{event.preventDefault();event.stopPropagation();const action=current;close();Promise.resolve().then(()=>{if(action.canWrite()&&row.isConnected)return action.retire();}).catch(action.reportError);};
  menu.append(retire);document.body.append(menu);button.setAttribute('aria-expanded','true');
  const rect=button.getBoundingClientRect(),width=menu.getBoundingClientRect().width||240,height=menu.getBoundingClientRect().height||52;
  menu.style.left=Math.max(8,Math.min(rect.right-width,host.innerWidth-width-8))+'px';menu.style.top=Math.max(8,Math.min(rect.bottom+4,host.innerHeight-height-8))+'px';
  document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',keydown,true);host.addEventListener('resize',hide);host.addEventListener('scroll',hide,true);host.addEventListener('cdq:access-state-v2527',hide);host.addEventListener('cdq:drive-cleared-v2632',hide);retire.focus();
 }
 function context(event){if(!current.canWrite())return;show(event);}
 function keyboard(event){if(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey)show(event);}
 button.onclick=show;row.addEventListener('contextmenu',context,true);row.addEventListener('keydown',keyboard,true);actions.append(button);
 const api={update(value){current=value;button.hidden=!current.canWrite();if(button.hidden)close();},remove(){close();button.remove();row.removeEventListener('contextmenu',context,true);row.removeEventListener('keydown',keyboard,true);delete row.cdqPendingMenuV2731;}};
 row.cdqPendingMenuV2731=api;api.update(options);return api;
}
