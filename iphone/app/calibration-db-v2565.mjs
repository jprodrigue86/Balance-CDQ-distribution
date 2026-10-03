import {applyCalibrationMethods} from './calibration-methods-v2566.mjs';
const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const slug=(manufacturer,model)=>norm(manufacturer).replace(/\s+/g,'-')+'::'+norm(model).replace(/\s+/g,'-');
const detected=(category,manufacturer,model,aliases=[])=>({key:slug(manufacturer,model),category,manufacturer,model,aliases,verified:false,status:'detected',method:null});

const devices=[
  detected('indicator','Western Scale','M1'),
  detected('indicator','Rice Lake','680',['680-2A','680 2A']),
  detected('indicator','Rice Lake','720i',['720i-2A','720I-2A']),
  detected('indicator','Rice Lake','420HE',['420HE-1A']),
  detected('indicator','Rice Lake','SCT2200',['Sct2200']),
  detected('indicator','Rice Lake','120'),
  detected('indicator','Mettler Toledo','IND360',['Ind360']),
  detected('indicator','Mettler Toledo','IND700',['Ind700']),
  detected('indicator','Mettler Toledo','IND560'),
  detected('indicator','Mettler Toledo','IND246'),
  detected('indicator','Mettler Toledo','IND226'),
  detected('indicator','Mettler Toledo','IND236',['IND 236']),
  detected('indicator','Mettler Toledo','IND780',['IND 780']),
  detected('indicator','Mettler Toledo','Panther'),
  detected('indicator','A&D','AD4321',['AND AD4321']),
  detected('indicator','Avery Weigh-Tronix','ZM305-SD1',['Weigh-Tronix ZM305-SD1']),
  detected('indicator','Cardinal','210-FE'),
  detected('indicator','Totalcomp','TWP'),
  detected('bench','Adam Equipment','CPW Plus-35'),
  detected('bench','Adam Equipment','CPW Plus-6'),
  detected('bench','VWR','VWR-224TC'),
  detected('bench','Mettler Toledo','ML104T/31'),
  detected('bench','Mettler Toledo','SW'),
  detected('bench','CEM','SMART 6'),
  detected('bench','Ohaus','RC31P30'),
  detected('bench','Ohaus','R31P30'),
  detected('bench','Ohaus','RC31P3'),
  detected('bench','Ohaus','V12P6'),
  detected('bench','Ohaus','i-DT33P',['Defender 3000 i-DT33P']),
  detected('bench','MyWeigh','KD-8000'),
  detected('bench','Sartorius','Practum2102-1S'),
  detected('bench','Sartorius','Entris'),
  detected('bench','Kilotech','KIN1000'),
  detected('bench','A&D','GP-30K',['AND GP-30K']),
  detected('bench','Kilotech','KWD 500-05'),
  detected('bench','Anyload','OCS-L'),
  detected('bench','Kilotech','KHS-200-30'),
  detected('bench','Kilotech','KWS SW-12'),
  detected('bench','Digi','SM-5600B'),
  detected('bench','Camry','ACS-30-JE51'),
  detected('bench','UWE','AFW'),
  detected('bench','Rice Lake','IQ-710-2A')
];

applyCalibrationMethods(devices);

