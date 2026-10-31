'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('/tmp/cdq-plancher-v21-native.js','utf8');
const corners=['arriere_gauche','arriere_droit','avant_gauche','avant_droit'];
function setup(){
 const fields=new Map(),display={visible:0,hidden:1};
 const world={app:{viewerType:'PDF.js',runtimeHighlight:true},display,calculate:true,
  getField(key){
   if(key==='essai_cdq_probleme_constate')return null;
   if(!fields.has(key))fields.set(key,{value:'',readonly:false,display:0,textSize:10,numItems:0,multipleSelection:false});
   return fields.get(key);
  },
  resetForm(names){for(const name of names)this.getField(name).value='';}};
 vm.createContext(world);
 vm.runInContext(source,world,{timeout:4000,filename:'embedded-v21.js'});
 return {
  set(n,v){world.getField('essai_cdq_'+n).value=v;},
  update(){vm.runInContext('CDQ_update(this)',world,{timeout:4000});},
  color(n){
   const states=['green','red','gray'].filter(s=>world.getField('essai_cdq_'+n+'_'+s).display===display.visible);
   assert.equal(states.length,1,'Expected one visible state for '+n+': '+states.join(','));
   return states[0];
  },
  tol(){return vm.runInContext('CDQ_tol(200,1)',world);}
 };
}
const d=setup();
assert.equal(d.tol(),1);
d.set('echelon','1');d.set('charge_excentricite','200');
d.set('excentricite_avant_arriere_gauche','189');
d.set('excentricite_avant_avant_gauche','200');
d.set('excentricite_avant_avant_droit','200');d.update();
const col=(phase,corner)=>d.color('fleche_'+phase+'_'+corner);
const box=(phase,corner)=>d.color('coin_excentricite_'+phase+'_'+corner);
assert.equal(col('avant','arriere_gauche'),'red');
assert.equal(col('avant','avant_gauche'),'green');
assert.equal(col('avant','avant_droit'),'green');
assert.equal(col('avant','arriere_droit'),'gray');
assert.equal(box('avant','arriere_gauche'),'red');
assert.equal(box('avant','avant_gauche'),'green');
assert.equal(box('avant','avant_droit'),'green');
assert.equal(d.color('bloc4'),'red');assert.equal(d.color('cadre_avant'),'red');
d.set('excentricite_avant_arriere_gauche','200');d.update();
assert.equal(col('avant','arriere_gauche'),'green');
assert.equal(d.color('bloc4'),'gray');
d.set('excentricite_avant_arriere_droit','200');d.update();
assert.equal(d.color('bloc4'),'green');
for(const c of corners)assert.equal(col('avant',c),'green');
d.set('excentricite_avant_avant_gauche','201');
d.set('excentricite_avant_avant_droit','199');d.update();
assert.equal(col('avant','avant_gauche'),'green');
assert.equal(col('avant','avant_droit'),'green');
d.set('excentricite_avant_avant_gauche','202');
d.set('excentricite_avant_avant_droit','198');d.update();
assert.equal(col('avant','avant_gauche'),'red');
assert.equal(col('avant','avant_droit'),'red');
assert.equal(col('avant','arriere_gauche'),'green');
d.set('excentricite_apres_avant_gauche','200');
d.set('excentricite_apres_arriere_gauche','189');d.update();
assert.equal(col('apres','avant_gauche'),'green');
assert.equal(col('apres','arriere_gauche'),'red');
assert.equal(col('apres','avant_droit'),'gray');
assert.equal(col('avant','avant_gauche'),'red');
assert.equal(d.color('bloc4'),'red');
d.set('charge_excentricite','');d.update();
assert.equal(col('avant','avant_gauche'),'gray');
assert.equal(col('apres','arriere_gauche'),'gray');
console.log('PASS native PDF JS: 189 red / 200 green, neutral blank, badges, +/-1e, corrections, before/after, missing parameters.');
