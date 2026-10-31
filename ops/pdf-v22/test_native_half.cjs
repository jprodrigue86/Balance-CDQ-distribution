'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('/tmp/cdq-v22-native-calculations.js','utf8');
function create(){
 const fields=new Map(),display={visible:0,hidden:1};
 const d={app:{viewerType:'PDF.js',runtimeHighlight:true},display,calculate:true,
  getField(k){
    if(k==='essai_cdq_probleme_constate')return null;
    if(!fields.has(k))fields.set(k,{value:'',readonly:false,display:0,textSize:10,numItems:0,multipleSelection:false});
    return fields.get(k);
  },
  resetForm(names){for(const n of names)this.getField(n).value='';}};
 vm.createContext(d);
 vm.runInContext(src,d,{timeout:5000,filename:'v21-native.js'});
 return {
  set(n,v){d.getField('essai_cdq_'+n).value=v;},
  update(){vm.runInContext('CDQ_update(this)',d,{timeout:5000});},
  val(n){return d.getField('essai_cdq_'+n).value;},
  state(n){
    const colors=['green','red','gray'].filter(c=>d.getField('essai_cdq_'+n+'_'+c).display===0);
    assert.equal(colors.length,1,n+': '+colors);
    return colors[0];
  }
 };
}
for(const division of ['0.5','0,5']){
 const d=create();
 d.set('echelon',division);
 d.set('charge_excentricite','200');
 d.set('excentricite_avant_arriere_gauche','199.5');
 d.set('excentricite_avant_avant_gauche','200');
 d.set('excentricite_avant_avant_droit','199');
 d.update();
 assert.equal(d.val('tolerance_excentricite'),'±1e','tol at '+division);
 assert.equal(d.state('fleche_avant_arriere_gauche'),'green','199.5 accepted at e='+division);
 assert.equal(d.state('fleche_avant_avant_gauche'),'green','200 accepted at e='+division);
 assert.equal(d.state('fleche_avant_avant_droit'),'red','199 rejected at e='+division);
 assert.equal(d.state('bloc4'),'red','non-conformity preserved');
 d.set('excentricite_avant_avant_droit','200');d.update();
 assert.equal(d.state('fleche_avant_avant_droit'),'green');
 console.log('PASS actual native formulas: échelon='+division+' (199.5 green, 199 red, 200 green)');
}
