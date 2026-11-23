// Le JPEG d’archive et sa dérivée OCR restent distincts.
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_PIXELS = 60 * 1000 * 1000;

function dimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    throw Error('La photo est vide ou endommagée.');
  if (width * height > MAX_PIXELS)
    throw Error('La photo dépasse 60 mégapixels. Exportez une copie plus petite.');
}

async function specialFormat(file) {
  const bytes = new Uint8Array(await file.slice(0, 128).arrayBuffer());
  const text = String.fromCharCode(...bytes);
  if (text.slice(4, 8) === 'ftyp' && /heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1/.test(text.slice(8))) return 'heif';
  if ((bytes[0] === 73 && bytes[1] === 73 && bytes[2] === 42 && bytes[3] === 0) ||
      (bytes[0] === 77 && bytes[1] === 77 && bytes[2] === 0 && bytes[3] === 42)) return 'tiff';
  if (/\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)) return 'heif';
  if (/\.tiff?$/i.test(file.name) || /image\/tiff/i.test(file.type)) return 'tiff';
  return '';
}

function nativePhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(Error('Décodage natif indisponible.')); };
    image.src = url;
  });
}

function decodedPhoto(buffer, format) {
  return new Promise((resolve, reject) => {
    // A dedicated worker keeps conversion responsive and releases decoder memory.
    const worker = new Worker(new URL('./vendor/invoice-photo-worker-v2659.js', import.meta.url));
    const stop = () => { clearTimeout(timer); worker.terminate(); };
    const timer = setTimeout(() => { stop(); reject(Error('La conversion de cette photo prend trop de temps. Réessayez avec une copie plus petite.')); }, 90000);
    worker.onerror = () => { stop(); reject(Error('La conversion de la photo est indisponible. Fermez et rouvrez l’application, puis réessayez.')); };
    worker.onmessage = ({data}) => {
      stop();
      if (data.error) reject(Error(data.error));
      else resolve(data);
    };
    worker.postMessage({buffer, format}, [buffer]);
  });
}

function jpeg(source, width, height, orientation = 1) {
  dimensions(width, height);
  const swapped = orientation >= 5 && orientation <= 8;
  const sw = swapped ? height : width, sh = swapped ? width : height;
  const maxW = 2400, maxH = 8000, minReceiptW = 1000;
  let k = Math.min(1, maxW / sw, maxH / sh);
  if (sw < minReceiptW && sh > sw * 1.6) k = Math.min(maxW / sw, maxH / sh, minReceiptW / sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * k));
  canvas.height = Math.max(1, Math.round(sh * k));
  const ctx = canvas.getContext('2d', {alpha: false});
  if (!ctx) throw Error('Préparation de la photo impossible.');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const transforms = {
    1: [1,0,0,1,0,0], 2: [-1,0,0,1,width,0], 3: [-1,0,0,-1,width,height],
    4: [1,0,0,-1,0,height], 5: [0,1,1,0,0,0], 6: [0,1,-1,0,height,0],
    7: [0,-1,-1,0,height,width], 8: [0,-1,1,0,0,width]
  };
  const sx = canvas.width / sw, sy = canvas.height / sh;
  const [a,b,c,d,e,f] = transforms[orientation] || transforms[1];
  ctx.setTransform(a*sx,b*sy,c*sx,d*sy,e*sx,f*sy);
  ctx.drawImage(source, 0, 0, width, height);
  let result = canvas.toDataURL('image/jpeg', .96);
  if(result.length>11*1024*1024)result=canvas.toDataURL('image/jpeg', .90);
  if(result.length>11*1024*1024)throw Error('Photo trop volumineuse : recadrez le reçu avant de réessayer.');
  canvas.width = canvas.height = 1;
  if (!result.startsWith('data:image/jpeg;base64,')) throw Error('Préparation de la photo impossible.');
  return result;
}

