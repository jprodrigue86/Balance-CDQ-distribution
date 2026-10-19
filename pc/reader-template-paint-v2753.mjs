import {READER_TEMPLATE_PAINT_MANIFEST_V2753} from './reader-template-paint-manifest-v2753.mjs';

export const READER_TEMPLATE_PAINT_POLICY_V2754=Object.freeze({"schema":2754,"platform":"pc","version":"27.54","kind":"native-first-paint-family","family":"trackscale","sourceSha256":"00cbe6cb741c2e28c7c342d17c695c593f780145e129873c68b442e84881b309","sourceBytes":599102,"staticArtworkFingerprint":"d61d020ef0cbf2c1c508914a4c8901e8524c1e30ae464bda937df448ffb99175","reason":"native-annotation-fidelity"});

const VERSION='6.3.289',ALGORITHM='cdq-static-artwork-graph-sha256-v1',MAX_PIXELS=4000000;
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const safePath=value=>typeof value==='string'&&value.startsWith('assets/reader-template-paint-v2753/')&&/^[a-zA-Z0-9_./-]+$/.test(value)&&!value.split('/').includes('..');
const validWidths=value=>Array.isArray(value)&&value.length>0&&value.length<=2&&Array.from(value).every((width,index)=>Number.isSafeInteger(width)&&width>0&&width<=1536&&(index===0||width>value[index-1]));
const captureWidth=(widths,target)=>widths.find(width=>width+1e-6>=target)??widths.at(-1);
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
async function boundedBytes(response,limit){
  if(!response.body?.getReader){const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==limit)throw Error('Template background length changed');return bytes;}
  const reader=response.body.getReader(),chunks=[];let length=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw Error('Template background exceeds its declared bound');}chunks.push(value);}if(length!==limit)throw Error('Template background length changed');const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;}finally{reader.releaseLock();}
}
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
const matrix=value=>Array.isArray(value)&&value.length===6&&value.every(Number.isFinite);
function determinant(value){const [a,b,c,d]=value,scale=Math.max(Math.abs(a),Math.abs(b),Math.abs(c),Math.abs(d)),det=a*d-b*c;return Number.isFinite(det)&&scale>0&&Math.abs(det)>16*Number.EPSILON*scale*scale?det:null;}
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
function validViewport(viewport,intrinsic){
  if(!viewport||!Number.isFinite(viewport.width)||viewport.width<=0||!Number.isFinite(viewport.height)||viewport.height<=0||!Number.isFinite(viewport.scale)||viewport.scale<=0||viewport.rotation!==intrinsic?.rotation||!matrix(viewport.transform)||determinant(viewport.transform)===null)return false;
  const [a,b,c,d,e,f]=viewport.transform,[x0,y0,x1,y1]=intrinsic.view,points=[[x0,y0],[x0,y1],[x1,y0],[x1,y1]].map(([x,y])=>[a*x+c*y+e,b*x+d*y+f]),xs=points.map(point=>point[0]),ys=points.map(point=>point[1]),offsetX=viewport.offsetX??0,offsetY=viewport.offsetY??0;
  return Number.isFinite(offsetX)&&Number.isFinite(offsetY)&&Math.abs(Math.min(...xs)-offsetX)<1e-6&&Math.abs(Math.min(...ys)-offsetY)<1e-6&&Math.abs(Math.max(...xs)-Math.min(...xs)-viewport.width)<1e-6&&Math.abs(Math.max(...ys)-Math.min(...ys)-viewport.height)<1e-6;
}

function validEntry(entry){
  const image=entry?.background,geometry=entry?.intrinsic;
  return entry?.numPages===1&&entry.pageIndex===0&&entry.requiresNativeAnnotations===true&&entry.captureParams?.annotationMode===2&&entry.captureParams.intent==='display'&&entry.captureParams.canvasAlpha===false&&
    hash(entry.normalized?.sha256)&&hash(entry.rendererFingerprint)&&safePath(image?.path)&&hash(image.sha256)&&Number.isSafeInteger(image.bytes)&&image.bytes>8&&image.bytes<16*1024*1024&&
    Number.isSafeInteger(image.width)&&image.width>0&&Number.isSafeInteger(image.height)&&image.height>0&&image.pixels===image.width*image.height&&image.pixels<=MAX_PIXELS&&
    Array.isArray(geometry?.view)&&geometry.view.length===4&&geometry.view.every(Number.isFinite)&&Number.isFinite(geometry.userUnit)&&geometry.userUnit>0&&[0,90,180,270].includes(geometry.rotation)&&
    validViewport(entry.viewport,geometry)&&Math.ceil(entry.viewport.width)===image.width&&Math.ceil(entry.viewport.height)===image.height;
}

