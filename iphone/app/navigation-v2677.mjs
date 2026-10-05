import {currentReader} from './reader-host-v2525.mjs';
function selector(){try{const w=document.querySelector('#app')?.contentWindow;return w&&w.location.origin===location.origin?w:null;}catch{return null;}}
export function back(){
 const reader=currentReader();if(reader){reader.requestClose().catch(()=>{});return true;}
 const s=selector();if(!s)return true;if(s.cdqWorkspaceV2638?.back?.())return true;
 try{if(s.cdqHandleAndroidBackV2602?.())return true;}catch{}return true;
}
window.cdqHandleAndroidBackV2602=back;
