import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {isEchelonDraftV22,echelonErrorV22,ECHELON_FIELD_V22} from '../../essais/menu-problemes-multiples-v22/echelon-v22.mjs';
const e=ECHELON_FIELD_V22;
for(const v of ['0','0.','0,','00','0.0','0,0','000.00','.','+','-']){
 assert.equal(isEchelonDraftV22(e,v),true,'Defer partial input '+v);
}
for(const v of ['0.5','0,5','.5',',5','0.05','1','2.5','2,5','0.50','10']){
 assert.equal(isEchelonDraftV22(e,v),false,'Commit positive input '+v);
 assert.equal(echelonErrorV22(e,v),'','Accept decimal '+v);
}
for(const v of ['0','0.0','0,0','-0.5','-0,5','x','0,','0.']){
 assert.notEqual(echelonErrorV22(e,v),'','Invalid final echelon '+v);
}
assert.equal(isEchelonDraftV22('essai_cdq_charge_excentricite','0'),false);
assert.equal(echelonErrorV22('essai_cdq_charge_excentricite','0'),'');
const reader=fs.readFileSync('essais/menu-problemes-multiples-v22/reader-v2525.mjs','utf8');
const html=fs.readFileSync('essais/menu-problemes-multiples-v22/reader.html','utf8');
const launcher=fs.readFileSync('essais-plancher-v22-echelon-20261031/index.html','utf8');
assert.match(reader,/field\.inputMode='decimal'/);
assert.match(reader,/isEchelonDraftV22\(el\.name,value\)/);
assert.match(reader,/validateEchelonV22\(field\)&&decimalGuard\.validate\(field\)/);
assert.match(html,/menu-problemes-multiples-v22\/reader-v2525\.mjs/);
assert.match(launcher,/menu-problemes-multiples-v22\/reader\.html/);
assert.match(launcher,/CDQ_Intermediaire_Essai_Fonctionnel_V22\.pdf/);
assert.match(launcher,/cdq-v20-direct-tap-restore/);
console.log('PASS V22 decimal input, dot/comma, typing 0 -> 0. -> 0.5, navigation validation and isolated reader paths');