const captureKeys=['viewport','separateAnnots','background','discardedAnnotationCanvases','discardedAnnotationPixels'];
function validCapture(capture){return !!capture&&typeof capture==='object'&&!Array.isArray(capture)&&Object.keys(capture).length===captureKeys.length&&captureKeys.every(key=>Object.hasOwn(capture,key));}
function resolveCapture(family,capture){
  const {captures,...common}=family;
  return Object.freeze({...common,viewport:capture.viewport,separateAnnots:capture.separateAnnots,background:capture.background,
    discardedAnnotationCanvases:capture.discardedAnnotationCanvases,discardedAnnotationPixels:capture.discardedAnnotationPixels});
}

// PDFPageView rounds its backing canvas independently of its PDF viewport.
// Preserve the native PDF-to-pixel transform rather than stretching the PNG's
// ceil-rounded white padding to those separately rounded canvas dimensions.
export function readerTemplatePaintTransformV2753(entry,{canvas,viewport,transform}={}){
  if(!validEntry(entry)||!Number.isSafeInteger(canvas?.width)||canvas.width<1||!Number.isSafeInteger(canvas?.height)||canvas.height<1||!validViewport(viewport,entry.intrinsic))return null;
  const output=transform==null?[1,0,0,1,0,0]:transform;if(!matrix(output)||determinant(output)===null)return null;
  const [a,b,c,d,e,f]=entry.viewport.transform,det=determinant(entry.viewport.transform),inverse=[d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det],result=multiply(multiply(output,viewport.transform),inverse);
  return matrix(result)&&determinant(result)!==null?result:null;
}

// Resolve exactly one source-bound family before choosing its native capture.
// Two resolutions of the same source must never create an ambiguous identity.
export function selectReaderTemplatePaintV2753(manifest,{sourceSha256,sourceBytesLength,staticArtwork,preparedEpoch,epoch,targetPhysicalWidth}={}){
  if(manifest?.schema!==2||manifest.kind!=='cdq-pristine-template-background'||manifest.version!==2753||!validWidths(manifest.widths)||manifest.renderer?.version!==VERSION||!hash(manifest.renderer.fingerprint)||!hash(sourceSha256)||!Number.isSafeInteger(sourceBytesLength)||sourceBytesLength<8||sourceBytesLength>32*1024*1024||!Number.isFinite(targetPhysicalWidth)||targetPhysicalWidth<=0)return null;
  const entries=Object.values(manifest.templates||{}).filter(entry=>entry?.rendererFingerprint===manifest.renderer.fingerprint&&hash(entry.normalized?.sha256)&&Number.isSafeInteger(entry.normalized.bytes)&&entry.normalized.bytes>=8&&entry.normalized.bytes<=32*1024*1024&&Array.isArray(entry.captures)&&entry.captures.length===manifest.widths.length&&manifest.widths.every((width,index)=>{const capture=entry.captures[index];return validCapture(capture)&&capture.viewport?.width===width&&validEntry(resolveCapture(entry,capture));}));
  const choose=family=>{
    // Resolve the unique source/graph first, then keep this exact PC family
    // on the complete native renderer before any PNG fetch, cache or decode.
    const native=READER_TEMPLATE_PAINT_POLICY_V2754,artwork=family.staticArtworkV2753;
    if(family.normalized.sha256===native.sourceSha256&&family.normalized.bytes===native.sourceBytes&&artwork?.algorithmVersion===ALGORITHM&&artwork.fingerprint===native.staticArtworkFingerprint&&artwork.pageIndex===0&&artwork.pageCount===1)return null;
    return resolveCapture(family,family.captures.find(capture=>capture.viewport.width===captureWidth(manifest.widths,targetPhysicalWidth)));
  };
  const exact=entries.filter(entry=>entry.normalized.sha256===sourceSha256&&entry.normalized.bytes===sourceBytesLength);
  if(exact.length===1)return choose(exact[0]);
  if(exact.length>1||!Number.isSafeInteger(sourceBytesLength)||sourceBytesLength<8||sourceBytesLength>32*1024*1024||!Number.isInteger(epoch)||preparedEpoch!==epoch||staticArtwork?.algorithmVersion!==ALGORITHM||!hash(staticArtwork.fingerprint)||staticArtwork.pageIndex!==0||staticArtwork.pageCount!==1||staticArtwork.bytesSha256!==sourceSha256||staticArtwork.bytesLength!==sourceBytesLength)return null;
  const matches=entries.filter(entry=>entry.staticArtworkV2753?.algorithmVersion===ALGORITHM&&entry.staticArtworkV2753.fingerprint===staticArtwork.fingerprint&&entry.staticArtworkV2753.pageIndex===0&&entry.staticArtworkV2753.pageCount===1);
  return matches.length===1?choose(matches[0]):null;
}

