// Isolate native fills for the exact approved Camion artwork. Each boundary
// discards one pixel; it never rewrites, retains or replays any image data.
// Decoration is local to the main canvas and lasts only for its render task.
export const CAMION_CANVAS_BOUNDARY_POLICY_V2755=Object.freeze({
  family:'camion',version:'27.55',pdfjsVersion:'6.3.289',
  sourceSha256:'ff40bd121e4e53ac75dac859a86e803a2d3c34f89c2c306b6b206e330a0e5b5e',sourceBytes:984346,
  artworkAlgorithm:'cdq-static-artwork-graph-sha256-v1',
  artworkFingerprint:'8929ce6b5b81e7a692e2c3d5336b7fb98a5149034eacc5af99fc501db5450639',
  boundary:'before-and-after-native-main-fill',readbackWidth:1,readbackHeight:1
});
const policy=CAMION_CANVAS_BOUNDARY_POLICY_V2755;
const preparedIdentities=new WeakSet(),installedDocuments=new WeakSet(),installedPages=new WeakSet(),activeContexts=new WeakMap();
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const currentEpoch=(preparedEpoch,epoch)=>Number.isInteger(epoch)&&epoch>=0&&preparedEpoch===epoch;
const matchingArtwork=artwork=>artwork?.algorithmVersion===policy.artworkAlgorithm&&
  artwork.fingerprint===policy.artworkFingerprint&&artwork.pageIndex===0&&artwork.pageCount===1;
const require=(ok,message)=>{if(!ok)throw Error('Camion canvas boundary: '+message);};

// Return null synchronously for excluded documents. Only a plausible Camion
// starts asynchronous byte verification; unrelated readers keep their order.
export function prepareCamionCanvasBoundaryV2755({sourceBytes,staticArtwork,preparedEpoch,epoch,pdfjsVersion,checkCurrent=()=>{}}={}){
  checkCurrent();
  if(pdfjsVersion!==policy.pdfjsVersion||!currentEpoch(preparedEpoch,epoch)||!(sourceBytes instanceof Uint8Array)||
    sourceBytes.byteLength<8||sourceBytes.byteLength>32*1024*1024)return null;
  if(sourceBytes[0]!==37||sourceBytes[1]!==80||sourceBytes[2]!==68||sourceBytes[3]!==70||sourceBytes[4]!==45)return null;
  const sourceBytesLength=sourceBytes.byteLength;
  const artwork=matchingArtwork(staticArtwork)?{bytesSha256:staticArtwork.bytesSha256,bytesLength:staticArtwork.bytesLength}:null;
  // Other families, including Précision, do not add a digest to normal opening.
  if(sourceBytesLength!==policy.sourceBytes&&!artwork)return null;
  return (async()=>{
    const sourceSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',sourceBytes)),value=>value.toString(16).padStart(2,'0')).join('');
    checkCurrent();
    const canonical=sourceSha256===policy.sourceSha256&&sourceBytesLength===policy.sourceBytes;
    const filled=artwork&&hash(artwork.bytesSha256)&&artwork.bytesSha256===sourceSha256&&artwork.bytesLength===sourceBytesLength;
    if(!canonical&&!filled)return null;
    const identity=Object.freeze({sourceSha256,sourceBytesLength,epoch,pdfjsVersion});
    preparedIdentities.add(identity);
    return identity;
  })();
}

function replaceOwnMethod(target,name,value){
  const original=Object.getOwnPropertyDescriptor(target,name);
  Object.defineProperty(target,name,{configurable:true,writable:true,enumerable:original?.enumerable??false,value});
  return ()=>{
    // Another owner may have replaced the method while rendering. Do not
    // remove that owner's wrapper; our inactive lease will then be a no-op.
    if(Object.getOwnPropertyDescriptor(target,name)?.value!==value)return;
    if(original)Object.defineProperty(target,name,original);else delete target[name];
  };
}

