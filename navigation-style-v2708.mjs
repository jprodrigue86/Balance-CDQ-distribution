const tiles={
 'current:calibration':[160,0,370],
 'dark-pro:calibration':[160,330,370],'dark-pro:calcul':[582,330,370],'dark-pro:opportunities':[1014,330,370],
 'isometric:calibration':[160,660,364],'isometric:calcul':[582,660,364],'isometric:opportunities':[1014,660,364]
};
const source=new URL('./assets/navigation-v2708/icons.png',import.meta.url).href;
export function navigationStyleV2708(key,theme,size=32){
 const tile=tiles[theme+':'+key];if(!tile)return '';
 const [x,y,crop]=tile;
 return '<svg data-icon-theme="'+theme+'" data-theme="'+theme+'" data-navigation-style-v2708="'+key+'" viewBox="0 0 '+crop+' '+crop+'" width="'+Number(size)+'" height="'+Number(size)+'" aria-hidden="true"><image x="'+(-x)+'" y="'+(-y)+'" width="1536" height="1024" href="'+source+'"/></svg>';
}
