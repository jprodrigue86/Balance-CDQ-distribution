const IDENTITY=/^client_(nom|telephone|technicien|adresse|ville|province|code_postal)$/;
// Multi-têtes V2 includes 293 widgets. Retain its complete drawing under the
// existing pixel budget; the two-reader pool still bounds retained artwork.
export const READER_CACHE_LIMITS_V2730=Object.freeze({bytes:4*1024*1024,pixels:4000000,controls:384});
export function isCacheableReaderDraftV2730({readerPreparedVersion,initialValues,readOnly,bytes}){
  return readerPreparedVersion===2730&&!readOnly&&Number.isInteger(bytes)&&bytes>0&&bytes<=READER_CACHE_LIMITS_V2730.bytes&&
    initialValues&&typeof initialValues==='object'&&!Array.isArray(initialValues)&&Object.keys(initialValues).length>0&&
    Object.entries(initialValues).every(([name,value])=>IDENTITY.test(name)&&typeof value==='string'&&value.length<=1000);
}
// A prepared existing PDF has its own immutable values. Reopening it must use
// those source snapshots, without applying the blank-draft identity rules.
// The host labels legacy normalization separately; it never fabricates the
// saved-document version, and the reader still requires its prepared Blob.
export function isCacheableReaderDocumentV2730({readerPreparedVersion,readerNormalizedV2730,preparedEpoch,initialValues,readOnly,bytes}){
  const prepared=readerPreparedVersion===2730||readerNormalizedV2730===true&&Number.isInteger(preparedEpoch)&&preparedEpoch>=0;
  return prepared&&!readOnly&&initialValues==null&&Number.isInteger(bytes)&&bytes>0&&bytes<=READER_CACHE_LIMITS_V2730.bytes;
}
export function hasPristineIdentityV2730(fields){
  const entries=fields instanceof Map?fields.entries():Object.entries(fields||{});let identity=false;
  for(const [name,raw] of entries){
    if(!IDENTITY.test(name))continue;identity=true;
    for(const field of Array.isArray(raw)?raw:[raw]){
      // The approved blank Canadian templates contain the static province Qc.
      // It is safe only when both current and ResetForm defaults are exactly Qc.
      if(name==='client_province'&&field?.value==='Qc'&&field?.defaultValue==='Qc')continue;
      if([field?.value,field?.defaultValue].some(value=>String(value??'').trim()))return false;
    }
  }
  return identity;
}
export async function readerSourceKeyV2730(bytes){
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
}
// PDF.js returns mutable cached metadata, and AnnotationStorage.getValue merges
// into its supplied default. Never expose the original snapshots to a consumer.
export function protectReaderSnapshotsV2730(document,clone=structuredClone){
  const snapshots=new Map(),pages=new WeakSet();
  for(const name of ['getFieldObjects','getJSActions','getCalculationOrderIds']){
    const original=document[name].bind(document);
    document[name]=(...args)=>{if(!snapshots.has(name))snapshots.set(name,original(...args).then(value=>value==null?value:clone(value)));return snapshots.get(name).then(value=>value==null?value:clone(value));};
  }
  const getPage=document.getPage.bind(document);
  document.getPage=(...args)=>getPage(...args).then(page=>{
    if(pages.has(page))return page;pages.add(page);
    const original=page.getAnnotations.bind(page),annotations=new Map();
    page.getAnnotations=(options={})=>{const key=options.intent||'display';if(!annotations.has(key))annotations.set(key,original(options).then(clone));return annotations.get(key).then(clone);};
    return page;
  });
}
export function readerViewportV2730(viewer,surface=window){
  const page=viewer.getPageView(0),output=page?.outputScale;
  return {width:surface.innerWidth,height:surface.innerHeight,dpr:surface.devicePixelRatio,rotation:viewer.pagesRotation,scale:viewer.currentScale,
    pageWidth:page?.viewport?.width,pageHeight:page?.viewport?.height,sx:output?.sx,sy:output?.sy};
}
export function sameReaderViewportV2730(a,b){
  if(!a||!b)return false;
  return ['width','height','dpr','rotation','pageWidth','pageHeight','sx','sy'].every(name=>a[name]===b[name])&&Number.isFinite(a.scale)&&Math.abs(a.scale-b.scale)<1e-7;
}
export function readerOpeningLeaseIsCurrentV2730({generation,currentGeneration,epoch,currentEpoch,closed}){
  return !closed&&generation===currentGeneration&&epoch===currentEpoch;
}
function validArtwork(artwork){
  return !!(artwork&&artwork.canvases?.length&&artwork.dimensions?.length===artwork.canvases.length&&artwork.canvases.every((canvas,index)=>{
    const size=artwork.dimensions[index];return canvas.width===size.width&&canvas.height===size.height&&canvas.width>0&&canvas.height>0;
  })&&artwork.canvases.reduce((total,canvas)=>total+canvas.width*canvas.height,0)===artwork.pixels&&artwork.pixels<=READER_CACHE_LIMITS_V2730.pixels);
}
export function readerCanvasGeometryMatchesV2730(artwork,pageView){
  return !!(validArtwork(artwork)&&pageView?.canvas===artwork.canvas&&pageView.renderingState===3);
}
export function captureReaderCanvasesV2730(candidate,pageView){
  if(!candidate||candidate.artwork||!pageView?.canvas||!pageView.annotationLayer?.div)return;
  const layer=pageView.annotationLayer,map=new Map(),all=[pageView.canvas];
  for(const section of layer.div.querySelectorAll('[data-annotation-id]')){
    const canvases=[...section.children].filter(child=>child.tagName==='CANVAS');if(!canvases.length)continue;
    map.set(section.dataset.annotationId,canvases.length===1?canvases[0]:canvases);all.push(...canvases);
  }
  // A canvas that cannot be indexed back to its annotation makes this document
  // unsuitable for reuse. Keep the ordinary teardown path in that case.
  if(pageView.div.querySelectorAll('canvas').length!==all.length)return;
  const pixels=all.reduce((total,canvas)=>total+canvas.width*canvas.height,0);
  if(!all.every(canvas=>canvas.width>0&&canvas.height>0)||pixels>READER_CACHE_LIMITS_V2730.pixels)return;
  candidate.artwork={canvas:pageView.canvas,annotations:map,canvases:all,dimensions:all.map(canvas=>({width:canvas.width,height:canvas.height})),pixels,layer,div:layer.div};
}
export function canRetainReaderCanvasV2730(candidate,{epoch,document,pageView,controls,viewport}){
  const artwork=candidate?.artwork;
  const sourceReady=candidate?.sourceKind==='document'||candidate?.sourceKind==='draft'&&candidate.pristineIdentity;
  return !!(candidate&&candidate.epoch===epoch&&sourceReady&&candidate.bytes<=READER_CACHE_LIMITS_V2730.bytes&&document?.numPages===1&&
    controls<=READER_CACHE_LIMITS_V2730.controls&&controls>0&&validArtwork(artwork)&&pageView?.canvas===artwork.canvas&&
    pageView.renderingState===3&&pageView.annotationLayer===artwork.layer&&pageView.annotationLayer.div===artwork.div&&sameReaderViewportV2730(candidate.viewport,viewport));
}
export function canReuseReaderCanvasV2730(cached,{key,epoch,viewport,pageView}){
  return !!(cached&&cached.key===key&&cached.epoch===epoch&&sameReaderViewportV2730(cached.viewport,viewport)&&
    cached.document.numPages===1&&validArtwork(cached.artwork)&&pageView?.canvas===cached.artwork.canvas&&pageView.renderingState===3&&pageView.annotationLayer===cached.artwork.layer);
}
export function clearReaderAnnotationStorageV2730(storage){
  for(const [id] of [...storage])storage.remove(id);
  storage.resetModified();storage.resetModifiedIds();storage.onSetModified=null;
}
export async function rebuildReaderAnnotationsV2730({cached,document,pageView,ui,viewer}){
  const old=cached.artwork.layer,div=cached.artwork.div,fields=await document.getFieldObjects();
  const annotationCanvasMap=new Map(cached.artwork.annotations);pageView._annotationCanvasMap=annotationCanvasMap;
  const layer=new ui.AnnotationLayerBuilder({pdfPage:pageView.pdfPage,annotationStorage:document.annotationStorage,imageResourcesPath:old.imageResourcesPath,
    renderForms:old.renderForms,linkService:old.linkService,downloadManager:old.downloadManager,enableComment:old.enableComment,enableScripting:old.enableScripting,
    hasJSActionsPromise:document.hasJSActions(),fieldObjectsPromise:Promise.resolve(fields),annotationCanvasMap,
    accessibilityManager:old._accessibilityManager,annotationEditorUIManager:old._annotationEditorUIManager,
    // Keep PDFPageView's layer-container reference intact, while recreating all
    // widgets and their closures. The pinned builder initializes from this.div
    // after this callback, so no obsolete private page-layer pointer survives.
    onAppend:created=>{div.className=created.className;div.style.cssText='';div.removeAttribute('hidden');div.replaceChildren();layer.div=div;}});
  pageView.annotationLayer=layer;
  await layer.render({viewport:pageView.viewport,intent:'display',structTreeLayer:pageView.structTreeLayer,optionalContentConfigPromise:viewer.optionalContentConfigPromise});
  return layer;
}