function attachContext(context,lease){
  require(context&&typeof context.fill==='function'&&typeof context.getImageData==='function'&&context.canvas,'native main context unavailable');
  if(!lease.active||lease.contexts.has(context))return;
  let entry=activeContexts.get(context);
  if(!entry){
    const fill=context.fill,readback=context.getImageData;
    entry={leases:new Set(),restore:null};
    entry.restore=replaceOwnMethod(context,'fill',function(...args){
      // Flush preceding native strokes before this fill as well as the fill
      // itself, so browser paint batching cannot join either boundary.
      if(this===context&&entry.leases.size&&context.canvas.width>0&&context.canvas.height>0)
        Reflect.apply(readback,context,[0,0,policy.readbackWidth,policy.readbackHeight]);
      const result=Reflect.apply(fill,this,args);
      // Method borrowing and all non-owned canvases keep their native behavior.
      if(this===context&&entry.leases.size&&context.canvas.width>0&&context.canvas.height>0)
        Reflect.apply(readback,context,[0,0,policy.readbackWidth,policy.readbackHeight]);
      return result;
    });
    activeContexts.set(context,entry);
  }
  entry.leases.add(lease);lease.contexts.add(context);
  lease.cleanups.push(()=>{
    entry.leases.delete(lease);
    if(!entry.leases.size){activeContexts.delete(context);entry.restore();}
  });
}

function attachCanvas(canvas,lease){
  require(canvas&&typeof canvas.getContext==='function','native main canvas unavailable');
  const getContext=canvas.getContext;
  const restore=replaceOwnMethod(canvas,'getContext',function(...args){
    const context=Reflect.apply(getContext,this,args);
    if(this===canvas&&args[0]==='2d'&&context&&lease.active){
      restore();attachContext(context,lease);
    }
    return context;
  });
  lease.cleanups.push(restore);
}

function installPage(page){
  require(page&&typeof page.render==='function','native page render unavailable');
  if(installedPages.has(page))return page;
  const render=page.render;
  replaceOwnMethod(page,'render',function(...args){
    if(this!==page)return Reflect.apply(render,this,args);
    const options=args[0],lease={active:true,contexts:new Set(),cleanups:[]};
    const finish=()=>{
      if(!lease.active)return;
      lease.active=false;
      for(const cleanup of lease.cleanups.reverse()){
        // A third-party freeze cannot extend this task's active boundary or
        // replace the native render outcome with a cleanup-only exception.
        try{cleanup();}catch{}
      }
    };
    try{
      if(options?.canvasContext)attachContext(options.canvasContext,lease);
      else if(options?.canvas)attachCanvas(options.canvas,lease);
      const task=Reflect.apply(render,this,args);
      // Return PDF.js's actual task, promise, cancellation and onContinue hooks.
      if(typeof task?.promise?.then==='function')task.promise.then(finish,finish);else finish();
      return task;
    }catch(error){finish();throw error;}
  });
  installedPages.add(page);
  return page;
}

export function installCamionCanvasBoundaryV2755(document,identity){
  if(identity==null)return false;
  require(preparedIdentities.has(identity),'identity was not prepared from current PDF bytes');
  require(document?.numPages===1,'a single native page is required');
  require(typeof document.getPage==='function','native getPage unavailable');
  if(installedDocuments.has(document))return true;
  const getPage=document.getPage;
  replaceOwnMethod(document,'getPage',function(...args){
    const result=Reflect.apply(getPage,this,args);
    return this===document?result.then(installPage):result;
  });
  installedDocuments.add(document);
  return true;
}

// Train uses a separate, structural boundary. The Camion path above and all
// unrelated document preparations keep their existing behavior.
export const TRAIN_CALENDAR_BOUNDARY_POLICY_V2755=Object.freeze({
  family:'train',version:'27.55',pdfjsVersion:'6.3.289',
  sourceSha256:'3cdaad61a08a8daee5a321f7b44eae8a97ba94be888662e40ce898397814be26',sourceBytes:999286,
  artworkAlgorithm:'cdq-static-artwork-graph-sha256-v1',
  artworkFingerprint:'c948b549aa160df41fcf7b17d1a9c0ba54a67268772fccbb286e669e31518ab1',
  boundary:'before-and-after-native-calendar-outer-fill',constructPath:91,paintOperation:23,
  fillStyle:'#0e06ad',lineCap:'butt',globalAlpha:1,globalCompositeOperation:'source-over',
  lineWidths:Object.freeze([1,6]),readbackWidth:1,readbackHeight:1,
  // Original Float32 drawing instructions from the approved source Form.
  // These PDF coordinates describe a path; no image/pixel region is selected.
  drawOps:Object.freeze([0,2228.280029296875,5995,1,2428.280029296875,5995,
    2,2444.860107421875,5995,2458.280029296875,6008.419921875,2458.280029296875,6025,
    1,2458.280029296875,6195,2,2458.280029296875,6211.58984375,2444.860107421875,6225,2428.280029296875,6225,
    1,2228.280029296875,6225,2,2211.699951171875,6225,2198.280029296875,6211.58984375,2198.280029296875,6195,
    1,2198.280029296875,6025,2,2198.280029296875,6008.419921875,2211.699951171875,5995,2228.280029296875,5995])
});
const trainPolicy=TRAIN_CALENDAR_BOUNDARY_POLICY_V2755;
const trainPreparedIdentities=new WeakSet(),trainInstalledDocuments=new WeakSet(),trainPageStates=new WeakMap(),trainActiveContexts=new WeakMap();
const requireTrain=(ok,message)=>{if(!ok)throw Error('Train calendar boundary: '+message);};

