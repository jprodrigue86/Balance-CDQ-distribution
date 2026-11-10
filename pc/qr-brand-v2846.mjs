// CDQ 28.46 — one QR renderer for every client-page dialog.
// Keep the capability URL unchanged: QR creation is entirely local, never remote.
export async function renderBrandedQrV2846(holder, privateUrl, label='Code QR du client') {
  if (!(holder instanceof HTMLElement)) throw Error('CDQ_QR_INVALID_CONTAINER');
  const value=String(privateUrl||'');
  if (!value.startsWith('https://') || !value.includes('/client/#')) {
    throw Error('CDQ_QR_INVALID_LINK');
  }
  const {default:qrcode}=await import('./qrcode-generator-1.4.4.mjs');
  const qr=qrcode(0,'H'); // ECC H is required when a logo covers QR modules.
  qr.addData(value); qr.make();
  const moduleCount=qr.getModuleCount();
  if (moduleCount<41 || moduleCount>149) throw Error('CDQ_QR_UNSUPPORTED_DENSITY');
  holder.replaceChildren();
  holder.innerHTML=qr.createSvgTag({cellSize:6,margin:24,scalable:true,alt:label});
  const svg=holder.querySelector('svg');
  if (!svg) throw Error('CDQ_QR_RENDER_FAILED');
  const ns='http://www.w3.org/2000/svg';
  const side=moduleCount*6+48;
  const badgeWidth=Math.min(144,side*0.275);
  const badgeHeight=badgeWidth*73/182;
  const badgeX=(side-badgeWidth)/2;
  const badgeY=(side-badgeHeight)/2;
  const rect=document.createElementNS(ns,'rect');
  rect.setAttribute('x',String(badgeX));
  rect.setAttribute('y',String(badgeY));
  rect.setAttribute('width',String(badgeWidth));
  rect.setAttribute('height',String(badgeHeight));
  rect.setAttribute('fill','#ffffff');
  // The genuine approved CDQ artwork, already packaged in the Android APK,
  // is drawn directly into the QR SVG rather than layered as page decoration.
  const logo=document.createElementNS(ns,'image');
  logo.setAttribute('x',String(badgeX+2));
  logo.setAttribute('y',String(badgeY+2));
  logo.setAttribute('width',String(badgeWidth-4));
  logo.setAttribute('height',String(badgeHeight-4));
  logo.setAttribute('preserveAspectRatio','xMidYMid meet');
  logo.setAttribute('href',new URL('./assets/report-brand-v2864/logo.svg',import.meta.url).href);
  logo.setAttribute('aria-label','Logo Balance CDQ');
  svg.append(rect,logo);
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label',label+' avec logo Balance CDQ intégré');
  holder.dataset.cdqQrBrandV2846='local-svg-ecc-h-report-logo';
  return {moduleCount,correction:'H',logo:true};
}