// PDFScriptingManager does not recheck its document after awaited creation.
// Keep normal, cache and null teardown jobs in one queue, so an aborted job
// cannot later destroy or dispatch events into the next report's sandbox.
export function serializeReaderScriptingV2730(manager){
  const setDocument=manager.setDocument.bind(manager);let queue=Promise.resolve(),requestedDocument=null,requestedJob=null;
  manager.setDocument=document=>{
    // CDQ starts calculations while the first canvas is rendering. PDFViewer
    // requests the same document again after that paint; share its one sandbox
    // instead of executing Open actions twice or destroying a ready sandbox.
    if(document&&document===requestedDocument&&requestedJob)return requestedJob;
    requestedDocument=document;
    const job=queue.catch(()=>{}).then(()=>setDocument(document));queue=job;requestedJob=job;
    job.catch(()=>{if(requestedJob===job){requestedDocument=null;requestedJob=null;}});
    return job;
  };
}

export function cancellableReaderPaintV2730(paint){
  let disposed=false,cancel;const cancelled=new Promise(resolve=>{cancel=resolve;});
  const abort=()=>{const error=Error('L’ouverture du rapport a été annulée.');error.name='AbortError';return error;};
  return {wait(required){if(disposed)return Promise.reject(abort());return Promise.race([paint.wait(required),cancelled.then(()=>{throw abort();})]);},
    dispose(){if(disposed)return;disposed=true;paint.dispose();cancel();}};
}