export function prepareTrainCalendarBoundaryV2755({sourceBytes,staticArtwork,preparedEpoch,epoch,pdfjsVersion,checkCurrent=()=>{}}={}){
  checkCurrent();
  if(pdfjsVersion!==trainPolicy.pdfjsVersion||!currentEpoch(preparedEpoch,epoch)||!(sourceBytes instanceof Uint8Array)||
    sourceBytes.byteLength<8||sourceBytes.byteLength>32*1024*1024)return null;
  if(sourceBytes[0]!==37||sourceBytes[1]!==80||sourceBytes[2]!==68||sourceBytes[3]!==70||sourceBytes[4]!==45)return null;
  const sourceBytesLength=sourceBytes.byteLength;
  const artwork=staticArtwork?.algorithmVersion===trainPolicy.artworkAlgorithm&&staticArtwork.fingerprint===trainPolicy.artworkFingerprint&&
    staticArtwork.pageIndex===0&&staticArtwork.pageCount===1?{bytesSha256:staticArtwork.bytesSha256,bytesLength:staticArtwork.bytesLength}:null;
  if(sourceBytesLength!==trainPolicy.sourceBytes&&!artwork)return null;
  return (async()=>{
    const sourceSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',sourceBytes)),value=>value.toString(16).padStart(2,'0')).join('');
    checkCurrent();
    const canonical=sourceSha256===trainPolicy.sourceSha256&&sourceBytesLength===trainPolicy.sourceBytes;
    const filled=artwork&&hash(artwork.bytesSha256)&&artwork.bytesSha256===sourceSha256&&artwork.bytesLength===sourceBytesLength;
    if(!canonical&&!filled)return null;
    const identity=Object.freeze({family:'train',sourceSha256,sourceBytesLength,epoch,pdfjsVersion});
    trainPreparedIdentities.add(identity);return identity;
  })();
}

function observeTrainCalendarPaths(state,list,fnArray,argsArray,length){
  if(!list||!Array.isArray(fnArray)||!Array.isArray(argsArray))return;
  let records=state.selections.get(list);
  if(!records){records=[];state.selections.set(list,records);}
  for(let i=0;i<length;i++){
    if(fnArray[i]!==trainPolicy.constructPath)continue;
    const args=argsArray[i];if(!Array.isArray(args)||args[0]!==trainPolicy.paintOperation)continue;
    const box=args[1],draw=box?.[0];
    if(!(draw instanceof Float32Array)||draw.length!==trainPolicy.drawOps.length||
      !trainPolicy.drawOps.every((value,j)=>draw[j]===value)||records.some(record=>record.box===box))continue;
    // PDF.js keeps this box by reference, then replaces box[0] with its own
    // Path2D. Keeping the original typed array prevents matching unconverted
    // data. Never reconstruct a path or modify the operator-list arguments.
    records.push({box,draw});
  }
}

function trainFillSelected(context,entry,args){
  if(args[1]!=='evenodd'||context.fillStyle!==trainPolicy.fillStyle||!trainPolicy.lineWidths.includes(context.lineWidth)||
    context.lineCap!==trainPolicy.lineCap||context.globalAlpha!==trainPolicy.globalAlpha||
    context.globalCompositeOperation!==trainPolicy.globalCompositeOperation)return false;
  for(const lease of entry.leases){
    if(!lease.active||!lease.operatorList)continue;
    const records=lease.state.selections.get(lease.operatorList);
    if(records?.some(record=>record.box[0]===args[0]&&record.draw!==args[0]))return true;
  }
  return false;
}

