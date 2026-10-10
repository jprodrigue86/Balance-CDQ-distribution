// Official manufacturer artwork is shipped with the application for offline use.
export const manufacturerMediaV2728=Object.freeze({
 'ANYLOAD':{logo:'./assets/catalogue-v2728/logo-anyload.svg',source:'https://www.anyload.com/wp-content/uploads/2023/02/ANYLOAD-MapleRed.svg'},
 'Rice Lake':{logo:'./assets/catalogue-v2728/logo-rice-lake.png',source:'https://cms-prod.ricelake.com/media/y0whxgo0/rice-lake-logo-2x.png'},
 'Avery Weigh-Tronix':{logo:'./assets/catalogue-v2728/logo-avery.svg',source:'https://www.averyweigh-tronix.com/en/wp-content/themes/3flowtheme/static/images/logo.svg'},
 'Flintec':{logo:'./assets/catalogue-v2728/logo-flintec.svg',tone:'dark',source:'https://res.cloudinary.com/flintec/image/upload/v1710940233/strapiDev/RGB_logo_Split_strapline_white_ce952fe43f.svg'},
 'Coti Global':{logo:'./assets/catalogue-v2728/logo-coti.png',tone:'dark',source:'https://www.cotiglobal.com/pub/static/version1748641236/frontend/Coti/design/en_US/images/logos/logo-white-notag.png'},
 'Vishay Tedea-Huntleigh':{logo:'./assets/catalogue-v2728/logo-tedea-huntleigh.jpg',source:'https://vpgforcesensors.com/sites/vpgforcesensors/files/2026-02/tedea-huntleigh_0.jpg'},
 'Vishay Sensortronics':{logo:'./assets/catalogue-v2728/logo-sensortronics.jpg',source:'https://vpgforcesensors.com/sites/vpgforcesensors/files/2026-02/sensortonics_0.jpg'},
 'Vishay Celtron':{logo:'./assets/catalogue-v2728/logo-celtron.jpg',source:'https://vpgforcesensors.com/sites/vpgforcesensors/files/2026-02/Celtron_0.jpg'},
 'Vishay Revere':{logo:'./assets/catalogue-v2728/logo-revere.jpg',source:'https://vpgforcesensors.com/sites/vpgforcesensors/files/2026-02/revere-transducers_0.jpg'},
 'BLH Nobel':{logo:'./assets/catalogue-v2728/logo-blh-nobel.png',source:'https://blhnobel.com/sites/blhnobel/files/logoblh.png'}
});
export function manufacturerLogoV2728(brand){const media=manufacturerMediaV2728[brand];return media?.logo?new URL(media.logo,import.meta.url).href:'';}
export function manufacturerLogoToneV2728(brand){return manufacturerMediaV2728[brand]?.tone||'light';}
export function productImageV2728(product){return product.image?new URL(product.image,import.meta.url).href:manufacturerLogoV2728(product.brand);}