export async function prepareInvoicePhoto(file) {
  if (!file || !file.size) throw Error('La photo est vide. Choisissez une autre photo.');
  if (file.size > MAX_BYTES) throw Error('La photo dépasse 64 Mo. Exportez une copie plus petite.');
  let image;
  try { image = await nativePhoto(file); } catch (_) {}
  if (image) return jpeg(image, image.naturalWidth, image.naturalHeight);
  const format = await specialFormat(file);
  if (!format) throw Error('Cette photo est endommagée ou son format n’est pas lisible. Choisissez une autre photo ou exportez-la en JPEG ou PNG.');
  const result = await decodedPhoto(await file.arrayBuffer(), format);
  dimensions(result.width, result.height);
  const canvas = document.createElement('canvas');
  try {
    canvas.width = result.width; canvas.height = result.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(new Uint8ClampedArray(result.pixels), result.width, result.height), 0, 0);
    return jpeg(canvas, result.width, result.height, result.orientation);
  } finally { canvas.width = canvas.height = 1; }
}

function ocrCanvas(w,h) {
  const c=document.createElement('canvas'); c.width=w; c.height=h; return c;
}
function ocrLuma(d,i) { return (77*d[i]+150*d[i+1]+29*d[i+2]+128)>>8; }
function quantile(hist,n,f) {
  let target=Math.max(1,Math.ceil(n*f));
  for(let v=0;v<256;v++) if((target-=hist[v])<=0)return v;
  return 255;
}

// Coordonnées demi-ouvertes dans la sonde. Une majorité locale relie le papier
// à travers les traits imprimés, sans appliquer ce filtre à l’image envoyée.
function paperBox(y,w,h,hist) {
  const full=[0,0,w,h], n=w*h;
  const dark=quantile(hist,n,.07), light=quantile(hist,n,.94);
  if(w<12||h<12||dark>115||light<148||light-dark<65)return full;
  const cut=dark+.55*(light-dark), stride=w+1, sum=new Uint32Array(stride*(h+1));
  for(let j=0;j<h;j++){
    let count=0; for(let i=0;i<w;i++){
      count+=y[j*w+i]>=cut?1:0;
      sum[(j+1)*stride+i+1]=sum[j*stride+i+1]+count;
    }
  }
  const mask=new Uint8Array(n), queue=new Int32Array(n), boxes=[];
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const a=Math.max(0,i-2), b=Math.min(w,i+3), c=Math.max(0,j-2), d=Math.min(h,j+3);
    const votes=sum[d*stride+b]-sum[c*stride+b]-sum[d*stride+a]+sum[c*stride+a];
    mask[j*w+i]=votes>=.52*(b-a)*(d-c)?1:0;
  }
  for(let p=0;p<n;p++){
    if(!mask[p])continue;
    let head=0, tail=1, x0=w,x1=0,y0=h,y1=0; queue[0]=p;mask[p]=0;
    while(head<tail){
      const k=queue[head++], x=k%w, j=Math.floor(k/w);
      x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,j);y1=Math.max(y1,j+1);
      for(let yy=Math.max(0,j-1);yy<=Math.min(h-1,j+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){
        const q=yy*w+xx;if(mask[q]){mask[q]=0;queue[tail++]=q;}
      }
    }
    if(tail>=4)boxes.push({x0,x1,y0,y1,area:tail});
  }
  boxes.sort((a,b)=>b.area-a.area);
  const main=boxes[0];if(!main)return full;
  let {x0,x1,y0,y1}=main;
  const bw=x1-x0,bh=y1-y0;
  if(main.area<n*.055||bw<8||bh<h*.27||main.area<.68*bw*bh)return full;
  for(const b of boxes.slice(1)){
    // Deux panneaux plausibles : ne choisir ni l’un ni l’autre. Conserver aussi
    // toute bande alignée pouvant appartenir à une tête, un pied ou une colonne.
    if(b.area>main.area*.22)return full;
    const ox=Math.min(main.x1,b.x1)-Math.max(main.x0,b.x0), oy=Math.min(main.y1,b.y1)-Math.max(main.y0,b.y0);
    if(ox>0 && (b.x1-b.x0>bw*.20 || Math.max(b.y0-y1,y0-b.y1)<5)){
      y0=Math.min(y0,b.y0);y1=Math.max(y1,b.y1);x0=Math.min(x0,b.x0);x1=Math.max(x1,b.x1);
    }else if(oy>0 && (b.y1-b.y0>bh*.16 || Math.max(b.x0-x1,x0-b.x1)<5)){
      x0=Math.min(x0,b.x0);x1=Math.max(x1,b.x1);y0=Math.min(y0,b.y0);y1=Math.max(y1,b.y1);
    }
  }
  const dx=Math.max(3,Math.ceil(bw*.045)),dy=Math.max(3,Math.ceil(bh*.035));
  x0=Math.max(0,x0-dx);x1=Math.min(w,x1+dx);y0=Math.max(0,y0-dy);y1=Math.min(h,y1+dy);
  // Une transition dans l’ombre du papier n’est pas un bord de ticket.
  function darkBorder(x,j,length,step){let ok=0;for(let i=0,k=j*w+x;i<length;i++,k+=step)if(y[k]<dark+.32*(light-dark))ok++;return ok>=.83*length;}
  if(x0&&!darkBorder(x0,y0,y1-y0,w)||x1<w&&!darkBorder(x1-1,y0,y1-y0,w)||y0&&!darkBorder(x0,y0,x1-x0,1)||y1<h&&!darkBorder(x0,y1-1,x1-x0,1))return full;
  return (x1-x0)*(y1-y0)<n*.91?[x0,y0,x1,y1]:full;
}

