// Final native spacing candidates keep their own geometry and borders.
// The marker is intentionally inactive for the four approved report families.
export const nativeSpacingFamiliesV2743=Object.freeze(['cuve4','tremie4','chariot','convoyeur','train','suspendue','trackscale','multitete']);
export function nativeSpacingFamilyV2743(pdf,L){
  const N=L.PDFName.of;
  const marker=pdf.catalog.lookup(N('CDQUniformSpacingV2743'));
  if(!(marker instanceof L.PDFBool)||marker.asBoolean()!==true)return '';
  const family=pdf.catalog.get(N('CDQReportRepairV2676'))?.decodeText?.()||'';
  return nativeSpacingFamiliesV2743.includes(family)?family:'';
}

// Keep the existing 3/4-point state behaviour without rebuilding either diagram,
// moving any field, changing a calculation, or redrawing a field appearance.
export function syncNativeVesselPointsV2743(pdf,L){
  if(!['cuve4','tremie4'].includes(nativeSpacingFamilyV2743(pdf,L)))return false;
  const N=L.PDFName.of,form=pdf.getForm(),choice=form.getFieldMaybe('points_test');
  if(!choice||!form.getFieldMaybe('_cdq_points_diagram_3')||!form.getFieldMaybe('_cdq_points_diagram_4'))return false;
  const three=choice.getSelected()[0]==='3 points';
  form.getCheckBox('_cdq_points_diagram_3')[three?'check':'uncheck']();
  form.getCheckBox('_cdq_points_diagram_4')[three?'uncheck':'check']();
  for(const phase of ['avant','apres'])for(const w of form.getField('excentricite_'+phase+'_arriere_droit').acroField.getWidgets())w.dict.set(N('F'),pdf.context.obj(three?2:4));
  return true;
}
