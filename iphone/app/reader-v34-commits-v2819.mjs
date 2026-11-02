import {isCorrectionReadingV2736,measurementErrorV2736} from './reader-measurements-v2736.mjs';
import {isEchelonDraftV22} from './reader-echelon-v2819.mjs';

// V34: a measurement becomes committed on blur/change, never during a pause.
// Draft scheduling and the calculation of an already committed field have
// distinct tokens: typing immediately into the next field cannot cancel it.
export function installV34Commits({surface,getDocument,getDefinitions,getEchelon,isBlocked,dispatch,setTimer=setTimeout,clearTimer=clearTimeout}){
  const trial=/^essai_cdq_(?:charge_point_[1-6]_(?:(?:avant|apres)_correction|charge_utilisee|charge_contrainte)|excentricite_(?:avant|apres)_(?:arriere_gauche|arriere_droit|avant_gauche|avant_droit)|echelon|charge_excentricite|etendue_verifiee|capacite_maximale)$/;
  let pending=0,settle=0,seq=0,pendingSeq=0,lastDoc=null;
  const sent=new Map();
  const baseName=name=>String(name||'').replace(/^essai_cdq_/,'');
  const commitOnly=name=>isCorrectionReadingV2736(name)||['etendue_verifiee','capacite_maximale'].includes(baseName(name));
  const nativeDriver=name=>isCorrectionReadingV2736(name)||/^(?:echelon|charge_excentricite|etendue_verifiee|capacite_maximale|charge_point_\d+_(?:charge_utilisee|charge_contrainte)(?:_2)?)$/.test(name);
  const valid=value=>{const s=String(value??'').trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.');return s===''||s==='-'||/^O\.L$/i.test(s)||/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s);};
  const eligible=el=>el?.name&&(trial.test(el.name)||nativeDriver(el.name)&&getDefinitions('essai_cdq__recalcul').length>0)&&el.matches?.('input,textarea')&&!el.disabled&&!el.readOnly;
  function commit(el){
    const doc=getDocument();
    if(!eligible(el)||isBlocked()||!doc||el.isConnected===false)return;
    const def=getDefinitions(el.name)[0],value=String(el.value??'');
    if(isEchelonDraftV22('essai_cdq_'+baseName(el.name),value))return;
    if(!def?.id||(baseName(el.name)!=='etendue_verifiee'&&!valid(value)))return;
    if(isCorrectionReadingV2736(el.name)&&measurementErrorV2736(value,getEchelon()))return;
    if(doc!==lastDoc){lastDoc=doc;sent.clear();}
    if(sent.get(el.name)===value)return;
    sent.set(el.name,value);
    if(el.name.startsWith('essai_cdq_')){
      const state=doc.annotationStorage?.getValue(def.id,def);
      if(state&&String(state.value??'')!==value)doc.annotationStorage?.setValue(def.id,{value});
      dispatch({id:def.id,name:'Keystroke',value,willCommit:true,commitKey:1,selStart:0,selEnd:value.length});
    }
    // Hybrid reports retain native Blur/Validate/Calculate actions and storage.
    // Only their common conclusion refresh is queued after that native commit.
    const calc=getDefinitions('essai_cdq__recalcul')[0],token=++seq;
    clearTimer(settle);
    if(calc?.id)settle=setTimer(()=>{
      if(token!==seq||getDocument()!==doc||isBlocked())return;
      dispatch({id:calc.id,name:'Calculate',value:''});
    },75);
  }
  function schedule(el,immediate){
    if(!eligible(el))return;
    clearTimer(pending);++pendingSeq;
    if(immediate){commit(el);return;}
    const token=pendingSeq;pending=setTimer(()=>{if(token===pendingSeq)commit(el);},130);
  }
  surface.addEventListener('input',e=>{
    if(!eligible(e.target))return;
    sent.delete(e.target.name);
    if(commitOnly(e.target.name)){clearTimer(pending);++pendingSeq;return;}
    schedule(e.target,false);
  });
  for(const type of ['blur','change','focusout'])surface.addEventListener(type,e=>schedule(e.target,true),true);
  return {reset(){clearTimer(pending);clearTimer(settle);++seq;++pendingSeq;lastDoc=null;sent.clear();}};
}
