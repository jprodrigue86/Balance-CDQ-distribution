// V26: one native page path per frame, independent of editable/read-only state.
// This isolated reader never paints a second CSS edge over those PDF paths.
const style = document.createElement('style');
style.id = 'cdq-native-borders-v26';
style.textContent = `
#viewer .annotationLayer section:is(.textWidgetAnnotation,.choiceWidgetAnnotation){border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;}
#viewer .annotationLayer section:is(.textWidgetAnnotation,.choiceWidgetAnnotation) :is(input,textarea,select){border:0!important;outline:0!important;outline-offset:0!important;box-shadow:none!important;background-color:transparent!important;background-image:none!important;}
#viewer .annotationLayer section:is(.textWidgetAnnotation,.choiceWidgetAnnotation) :is(input,textarea,select):is(:focus,:focus-visible,:hover,:active){border:0!important;outline:0!important;box-shadow:none!important;}
`;
document.head.append(style);
