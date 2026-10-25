// Render only sourced, exact identity media. This module does not fetch images.
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+]/g,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function calibrationSourceUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function verifiedCalibrationMedia(media,{manufacturer,model,variant}={}){
 if(!media||media.verified!==true||!media.alt||!media.checkedAt||!calibrationSourceUrl(media.sourceUrl))return null;
 // Packaged media avoid leaking client/model selection to a remote image host.
 if(!/^\.\/assets\/calibration-v2784\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp|svg)$/.test(media.src||''))return null;
 if(!norm(manufacturer)||norm(media.exactManufacturer)!==norm(manufacturer))return null;
 if(model&&norm(media.exactModel)!==norm(model))return null;
 if(variant&&norm(media.exactVariant)!==norm(variant))return null;
 return media;
}
export function calibrationMediaHtml(media,identity,{kind='photo',caption=true,missing='Photo exacte non documentée'}={}){
 const found=verifiedCalibrationMedia(media,identity);
 if(!found)return '<div class="cdq-cal-media-missing '+esc(kind)+'">'+esc(missing)+'</div>';
 return '<figure class="cdq-cal-media '+esc(kind)+'" data-cal-media><img loading="lazy" decoding="async" src="'+esc(found.src)+'" alt="'+esc(found.alt)+'" data-cal-image><span class="cdq-cal-media-missing" hidden>Image indisponible sur cet appareil</span>'+(caption?'<figcaption><a href="'+esc(calibrationSourceUrl(found.sourceUrl))+'" target="_blank" rel="noopener noreferrer">'+esc(found.sourceLabel||'Source fabricant')+'</a> · vérifiée le '+esc(found.checkedAt)+(found.page?' · p. '+esc(found.page):'')+'</figcaption>':'')+'</figure>';
}
export function installCalibrationMediaFallback(root){
 if(root.dataset.calMediaFallback)return;root.dataset.calMediaFallback='true';
 root.addEventListener('error',event=>{const img=event.target;if(!img?.matches?.('[data-cal-image]'))return;img.hidden=true;const missing=img.parentElement.querySelector('.cdq-cal-media-missing');if(missing)missing.hidden=false;},true);
}
