// Native appearance canvases own their border; regenerated HTML fields own theirs.
// Keep this rule in the isolated reader so it also applies after reopening a saved PDF.
const styleId = 'cdq-one-border-owner-v7';
if (!document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
#viewer .annotationLayer section.cdq-border-owner-v7.hasOwnCanvas:not(.sandboxModified){border:0!important;box-shadow:none!important;outline:0!important;}
#viewer .annotationLayer section.cdq-border-owner-v7:is(:not(.hasOwnCanvas),.sandboxModified){border:calc(0.6px * var(--total-scale-factor, 1)) solid rgb(109.65,183.6,201.45)!important;border-radius:0!important;box-shadow:none!important;outline:0!important;}
#viewer .annotationLayer section.cdq-border-owner-v7 :is(input,textarea,select){border:0!important;outline:0!important;box-shadow:none!important;background-image:none!important;}`;
  document.head.append(style);
}
let pending = false;
function mark() {
  pending = false;
  for (const section of document.querySelectorAll('#viewer .annotationLayer section:is(.textWidgetAnnotation,.choiceWidgetAnnotation)')) {
    if (section.classList.contains('cdq-border-owner-v7')) continue;
    const style = getComputedStyle(section);
    if (parseFloat(style.borderTopWidth) > 0 &&
        (section.style.border.includes('110, 184, 201') || style.borderTopColor === 'rgb(110, 184, 201)')) {
      section.classList.add('cdq-border-owner-v7');
    }
  }
}
const observer = new MutationObserver(() => {
  if (!pending) { pending = true; requestAnimationFrame(mark); }
});
observer.observe(document.getElementById('viewer'), { childList: true, subtree: true });
mark();
