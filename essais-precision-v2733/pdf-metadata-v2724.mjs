// PDF worker queries are independent; keep annotation work bounded on phones.
// Page results are applied in document order, preserving the last page's font
// choice when a field name occurs on several pages.
export async function readReaderMetadataV2724(doc){
  const pages=new Array(doc.numPages);let next=1;
  async function worker(){
    while(next<=doc.numPages){
      const number=next++;
      const page=await doc.getPage(number);
      pages[number-1]=await page.getAnnotations({intent:'display'});
    }
  }
  const [fields,actions]=await Promise.all([
    doc.getFieldObjects(),doc.getJSActions(),
    Promise.all(Array.from({length:Math.min(3,doc.numPages)},worker))
  ]);
  const typography=new Map();
  for(const annotations of pages)for(const annotation of annotations){
    if(!annotation.fieldName||!annotation.defaultAppearanceData||!['Tx','Ch'].includes(annotation.fieldType))continue;
    typography.set(annotation.fieldName,Number(annotation.defaultAppearanceData.fontSize)||11.25);
  }
  return {fields,actions,typography,firstPageHasAnnotations:!!pages[0]?.length};
}

export async function readCalculationMetadataV2724(doc){
  const [objects,calculationOrder,metadata,actions]=await Promise.all([
    doc.getFieldObjects(),doc.getCalculationOrderIds(),doc.getMetadata(),doc.getJSActions()
  ]);
  return {objects,calculationOrder,metadata,actions};
}
