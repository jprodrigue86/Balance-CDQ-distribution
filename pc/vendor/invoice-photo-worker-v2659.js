'use strict';
const MAX_PIXELS = 60000000;
function checkSize(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw Error('La photo est vide ou endommagée.');
  if (width * height > MAX_PIXELS) throw Error('La photo dépasse 60 mégapixels. Exportez une copie plus petite.');
}
async function heif(buffer) {
  importScripts('./libheif-1.23.2/libheif.js');
  const api = await libheif({locateFile: () => new URL('./libheif-1.23.2/libheif.wasm', self.location.href).href});
  const decoder = new api.HeifDecoder(), images = decoder.decode(new Uint8Array(buffer));
  try {
    const image = images.find(x => x.is_primary()) || images[0];
    if (!image) throw Error('Cette photo HEIC/HEIF est endommagée ou utilise un encodage non pris en charge.');
    const width = image.get_width(), height = image.get_height();
    checkSize(width, height);
    const pixels = new Uint8ClampedArray(width * height * 4);
    const result = await new Promise((resolve, reject) => image.display({data: pixels, width, height}, data => {
      if (data) resolve(data); else reject(Error('Cette photo HEIC/HEIF ne peut pas être convertie. Choisissez une autre photo.'));
    }));
    return {width, height, pixels: result.data.buffer, orientation: 1};
  } finally {
    images.forEach(image => image.free());
    if (decoder.decoder) api.heif_context_free(decoder.decoder);
  }
}
function tiff(buffer) {
  importScripts('./pako-1.0.11/pako_inflate.min.js', './utif-3.1.0/UTIF.js');
  const pages = UTIF.decode(buffer), page = pages.find(x => !(Number(x.t254?.[0]) & 1)) || pages[0];
  if (!page) throw Error('Cette photo TIFF est vide ou endommagée.');
  checkSize(Number(page.t256?.[0]), Number(page.t257?.[0]));
  UTIF.decodeImage(buffer, page);
  checkSize(page.width, page.height);
  const pixels = UTIF.toRGBA8(page);
  return {width: page.width, height: page.height, pixels: pixels.buffer, orientation: Number(page.t274?.[0]) || 1};
}
self.onmessage = async ({data}) => {
  try {
    const result = data.format === 'heif' ? await heif(data.buffer) : tiff(data.buffer);
    self.postMessage(result, [result.pixels]);
  } catch (error) {
    self.postMessage({error: error.message || 'La photo ne peut pas être convertie. Choisissez une autre photo.'});
  }
};
