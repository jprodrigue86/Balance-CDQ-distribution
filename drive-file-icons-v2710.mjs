// File types keep their familiar colors and shapes in every navigation theme.
const page=(color,label,detail='')=>'<path d="M9 3h21l9 9v33H9z" fill="'+color+'"/><path d="M30 3v9h9" fill="#000" opacity=".2"/>'+detail+'<text x="24" y="35" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="white">'+label+'</text>';
export function driveFileIconV2710(kind,label=''){
 const drawings={
  folder:'<path d="M3 11h16l5 5h21v25H3z" fill="#D79C21"/><path d="M3 18h42v23H3z" fill="#FFCA45"/><path d="M5 20h38" stroke="#FFE392" stroke-width="2"/>',
  pdf:page('#E53935','PDF'),
  sheet:label==='Sheets'?page('#0F9D58','', '<rect x="14" y="17" width="20" height="20" fill="none" stroke="white" stroke-width="2"/><path d="M14 24h20M14 31h20M21 17v20M28 17v20" stroke="white" stroke-width="2"/>'):page('#107C41','XLSX','<path d="m16 17 9 12m0-12-9 12" stroke="white" stroke-width="3"/>'),
  doc:page('#4285F4',label==='Docs'?'DOC':'W','<path d="M15 18h17M15 23h17" stroke="white" stroke-width="2"/>'),
  slides:page('#F4B400','PPT','<rect x="15" y="17" width="17" height="10" fill="none" stroke="white" stroke-width="2"/>'),
  gallery:'<rect x="5" y="6" width="38" height="36" rx="3" fill="#F5F7FA"/><rect x="9" y="10" width="30" height="26" fill="#78C9F2"/><circle cx="30" cy="17" r="4" fill="#FFD55C"/><path d="m9 32 10-12 8 10 5-6 7 12H9z" fill="#27966F"/>',
  file:page('#71859A','', '<path d="M15 18h17M15 24h17M15 30h12" stroke="white" stroke-width="2"/>')
 };
 const body=drawings[kind]||drawings.file;
 const art='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">'+body+'</svg>';
 return '<svg class="cdq-drive-original-v2710" data-file-icon="'+(drawings[kind]?kind:'file')+'" data-file-artwork="original" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><image width="48" height="48" href="data:image/svg+xml,'+encodeURIComponent(art)+'"/></svg>';
}
