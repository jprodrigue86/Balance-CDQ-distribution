// Remove the photographed black matte at paint time; retain the original atlas.
(() => {
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('aria-hidden','true');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.cssText='position:absolute;pointer-events:none';
 svg.innerHTML='<defs><filter id="cdq-icon-no-matte-v2697" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 20 20 20 0 -0.8"/></filter></defs>';
 document.body.append(svg);
 const style=document.createElement('style');style.textContent='html body :is(#cdq-transparent-icon-v2697,[data-cdq-photo-icon-v2690])::after,html body :is(#cdq-transparent-icon-v2697,img[data-cdq-shared-icon-v2685]:is([data-cdq-art-src-v2685*="navigation-v2690"],[data-cdq-art-src-v2685*="navigation-v2701"])){filter:url(#cdq-icon-no-matte-v2697)!important}html body :is(#cdq-transparent-icon-v2697,[data-cdq-photo-icon-v2690]){background-color:transparent!important;border:0!important;box-shadow:none!important}[data-cdq-heading-icon-v2675],[data-cdq-heading-icon-v2675]>.cdq-icon-host-v2514{background:transparent!important;border:0!important;box-shadow:none!important}';document.head.append(style);
})();
