// Photo preparation stays on the device; OCR and storage receive the same JPEG.
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
  const maxW = 1900, maxH = 7200, minReceiptW = 1000;
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
  const result = canvas.toDataURL('image/jpeg', .92);
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