function attachTrainContext(context,lease){
  requireTrain(context&&typeof context.fill==='function'&&typeof context.getImageData==='function'&&context.canvas,'native main context unavailable');
  if(!lease.active||lease.contexts.has(context))return;
  let entry=trainActiveContexts.get(context);
  if(!entry){
    const fill=context.fill,readback=context.getImageData;
    entry={leases:new Set(),restore:null};
    entry.restore=replaceOwnMethod(context,'fill',function(...args){
      if(this===context&&context.canvas.width>0&&context.canvas.height>0&&trainFillSelected(context,entry,args))
        Reflect.apply(readback,context,[0,0,trainPolicy.readbackWidth,trainPolicy.readbackHeight]);
      const result=Reflect.apply(fill,this,args);
      if(this===context&&context.canvas.width>0&&context.canvas.height>0&&trainFillSelected(context,entry,args))
        Reflect.apply(readback,context,[0,0,trainPolicy.readbackWidth,trainPolicy.readbackHeight]);
      return result;
    });
    trainActiveContexts.set(context,entry);
  }
  entry.leases.add(lease);lease.contexts.add(context);
  lease.cleanups.push(()=>{
    entry.leases.delete(lease);
    if(!entry.leases.size){trainActiveContexts.delete(context);entry.restore();}
  });
}

function attachTrainCanvas(canvas,lease){
  requireTrain(canvas&&typeof canvas.getContext==='function','native main canvas unavailable');
  const getContext=canvas.getContext;
  const restore=replaceOwnMethod(canvas,'getContext',function(...args){
    const context=Reflect.apply(getContext,this,args);
    if(this===canvas&&args[0]==='2d'&&context&&lease.active){restore();attachTrainContext(context,lease);}
    return context;
  });
  lease.cleanups.push(restore);
}

function installTrainPage(page){
  requireTrain(page&&typeof page.render==='function'&&typeof page._renderPageChunk==='function','pinned native page methods unavailable');
  if(trainPageStates.has(page))return page;
  const state={selections:new WeakMap()},chunk=page._renderPageChunk,render=page.render;
  replaceOwnMethod(page,'_renderPageChunk',function(...args){
    const [value,intentState]=args;
    if(this===page&&!page.destroyed&&intentState?.operatorList)
      observeTrainCalendarPaths(state,intentState.operatorList,value?.fnArray,value?.argsArray,value?.length||0);
    return Reflect.apply(chunk,this,args);
  });
  replaceOwnMethod(page,'render',function(...args){
    if(this!==page)return Reflect.apply(render,this,args);
    const options=args[0],lease={active:true,state,operatorList:null,contexts:new Set(),cleanups:[]};
    const finish=()=>{
      if(!lease.active)return;
      lease.active=false;lease.operatorList=null;
      for(const cleanup of lease.cleanups.reverse()){try{cleanup();}catch{}}
    };
    try{
      if(options?.canvasContext)attachTrainContext(options.canvasContext,lease);
      else if(options?.canvas)attachTrainCanvas(options.canvas,lease);
      const task=Reflect.apply(render,this,args);
      lease.operatorList=task?._internalRenderTask?.operatorList||null;
      if(lease.operatorList&&!state.selections.has(lease.operatorList))
        observeTrainCalendarPaths(state,lease.operatorList,lease.operatorList.fnArray,lease.operatorList.argsArray,lease.operatorList.fnArray?.length||0);
      // The native task, its cancellation and onContinue scheduling are kept.
      // No recognized list means an inactive boundary, never a bbox guess.
      if(typeof task?.promise?.then==='function')task.promise.then(finish,finish);else finish();
      return task;
    }catch(error){finish();throw error;}
  });
  trainPageStates.set(page,state);return page;
}

export function installTrainCalendarBoundaryV2755(document,identity){
  if(identity==null)return false;
  requireTrain(trainPreparedIdentities.has(identity),'identity was not prepared from current PDF bytes');
  requireTrain(document?.numPages===1,'a single native page is required');
  requireTrain(typeof document.getPage==='function','native getPage unavailable');
  if(trainInstalledDocuments.has(document))return true;
  const getPage=document.getPage;
  replaceOwnMethod(document,'getPage',function(...args){
    const result=Reflect.apply(getPage,this,args);
    return this===document?result.then(installTrainPage):result;
  });
  trainInstalledDocuments.add(document);return true;
}