const fileIndex=Object.freeze({
  '13gj7Gm6CH3Rz7cOpH03IkF5LCvyEk-wQMTtSX_4lVmM':slug('Adam Equipment','CPW Plus-35'),
  '1AN3dULE3EbTslEAvn0ijqip5uilcrCtTksFb0ctZ2Sc':slug('Mettler Toledo','IND360'),
  '1PlTCkebVsfTrNLk3b18gICS65yO-OWiMcnRpt_M5q7A':slug('Mettler Toledo','IND700'),
  '1md9rA5EUEW9jELcVCe0EKXxtjigwfHTNMNahH7_qdK8':slug('VWR','VWR-224TC'),
  '173GiK6OS9C1EI7lgBBe8keYrSG_yPzmWj-49F2M1GPs':slug('Mettler Toledo','ML104T/31'),
  '18oOL63R4sjl6ydV4C_rDRMw8bIJPlWDJ3oLFpleDEWQ':slug('CEM','SMART 6'),
  '1h3kxChMrrsxopluwAShCBBLDcZ1lejbqWKmEUjdPt7s':slug('Ohaus','RC31P30'),
  '11tG-lhfttfwubEZcoQ0jH3oHcf-xxbn183lx1QYX9FQ':slug('Ohaus','RC31P30'),
  '1iGU_FCuLdaDxCA6RSG4k9wQfkCgbqeCI0rRa-GsuZME':slug('Ohaus','RC31P30'),
  '1XmK4yrlzsOsFVeSTQ3JAMLPgUEIB64V13-sdTp5mNIs':slug('Rice Lake','120'),
  '1MII8q4uZuhzEpC-3IgnHKj80W5N_utWFxLSacRV_OdI':slug('MyWeigh','KD-8000'),
  '1LnKgm3phfLmaX7wQ0FF-fnkLszWfypW_PRk4gbb5HiE':slug('Rice Lake','120'),
  '1IEtPMBggvRwek8DvRa5U_-ZNxU9-m43d9WRiIBkHpd0':slug('Totalcomp','TWP'),
  '1kSVQCDJ1J4_Rss3yd8EukOmnXJGCQ6IXVMMqzQHXxUw':slug('Mettler Toledo','Panther'),
  '1gEVoGYgoTrF8_O0ohwmlFRDiTGP31TR_bM66fLpywgw':slug('Totalcomp','TWP'),
  '1-QIyb2Pv8IGSNLBI8GL_gbczetDERKuhnpnDrunJkfs':slug('Sartorius','Practum2102-1S'),
  '1aZlc4ugp1ZkPuQ_ar78NHE7_aMfUvlRTLo_yaGDdxc0':slug('Mettler Toledo','SW'),
  '1TZeLKKFYstmxyIsJGs_9jNv6uPATCswzNA5opov5sPU':slug('Mettler Toledo','IND226'),
  '1GUJvPCgrYNUBIbfq1mOttO1_3QO9pXW6EHrVvE5fHyY':slug('Kilotech','KIN1000'),
  '1c2a38LK5BAXjhlNeEO6qU3ZzDVOBtP0eTaOwq6aUaww':slug('Ohaus','R31P30'),
  '13M_0-MGV3HcdtGphkHVEZEcppH-NM74bjx8rwa4VdAY':slug('A&D','AD4321'),
  '1Gqjtnw37FY_oGPOrzj1-Y6kA3s0xRGaLpjoAe_253Uo':slug('Rice Lake','680'),
  '1y3IPEC3t3FFvkDLx5dZ9vQ6zs_lTUXRmITsHX_AXca8':slug('Ohaus','RC31P3'),
  '1OQQYVqes--iHZplQw5hkNfiwXw4y9RKnfiembeis3_c':slug('Rice Lake','SCT2200'),
  '1ryg7hJXMxZC62Ccx706a8U2F6zgJZdwQPpB-TnjpXWA':slug('Rice Lake','SCT2200'),
  '1cTC6PKTOkqFua9ieVbTpTmx0whH5ZAgNvs2fjvxGLN8':slug('Rice Lake','720i'),
  '1MepI6qYZe4SpeZp35qJgX3Onxg0tnG5PXSDhV5lc4lc':slug('Adam Equipment','CPW Plus-35'),
  '1HLl6Q6t88SbsURjeZHr7XMZmJYUhwaaBiruh1Db3NRQ':slug('Ohaus','V12P6'),
  '1Wq08oNZEtobNBmWKtAwHtmiesDnEjBcDPhG6O8wS-7I':slug('Mettler Toledo','IND236'),
  '1KDAD_Ru5UNYD1tHxjE7_mfiIPBGCFbhWW4IEYq987Pw':slug('Adam Equipment','CPW Plus-6'),
  '1OYAC5U8StIxG8MKsI0QfkB0S32DA0do7_M4wZFa1V6I':slug('Ohaus','i-DT33P'),
  '1TCSs8qRUuIk7be2ba2QxQbDTfOlXA5NPZFstxvs4yUw':slug('Sartorius','Entris'),
  '1mspamWQG1YNvtxIv7gzWfVQVwbb3qbzKiwfssyLiNkE':slug('A&D','GP-30K'),
  '1Ue5vR4R-wFnvSzRsTU4HmeBoKSRfKP7i45ALSYFkLD0':slug('Avery Weigh-Tronix','ZM305-SD1'),
  '100zj0OnT2vupRvYrodkd1gwF38iBDffXL383MtoHj9A':slug('Cardinal','210-FE'),
  '1kptPCOknDy2iMpu2Qwd08M58ZfpmmNeoFnWvxY5dxao':slug('Rice Lake','680'),
  '1OlHy6ROi0TV8AgmeZRiksne7eNy7QiicDFX4BkxCtOk':slug('Mettler Toledo','IND780'),
  '1Zhcp1l4neVs1JbPLM8DSC21RA3dwOK0EckpdJ9G9vbo':slug('Rice Lake','420HE'),
  '1cWb_610e4TGE0qlOBfYDnNdQSw57cfzZLWgYemq0V7k':slug('Kilotech','KWD 500-05'),
  '1jsNtJLA1jg2n6fRsTKjS3YEK4tgA9I40ENlSVeM33iw':slug('Anyload','OCS-L'),
  '1M20Rhoj_b5Ppyjcv720WC6SnE7iWEzT8iqYmN0IAlpY':slug('Kilotech','KHS-200-30'),
  '13-DKr40WcSxxG69x6jK6lc3qWgezDt8XLfZVORRM-OU':slug('Kilotech','KHS-200-30'),
  '1Xtws_XKid1uZzocSaWV5x_lozBnIsxFqn2WUklLKS1Y':slug('Kilotech','KWS SW-12'),
  '1R1gfM9MCyJWG7sVjwFmO20d9pgkNvDL9wL83BCCxm6M':slug('Rice Lake','120'),
  '1iEiTsKtGGTEEVTZFuomVMKq4Kwew-kRkmXK58VVLizg':slug('Digi','SM-5600B'),
  '1rKrU3SOb_e49Bo9O01wi0j84jftwTXQv4ggTcoV1xRk':slug('Camry','ACS-30-JE51'),
  '1-b_NdIZBAC0vLloWfGd1UwKy8iLzPjXDDH9CQhC4WBI':slug('UWE','AFW'),
  '10pXVZ0L1R2Zhu65uSezDrRMmPDGKoCie6CO_SEnfLUo':slug('Rice Lake','120')
});