export function createReaderTemplatePaintV2753({manifest=READER_TEMPLATE_PAINT_MANIFEST_V2753,fetcher=(...args)=>fetch(...args),createImage=()=>new Image(),createURL=blob=>URL.createObjectURL(blob),revokeURL=url=>URL.revokeObjectURL(url),sha256=digest}={}){
  manifest=freeze(manifest==null?null:structuredClone(manifest));
  // One immutable blank image per reader. No page, field, AP, identity or client
  // bitmap enters this cache. A different template releases its predecessor.
  let cached=null,pending=null,sequence=0;
  const release=value=>{if(value?.image)value.image.src='';};
  const stopPending=()=>{pending?.controller.abort();release(pending);};
  const clear=()=>{sequence++;release(cached?.value);cached=null;stopPending();pending=null;};
  async function load(entry,token,controller){
    const current=()=>{if(token!==sequence||controller.signal.aborted)throw Error('Template background was superseded');};
    current();const response=await fetcher(new URL(entry.background.path,import.meta.url),{cache:'force-cache',credentials:'same-origin',signal:controller.signal});current();
    if(!response.ok)throw Error('Template background is unavailable');
    const bytes=await boundedBytes(response,entry.background.bytes);current();
    if(bytes.length!==entry.background.bytes||await sha256(bytes)!==entry.background.sha256)throw Error('Template background integrity changed');current();
    const image=createImage();if(pending?.token===token)pending.image=image;const url=createURL(new Blob([bytes],{type:'image/png'}));
    try{image.src=url;await image.decode();current();if(image.naturalWidth!==entry.background.width||image.naturalHeight!==entry.background.height)throw Error('Template background geometry changed');return Object.freeze({entry,image,captureWidths:Object.freeze([...manifest.widths])});}
    catch(error){release({image});throw error;}
    finally{revokeURL(url);}
  }
  async function prepare(options){
    const check=options?.checkCurrent||(()=>{});check();
    const entry=selectReaderTemplatePaintV2753(manifest,options);if(!entry)return null;
    const key=entry.background.path+':'+entry.background.sha256;
    try{
      if(cached?.key===key){check();return cached.value;}
      if(pending?.key!==key){
        const token=++sequence;release(cached?.value);cached=null;stopPending();
        const controller=new AbortController();let timer;
        const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();if(pending?.token===token)release(pending);reject(Error('Template background took too long'));},750);});
        const promise=Promise.race([load(entry,token,controller),timeout]).then(value=>{if(token!==sequence){release(value);return null;}cached={key,value};return value;});
        pending={key,promise,token,controller};promise.finally(()=>clearTimeout(timer)).catch(()=>{});promise.finally(()=>{if(pending?.promise===promise)pending=null;}).catch(()=>{});
      }
      const value=await pending.promise;check();return value;
    }catch(error){check();return null;} // A damaged optional derivative falls back to the native PDF.
  }
  return {prepare,clear,available:()=>manifest?.schema===2&&manifest.version===2753&&validWidths(manifest.widths)};
}
const templatePaint=createReaderTemplatePaintV2753();
export const readerTemplatePaintAvailableV2753=()=>templatePaint.available();
export const prepareReaderTemplatePaintV2753=options=>templatePaint.prepare(options);
export const clearReaderTemplatePaintV2753=()=>templatePaint.clear();

