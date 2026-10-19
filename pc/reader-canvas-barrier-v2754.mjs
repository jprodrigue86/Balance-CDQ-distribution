// PC-only native Canvas boundary for the exact approved Trackscale document.
// A readback completes each native fill before later drawing operations. No
// pixel is changed, retained or replayed, and no Canvas prototype is modified.
export const PC_READER_CANVAS_BARRIER_POLICY_V2754=Object.freeze({
  platform:'pc',version:'27.54',pdfjsVersion:'6.3.289',
  sourceSha256:'00cbe6cb741c2e28c7c342d17c695c593f780145e129873c68b442e84881b309',sourceBytes:599102,
  artworkAlgorithm:'cdq-static-artwork-graph-sha256-v1',
  artworkFingerprint:'d61d020ef0cbf2c1c508914a4c8901e8524c1e30ae464bda937df448ffb99175'
});
const preparedIdentities=new WeakSet(),installedFactories=new WeakSet(),installedContexts=new WeakSet();
const policy=PC_READER_CANVAS_BARRIER_POLICY_V2754;
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const currentEpoch=(preparedEpoch,epoch)=>Number.isInteger(epoch)&&epoch>=0&&preparedEpoch===epoch;
const matchingArtwork=artwork=>artwork?.algorithmVersion===policy.artworkAlgorithm&&
  artwork.fingerprint===policy.artworkFingerprint&&artwork.pageIndex===0&&artwork.pageCount===1;
const require=(ok,message)=>{if(!ok)throw Error('PC Trackscale canvas barrier: '+message);};

export async function preparePcReaderCanvasBarrierV2754({sourceBytes,staticArtwork,preparedEpoch,epoch,pdfjsVersion,checkCurrent=()=>{}}={}){
  checkCurrent();
  if(pdfjsVersion!==policy.pdfjsVersion||!currentEpoch(preparedEpoch,epoch)||!(sourceBytes instanceof Uint8Array)||
    sourceBytes.byteLength<8||sourceBytes.byteLength>32*1024*1024)return null;
  if(sourceBytes[0]!==37||sourceBytes[1]!==80||sourceBytes[2]!==68||sourceBytes[3]!==70||sourceBytes[4]!==45)return null;
  const sourceBytesLength=sourceBytes.byteLength;
  const artwork=matchingArtwork(staticArtwork)?{bytesSha256:staticArtwork.bytesSha256,bytesLength:staticArtwork.bytesLength}:null;
  // Other families do not add a digest to their normal opening work.
  if(sourceBytesLength!==policy.sourceBytes&&!artwork)return null;
  const sourceSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',sourceBytes)),value=>value.toString(16).padStart(2,'0')).join('');
  checkCurrent();
  const canonical=sourceSha256===policy.sourceSha256&&sourceBytesLength===policy.sourceBytes;
  const filled=artwork&&hash(artwork.bytesSha256)&&
    artwork.bytesSha256===sourceSha256&&artwork.bytesLength===sourceBytesLength;
  if(!canonical&&!filled)return null;
  const identity=Object.freeze({sourceSha256,sourceBytesLength,epoch,pdfjsVersion});
  preparedIdentities.add(identity);
  return identity;
}

function installContext(context){
  require(context&&typeof context.fill==='function'&&typeof context.getImageData==='function'&&context.canvas,'native context unavailable');
  if(installedContexts.has(context))return;
  const fill=context.fill,readback=context.getImageData;
  Object.defineProperty(context,'fill',{configurable:true,writable:true,value:function(...args){
    const result=Reflect.apply(fill,this,args);
    // Preserve ordinary method borrowing; this instance alone owns the barrier.
    if(this===context){
      const {width,height}=this.canvas;
      if(width>0&&height>0)Reflect.apply(readback,this,[0,0,width,height]);
    }
    return result;
  }});
  installedContexts.add(context);
}

export function installPcReaderCanvasBarrierV2754(document,identity){
  if(identity==null)return false;
  require(preparedIdentities.has(identity),'identity was not prepared from current PDF bytes');
  require(document?.numPages===1,'a single native page is required');
  const factory=document.canvasFactory;
  require(factory&&typeof factory.create==='function','native canvas factory unavailable');
  if(installedFactories.has(factory))return true;
  const create=factory.create;
  Object.defineProperty(factory,'create',{configurable:true,writable:true,value:function(...args){
    const entry=Reflect.apply(create,this,args);
    if(this===factory)installContext(entry?.context);
    return entry;
  }});
  // PDF.js retains its own reset/destroy methods and every context attribute.
  installedFactories.add(factory);
  return true;
}