function sameManufacturer(a,b){
  const x=norm(a),y=norm(b);
  if(!x||!y)return true;
  if((x.includes('rice lake')||x==='ricelake')&&(y.includes('rice lake')||y==='ricelake'))return true;
  if((x.includes('mettler')&&x.includes('toledo'))&&(y.includes('mettler')&&y.includes('toledo')))return true;
  if((x==='a d'||x==='and')&&(y==='a d'||y==='and'))return true;
  if((x.includes('weigh tronix')||x.includes('avery'))&&(y.includes('weigh tronix')||y.includes('avery')))return true;
  return x===y;
}
function sameModel(device,value){
  const wanted=norm(value).replace(/\s+/g,'');
  if(!wanted)return false;
  return [device.model,...(device.aliases||[])].some(v=>norm(v).replace(/\s+/g,'')===wanted);
}
function findCalibration(manufacturer,model){
  const matches=devices.filter(d=>sameModel(d,model)&&(!norm(manufacturer)||sameManufacturer(d.manufacturer,manufacturer)));
  return matches.length===1?matches[0]:null;
}
function byKey(key){return devices.find(d=>d.key===key)||null;}
const liveFileIndex=new Map();
const baseDeviceCount=devices.length;
function resetClientDevices(){devices.splice(baseDeviceCount);liveFileIndex.clear();}
function forFile(fileId){return byKey(liveFileIndex.get(String(fileId||''))||fileIndex[String(fileId||'')]||'');}
function addClientDevices(items){for(const item of items||[]){
  if(!item.manufacturer||!item.model)continue;
  let device=findCalibration(item.manufacturer,item.model);
  if(!device){device=detected(item.category==='bench'?'bench':'indicator',String(item.manufacturer).slice(0,120),String(item.model).slice(0,120));devices.push(device);applyCalibrationMethods([device]);}
  if(item.fileId)liveFileIndex.set(String(item.fileId),device.key);
}}
function categories(){return [
  {id:'indicator',label:'Indicateur',count:devices.filter(d=>d.category==='indicator').length},
  {id:'bench',label:'Balance de table',count:devices.filter(d=>d.category==='bench').length}
];}
function manufacturers(category){
  return [...new Set(devices.filter(d=>d.category===category).map(d=>d.manufacturer))].sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
}
export {devices,fileIndex,norm,slug,findCalibration,byKey,forFile,categories,manufacturers,addClientDevices,resetClientDevices};