export function installReaderTemplatePaintV2753({page,pageView,prepared,checkCurrent,onHit=()=>{},RenderingCancelledException=Error,pdfjsVersion}={}){
  const entry=prepared?.entry,image=prepared?.image,captureWidths=prepared?.captureWidths;
  if(pdfjsVersion!==VERSION||!validEntry(entry)||!image||!validWidths(captureWidths)||!captureWidths.includes(entry.viewport.width)||page?.pageNumber!==1||pageView?.pdfPage!==page||typeof page.render!=='function'||page.userUnit!==entry.intrinsic.userUnit||page.rotate!==entry.intrinsic.rotation||!Array.isArray(page.view)||page.view.length!==4||!page.view.every((value,index)=>Math.abs(value-entry.intrinsic.view[index])<1e-6))return ()=>{};
  const original=page.render;let installed=true;
  const restore=()=>{installed=false;if(page.render===wrapped)page.render=original;};
  function wrapped(params){
    restore();if(this!==page)return original.call(this,params);
    checkCurrent();
    const canvas=params?.canvas||params?.canvasContext?.canvas,viewport=params?.viewport;
    if((params.intent&&params.intent!=='display')||params.annotationMode!==2||!params.annotationCanvasMap||params.pageColors||params.background||params.isEditing||params.recordOperations||params.recordImages||params.operationsFilter||!canvas||canvas.width<1||canvas.height<1||viewport?.rotation!==entry.intrinsic.rotation)return original.call(this,params);
    // Only static page content is omitted. PDF.js evaluates all real source
    // annotations at the current scale and owns the entire native task/layers.
    const placement=readerTemplatePaintTransformV2753(entry,{canvas,viewport,transform:params.transform});if(!placement)return original.call(this,params);
    // Preparation uses the container's physical fit width. A resize, changed
    // DPR or PDF.js output-scale cap can cross a resolution boundary before
    // the first render. Never replay a capture chosen for another size band.
    const physicalWidth=Math.abs(placement[0])*entry.viewport.width+Math.abs(placement[2])*entry.viewport.height;
    if(!Number.isFinite(physicalWidth)||physicalWidth<=0||captureWidth(captureWidths,physicalWidth)!==entry.viewport.width)return original.call(this,params);
    const width=canvas.width,height=canvas.height;let task;
    try{task=original.call(this,{...params,cdqAnnotationOnlyV2753:true});}catch(error){checkCurrent();return original.call(this,params);}
    let forwarded,active=task;
    const promise=task.promise.then(()=>{
      try{
        checkCurrent();
        if(pageView.pdfPage!==page||pageView.renderTask!==forwarded||pageView.viewport!==viewport||canvas.width!==width||canvas.height!==height||pageView.viewport?.rotation!==viewport.rotation||Math.abs(pageView.viewport?.scale-viewport.scale)>1e-7)throw new RenderingCancelledException('The template rendering viewport changed');
        // The native task has already filled the canvas white. Keep that
        // padding while placing the opaque capture in its actual PDF frame.
        const context=canvas.getContext('2d');context.save();try{context.setTransform(...placement);context.drawImage(image,0,0);}finally{context.restore();}onHit({entry,width,height});
      }catch(error){const cancelled=error instanceof RenderingCancelledException?error:new RenderingCancelledException(error.message);task.onError?.(cancelled);throw cancelled;}
    },error=>{
      // An optional fast path must never make a readable report fail. Native
      // cancellation/ownership changes remain cancellations; other errors retry
      // the full renderer before any annotation layer or input is exposed.
      if(error instanceof RenderingCancelledException)throw error;checkCurrent();
      if(canvas.width!==width||canvas.height!==height)throw error;
      for(const value of params.annotationCanvasMap.values())for(const appearance of Array.isArray(value)?value:[value])appearance.width=appearance.height=0;
      params.annotationCanvasMap.clear();
      const retry=original.call(page,params);retry.onContinue=active.onContinue;retry.onError=active.onError;active=retry;return retry.promise;
    });
    forwarded=new Proxy(task,{get(target,name){if(name==='promise')return promise;const value=Reflect.get(active,name,active);return typeof value==='function'?value.bind(active):value;},set(target,name,value){return Reflect.set(active,name,value,active);}});
    return forwarded;
  }
  page.render=wrapped;return ()=>{if(installed)restore();};
}
