// The Type field uses the same existing native input as ordinary text fields.
// PDF.js represents the PDF read-only flag with disabled=true. Keep that lock,
// the stored value, the widget rectangle, and all other annotations untouched.
const TYPE_INPUT_V2732='.textWidgetAnnotation input[name="type_balance"]';
const TYPE_CLASS_V2732='cdq-type-native-v2732';

export function exposeReaderTypeInputV2732(surface){
  let changed=0;
  for(const input of surface.querySelectorAll(TYPE_INPUT_V2732)){
    const section=input.closest('.textWidgetAnnotation');
    if(!section)continue;
    const native=section.classList.contains('hasOwnCanvas')&&!!(input.disabled||input.readOnly);
    if(section.classList.contains(TYPE_CLASS_V2732)!==native){
      section.classList.toggle(TYPE_CLASS_V2732,native);changed++;
    }
  }
  return changed;
}