// API locale de test : accepte notamment un canvas peint par le test. crop est
// en pixels source ; canvas=null signifie « utiliser les pixels d’origine ».
// L’appelant possède le canvas produit et peut en lire les pixels sans OCR.
export function prepareInvoiceOcrCanvasV2929(source) {
  const W=source.naturalWidth||source.width,H=source.naturalHeight||source.height;
  dimensions(W,H);
  const s=Math.min(1,224/Math.max(W,H)), w=Math.max(1,Math.round(W*s)),h=Math.max(1,Math.round(H*s));
  const probe=ocrCanvas(w,h);let out=null;
  try{
    const ctx=probe.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;ctx.drawImage(source,0,0,w,h);
    const d=ctx.getImageData(0,0,w,h).data, y=new Uint8Array(w*h), hist=new Uint32Array(256);
    for(let p=0;p<y.length;p++){y[p]=ocrLuma(d,4*p);hist[y[p]]++;}
    const [a,b,c,e]=paperBox(y,w,h,hist);
    const left=Math.floor(a*W/w),top=Math.floor(b*H/h),cw=Math.ceil(c*W/w)-left,ch=Math.ceil(e*H/h)-top;
    const crop={left,top,width:cw,height:ch}, cropped=cw<W||ch<H;
    hist.fill(0);let count=0,colored=0;
    // Mesurer le papier, non la petite marge de sécurité autour de lui.
    const mx=Math.floor((c-a)*.08),my=Math.floor((e-b)*.06);
    for(let j=b+my;j<e-my;j++)for(let i=a+mx;i<c-mx;i++){
      const p=j*w+i,k=4*p;count++;hist[y[p]]++;
      if(Math.max(d[k],d[k+1],d[k+2])-Math.min(d[k],d[k+1],d[k+2])>42)colored++;
    }
    const range=quantile(hist,count,.96)-quantile(hist,count,.015);
    const tone=range>=7&&range<154&&quantile(hist,count,.65)>124&&colored<count*.23;
    if(!tone&&!cropped)return {canvas:null,crop};
    const grow=ch>cw*1.25 && cw<460 ? Math.min(1.25,460/cw) : 1;
    const scale=Math.min(grow,2400/cw,7000/ch,Math.sqrt(4000000/(cw*ch)));
    const ow=Math.max(1,Math.floor(cw*scale)),oh=Math.max(1,Math.floor(ch*scale));
    out=ocrCanvas(ow,oh);const g=out.getContext('2d',{alpha:false});
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(source,left,top,cw,ch,0,0,ow,oh);
    if(tone||cropped){
      // Fond local interpolé entre moyennes de tuiles. Ni seuillage, ni
      // accentuation de contours ; la correction reste bornée dans les ombres/blancs.
      const tile=16,nx=Math.ceil((c-a)/tile),ny=Math.ceil((e-b)/tile),means=new Float32Array(nx*ny),counts=new Uint16Array(nx*ny);
      for(let j=b;j<e;j++)for(let i=a;i<c;i++){
        const k=Math.floor((j-b)/tile)*nx+Math.floor((i-a)/tile);means[k]+=y[j*w+i];counts[k]++;
      }
      for(let k=0;k<means.length;k++)means[k]/=counts[k];
      for(let j=0;j<oh;j+=96){
        const band=g.getImageData(0,j,ow,Math.min(96,oh-j)),px=band.data;
        for(let r=0,k=0;r<band.height;r++){
          const fy=Math.max(0,Math.min(ny-1,(j+r+.5)*(e-b)/(oh*tile)-.5)),iy=Math.floor(fy),dy=fy-iy;
          for(let x=0;x<ow;x++,k+=4){
            const fx=Math.max(0,Math.min(nx-1,(x+.5)*(c-a)/(ow*tile)-.5)),ix=Math.floor(fx),dx=fx-ix;
            const p=iy*nx+ix,q=Math.min(iy+1,ny-1)*nx+ix,step=ix+1<nx?1:0;
            const bg=(means[p]*(1-dx)+means[p+step]*dx)*(1-dy)+(means[q]*(1-dx)+means[q+step]*dx)*dy;
            const v=ocrLuma(px,k),delta=tone ? .42*(v-bg)+Math.max(0,Math.min(12,(222-bg)*.18)) : 0;
            px[k]=px[k+1]=px[k+2]=v+Math.max(-Math.min(25,v*.35),Math.min(delta,(255-v)*.4,20));
          }
        }
        g.putImageData(band,0,j);
      }
    }
    return {canvas:out,crop};
  }catch(err){if(out)out.width=out.height=1;throw err;}finally{probe.width=probe.height=1;}
}

