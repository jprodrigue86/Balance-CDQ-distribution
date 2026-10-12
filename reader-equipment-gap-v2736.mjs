// The Plancher master alone retained the taller, higher equipment captions.
// Edit their owning paths and text in place: no covering rectangle, new layer,
// widget movement, field action or image replacement is needed.
const rowPattern = /^q 0 \.32 \.79 rg \.02 \.85 \.94 RG \.6 w ([-\d.]+) 560 ([-\d.]+) 18\.5 re B Q$/gm;
const correctedRowPattern = /^q 0 \.32 \.79 rg \.02 \.85 \.94 RG \.6 w ([-\d.]+) 559 ([-\d.]+) 16\.5 re B Q$/gm;
const labelPattern = /\/CDQ2719Header 7 Tf ([-\d.]+) ([-\d.]+) Td <(436174E9676F726965|466162726963616E74|4D6F64E86C65|4EB02064652053E9726965|4EB020412D4D)>/g;

function streamText(stream, L) {
  const bytes = stream instanceof L.PDFRawStream ? L.decodePDFRawStream(stream).decode() : stream.getUnencodedContents?.();
  if (!bytes) throw Error('Equipment gap: unreadable page content');
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return text;
}

function replaceStream(pdf, L, ref, stream, text) {
  if (!(ref instanceof L.PDFRef)) throw Error('Equipment gap: expected indirect owning stream');
  const next = pdf.context.flateStream(Uint8Array.from(text, c => c.charCodeAt(0)));
  for (const [key, value] of stream.dict.entries()) {
    if (!['/Length', '/Filter', '/DecodeParms'].includes(key.toString())) next.dict.set(key, value);
  }
  // Reuse its indirect object identity so the old stream becomes no orphan.
  pdf.context.assign(ref, next);
}

export function applyEquipmentHeaderGapV2736(pdf, L, family) {
  if (family !== 'plancher') return false;
  const N = L.PDFName.of, page = pdf.getPages()[0], content = page.node.get(N('Contents'));
  const array = pdf.context.lookup(content);
  if (!(array instanceof L.PDFArray)) throw Error('Equipment gap: expected original page content array');
  let rectangles, captions;
  for (const ref of array.asArray()) {
    const stream = pdf.context.lookup(ref);
    if (!(stream instanceof L.PDFRawStream) && !stream.getUnencodedContents) continue;
    const text = streamText(stream, L);
    if (text.startsWith('% CDQ compact equipment and full circles V2704')) rectangles = {ref, stream, text};
    if (text.startsWith('% CDQ report typography V2719')) captions = {ref, stream, text};
  }
  if (!rectangles || !captions) throw Error('Equipment gap: original Plancher owning paths missing');
  const count = [...rectangles.text.matchAll(rowPattern)].length;
  if (!count && [...rectangles.text.matchAll(correctedRowPattern)].length === 5) return false;
  if (count !== 5 || [...captions.text.matchAll(labelPattern)].length !== 5) throw Error('Equipment gap: original five equipment columns differ');
  const nextRectangles = rectangles.text.replace(rowPattern, 'q 0 .32 .79 rg .02 .85 .94 RG .6 w $1 559 $2 16.5 re B Q');
  const nextCaptions = captions.text.replace(labelPattern, (_, x, y, label) => '/CDQ2719Header 7 Tf ' + x + ' ' + String(Number(y) - 1) + ' Td <' + label + '>');
  replaceStream(pdf, L, rectangles.ref, rectangles.stream, nextRectangles);
  replaceStream(pdf, L, captions.ref, captions.stream, nextCaptions);
  pdf.catalog.set(N('CDQEquipmentGapV2736'), pdf.context.obj(true));
  return true;
}
