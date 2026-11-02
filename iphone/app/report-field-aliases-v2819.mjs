// Read-only bridges for the approved V34 form. Saved field names and calculators
// remain native to their PDF; historical reports are never migrated on opening.
const PREFIX='essai_cdq_';
const aliases=Object.freeze({
 date_etalonnage_1:'date_jour',date_etalonnage_2:'date_mois',date_etalonnage_3:'date_annee',
 prochain_etalonnage_1:'prochain_jour',prochain_etalonnage_2:'prochain_mois',prochain_etalonnage_3:'prochain_annee',
 unite_mesure:'unite',legal_pour_commerce:'legal_commerce',
 Statut_conformite:'statut_global',Bouton_Conforme:'conclusion_green',
 Bouton_NonConforme:'conclusion_red',Bouton_ACompleter:'conclusion_gray',
 resume_commentaires:'commentaire',Bouton_Date_Aujourdhui:'calendrier_date',
 Bouton_Calcul_Prochain_Etalonnage:'calendrier_prochain'
});
const reverse=Object.freeze(Object.fromEntries(Object.entries(aliases).map(([a,b])=>[b,a])));
export function reportFieldV2819(fields,name){
 if(typeof fields?.getFieldMaybe==='function')return fields.getFieldMaybe(name);
 if(fields instanceof Map)return fields.get(name);
 if(Array.isArray(fields))return fields.find(field=>field?.getName?.()===name||field?.name===name);
 return fields&&typeof fields==='object'?fields[name]:undefined;
}
export function isV34ReportFieldsV2819(fields){
 return reportFieldV2819(fields,PREFIX+'client_nom')!==undefined&&reportFieldV2819(fields,PREFIX+'probleme_constate')!==undefined&&reportFieldV2819(fields,PREFIX+'_recalcul')!==undefined;
}
export function reportFieldNameV2819(fields,name){
 if(['Statut_conformite','Bouton_Conforme','Bouton_NonConforme','Bouton_ACompleter','resume_commentaires'].includes(name)&&reportFieldV2819(fields,PREFIX+'probleme_constate')!==undefined&&reportFieldV2819(fields,PREFIX+'_recalcul')!==undefined){const finalName=PREFIX+aliases[name];if(reportFieldV2819(fields,finalName)!==undefined)return finalName;}
 if(reportFieldV2819(fields,name)!==undefined)return name;
 if(!isV34ReportFieldsV2819(fields)||typeof name!=='string'||name.startsWith(PREFIX))return name;
 const actual=PREFIX+(aliases[name]||name);
 return reportFieldV2819(fields,actual)!==undefined?actual:name;
}
export function legacyReportFieldNameV2819(name){
 if(typeof name!=='string'||!name.startsWith(PREFIX))return name;
 const suffix=name.slice(PREFIX.length);return reverse[suffix]||suffix;
}
export function reportFieldValueV2819(fields,name){
 const field=reportFieldV2819(fields,reportFieldNameV2819(fields,name));
 if(field===undefined||field===null)return undefined;
 if(typeof field.getText==='function')return field.getText();
 if(typeof field.getSelected==='function')return field.getSelected();
 if(typeof field.isChecked==='function')return field.isChecked();
 if(Array.isArray(field))return field[0]?.value;
 if(typeof field==='object'&&Object.hasOwn(field,'value'))return field.value;
 return typeof field==='object'?undefined:field;
}