// Encodage et repli bornés suivant le transport.
// The JPEG stored with the invoice remains the original prepared photo.
export async function prepareInvoiceOcrPhotoV2801(dataUrl,native=false) {
  if(!/^data:image\/jpeg;base64,/.test(dataUrl))throw Error('Photo de reçu invalide.');
  const fits=v=>/^data:image\/jpeg;base64,/.test(v)&&(native?v.length<=11*1024*1024:v.length-23<=8*1024*1024);
  let copy=null;
  try{
    const image=new Image();
    await new Promise((ok,no)=>{image.onload=ok;image.onerror=no;image.src=dataUrl;});
    copy=prepareInvoiceOcrCanvasV2929(image).canvas;
    if(copy)for(const quality of [.95,.86,.74]){const v=copy.toDataURL('image/jpeg',quality);if(fits(v))return v;}
  }catch(_){/* La dérivée est facultative, pas le contrôle de taille. */}
  finally{if(copy)copy.width=copy.height=1;}
  return fits(dataUrl)?dataUrl:boundedOriginalOcrPhoto(dataUrl);
}
// Read a damaged calendar date from its own pixels. The main receipt image stays untouched.
function damagedDateBox(layout){
  if(!layout || !Array.isArray(layout.lines) || !layout.width || !layout.height)return null;
  const dateLike=/^\s*(?:date(?:\s+(?:de\s+)?(?:transaction|facture|achat))?\s*[:.]?\s*)?([2z][0-9oilzgb]{3}[-/.][0-9oilzgb]{1,2}[-/.][0-9oilzgb]{1,2})(?=\s|$|[0-9]{2}:)/i;
  const compact=s=>String(s||'').replace(/(?<=[0-9oilzgb])\s*([-/.])\s*(?=[0-9oilzgb])/gi,'$1').replace(/(?<=\b[2z])\s+(?=[0-9oilzgb]{3}[-/.])/gi,'');
  const plausible=[];
  for(const line of layout.lines){
    const match=compact(line.text).match(dateLike);if(!match)continue;
    const height=line.bottom-line.top,width=line.right-line.left;
    if(height<=0||width<2*height||line.top>layout.height*.58)continue;
    const near=layout.lines.filter(other=>other!==line&&Math.abs((other.top+other.bottom-line.top-line.bottom)/2)<1.1*height);
    if(/imprim|livraison|arrival|departure|expir|echeance|check[ -]?(in|out)|num.ro|#|\bref\b/i.test([line.text,...near.map(x=>x.text)].join(' ')))continue;
    if(!/date/i.test(line.text)&&!near.concat(line).some(v=>/\d{1,2}\s*[:h]\s*\d{2}/i.test(v.text)))continue;
    plausible.push({line,token:match[1]});
  }
  return plausible.length===1?plausible[0]:null;
}
export async function recoverInvoiceDate(photo,layout){
  const target=damagedDateBox(layout);
  if(!target||typeof Worker!=='function')return '';
  const im=new Image();im.src=photo;await im.decode();
  const b=target.line,sx=im.naturalWidth/layout.width,sy=im.naturalHeight/layout.height;
  const images=[];
  for(const [k,margin] of [[2.5,.24],[3.3,.40],[4,.30],[4.5,.48]]){
    const dx=Math.max(3,(b.bottom-b.top)*margin),dy=Math.max(3,(b.bottom-b.top)*margin);
    const x=Math.max(0,Math.floor((b.left-dx)*sx)),y=Math.max(0,Math.floor((b.top-dy)*sy));
    const w=Math.min(im.naturalWidth-x,Math.ceil((b.right+dx)*sx)-x),h=Math.min(im.naturalHeight-y,Math.ceil((b.bottom+dy)*sy)-y);
    if(w<10||h<6)return '';
    const scale=Math.min(k,1200/w,170/h),c=ocrCanvas(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));
    try{
      const ctx=c.getContext('2d',{alpha:false});ctx.imageSmoothingQuality='high';ctx.drawImage(im,x,y,w,h,0,0,c.width,c.height);
      const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)return '';
      images.push(await blob.arrayBuffer());
    }finally{c.width=c.height=1;}
  }
  const lines=await new Promise(resolve=>{
    const worker=new Worker(new URL('./vendor/invoice-date-reader-v2930.js',import.meta.url));
    let done=false;
    const end=v=>{if(done)return;done=true;clearTimeout(timer);worker.terminate();resolve(v);};
    const timer=setTimeout(()=>end([]),9500);worker.onerror=()=>end([]);worker.onmessage=e=>end(e.data);worker.postMessage(images,images);
  });
  if(!Array.isArray(lines)||lines.length!==images.length)return '';
  function printed(row){
    if(row.confidence<60)return '';
    const hit=String(row.text).match(/(?:^|[^\d])((?:20\d{2})\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,2})(?!\d)/);
    if(!hit)return '';
    const parts=hit[1].replace(/\s/g,'').split(/[-/.]/);
    const val=parts.map((v,i)=>i?v.padStart(2,'0'):v).join('-');
    const date=new Date(val+'T12:00:00Z');
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==val)return '';
    const a=target.token.toLowerCase().replace(/[oil]/g,c=>c==='o'?'0':'1').replace(/[-/.]/g,'');
    const digits=parts.join('');
    return a.length===digits.length&&Array.from(a).filter((c,i)=>c!==digits[i]).length<=2?val:'';
  }
  const dates=lines.map(printed).filter(Boolean);
  return dates.length>=2&&new Set(dates).size===1?dates[0]:'';
}

async function boundedOriginalOcrPhoto(dataUrl) {
  const limit=6*1024*1024, bytes=value=>Math.floor((value.length-value.indexOf(',')-1)*3/4);
  if(!/^data:image\/jpeg;base64,/.test(dataUrl))throw Error('Photo de reçu invalide.');
  if(bytes(dataUrl)<=limit)return dataUrl;
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('La copie OCR de la photo ne peut pas être préparée.'));image.src=dataUrl;});
  const canvas=document.createElement('canvas');
  try{
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const context=canvas.getContext('2d',{alpha:false});
    if(!context)throw Error('Préparation de la photo impossible.');
    context.drawImage(image,0,0);
    for(const quality of [.9,.82,.72]){const result=canvas.toDataURL('image/jpeg',quality);if(/^data:image\/jpeg;base64,/.test(result)&&bytes(result)<=limit)return result;}
    throw Error('La photo est trop volumineuse pour la lecture automatique. Recadrez le reçu ou complétez les champs manuellement.');
  }finally{canvas.width=canvas.height=1;}
}
