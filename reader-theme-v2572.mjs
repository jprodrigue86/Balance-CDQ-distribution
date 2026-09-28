const allowed=new Set(['dark','light','metal','electric','steel','violet']);
export function storedReaderTheme(){
  try{
    const direct=localStorage.getItem('cdqTheme');
    if(allowed.has(direct))return direct;
    const prefs=JSON.parse(localStorage.getItem('cdq_display_prefs_last_v2216')||'null');
    if(allowed.has(prefs?.theme))return prefs.theme;
  }catch(_){}
  return 'dark';
}
export function applyReaderTheme(theme){
  document.documentElement.dataset.readerTheme=allowed.has(theme)?theme:storedReaderTheme();
}
export function installReaderTheme(){
  applyReaderTheme();
  window.addEventListener('storage',e=>{if(['cdqTheme','cdq_display_prefs_last_v2216'].includes(e.key))applyReaderTheme();});
}
