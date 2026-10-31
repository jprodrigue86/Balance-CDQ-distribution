#!/usr/bin/env python3
"""PDF V20: preserve V19 vector PDF, only title and original type_balance AcroForm.
Keep original native header font family/color/size, and all original widgets.
"""
from __future__ import annotations
import fitz,hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/"essais-plancher-v19-largeurs-20261031"/"CDQ_Plancher_Essai_Fonctionnel_V19.pdf"
OUT=ROOT/"essais-plancher-v20-intermediaire-focus-20261031"
OUT.mkdir(exist_ok=True)
SRC=BASE.read_bytes()
sha=lambda b: hashlib.sha256(b).hexdigest()
assert sha(SRC)=="f1a79665f0005d1ca0fd5136d0cbce9b37eec8d93bee721c8fa8071c3177f92b"
src=fitz.open(stream=SRC,filetype="pdf")
assert src.page_count==1
original_text=src[0].get_text(sort=False)
original_widget_objects={w.field_name:src.xref_object(w.xref,compressed=False) for w in src[0].widgets() or []}
assert len(original_widget_objects)==180
orig_image=src[0].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
old_header=src.xref_stream(15).decode("latin-1")
pattern=r"(1 0 0 1 )-87\.0708( 0 Tm\s+/F3\+0 29 Tf\s+34\.8 TL\s+)\(PLANCHER\) Tj"
assert len(re.findall(pattern,old_header))==1

doc=fitz.open(stream=SRC,filetype="pdf")
# Ubuntu Linux provides original DejaVuSans-Bold font family with full alphabet.
font_path=Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
assert font_path.exists(), "Same font family not installed; do not substitute a different font"
f=fitz.Font(fontfile=str(font_path))
title="INTERMÉDIAIRE"
assert f.has_glyph(ord("É"))
size=29 # original internal font size; source header xobject converts to PDF points.
width=f.text_length(title,fontsize=size)
assert 175<width<300, width
scratch=doc.new_page(width=612,height=792)
newfont="FCDQV20Bold"
fontref=scratch.insert_font(fontname=newfont,fontfile=str(font_path))
scratch.insert_text((24,55),title,fontsize=size,fontname=newfont,color=(0.07451,0.533333,0.776471))
scratch_stream="\n".join(doc.xref_stream(xref).decode("latin-1") for xref in scratch.get_contents())
# The actual PDF font encoder, including its ToUnicode map for the accent, owns these bytes.
match=re.search(r"(\[<[0-9a-fA-F]+>\]\s*TJ|<[0-9a-fA-F]+>\s*Tj|\((?:\\.|[^)])*\)\s*Tj)",scratch_stream)
assert match, scratch_stream[:1500]
encoded=match.group(1)
assert "É" not in encoded, "Only PDF-native string encoding is supported"
# Attach the new resource to the original header Form XObject rather than drawing on top.
doc.xref_set_key(15,"Resources/Font/"+newfont, f"{fontref} 0 R")
head=doc.xref_stream(15).decode("latin-1")
newx=-width/2
assert len(re.findall(pattern,head))==1
# Avoid repeating font operation: pattern captures old font and TL; create a
# minimal section with exactly one font declaration using a second pass.
oldblock=re.search(pattern,head).group(0)
replacement=f"1 0 0 1 {newx:.5f} 0 Tm\n/{newfont} 29 Tf\n34.8 TL\n{encoded}"
newhead=head.replace(oldblock,replacement)
assert newhead!=head and "(PLANCHER) Tj" not in newhead
assert newhead.count(f"/{newfont} 29 Tf")==1
doc.update_stream(15,newhead.encode("latin-1"),compress=True)
doc.delete_page(-1)
assert doc.page_count==1

page0=doc.load_page(0)  # keep page alive while updating its widget
widget=next(w for w in page0.widgets() or [] if w.field_name=="essai_cdq_type_balance")
assert not str(widget.field_value or "").strip()
assert not(widget.field_flags&1)
old_rect=list(widget.rect)
widget.field_value="Balance de plancher"
widget.update()
# Keep reset/reopen and Android viewer data source consistent.
doc.xref_set_key(widget.xref,"DV","(Balance de plancher)")
OUTPDF=OUT/"CDQ_Plancher_Essai_Fonctionnel_V20.pdf"
doc.save(str(OUTPDF),garbage=0,deflate=True,clean=False)
doc.close()

fresh=fitz.open(str(OUTPDF))
assert fresh.page_count==1 and len(list(fresh[0].widgets() or []))==180
new_text=fresh[0].get_text(sort=False)
assert "INTERMÉDIAIRE" in new_text and "PLANCHER" not in new_text
# The sole additional extracted line is the requested default form value.
assert new_text.count("Balance de plancher")==1
assert new_text.replace("Balance de plancher\n","",1)==original_text.replace("PLANCHER","INTERMÉDIAIRE"),"Unexpected other PDF text changes"
after={w.field_name:fresh.xref_object(w.xref,compressed=False) for w in fresh[0].widgets() or []}
for name,before in original_widget_objects.items():
    if name=="essai_cdq_type_balance": continue
    assert before==after[name],name+" changed outside authorized field"
typew=next(w for w in fresh[0].widgets() or [] if w.field_name=="essai_cdq_type_balance")
assert typew.field_value=="Balance de plancher"
assert list(typew.rect)==old_rect
print("FORM_AP_SOURCE",src.xref_object(76,compressed=False)[:1500],repr(src.xref_stream(76)[:1500]))
print("FORM_TYPE_AFTER",typew.text_font,typew.text_fontsize,typew.text_color,typew.field_value,fresh.xref_object(typew.xref,compressed=False)[:1600])
assert typew.text_font=="FRC" and abs(typew.text_fontsize-8.984)<.02
assert typew.field_flags==0
header=fresh.xref_stream(15).decode("latin-1")
assert "/FCDQV20Bold 29 Tf" in header and "(PLANCHER) Tj" not in header
# Preserve exact original vector header except one text operator block.
clean=lambda s: re.sub(r"1 0 0 1 [\d\-.]+ 0 Tm\s+/(?:F3\+0|FCDQV20Bold) 29 Tf\s+34\.8 TL\s+(?:\(PLANCHER\) Tj|\[<[0-9a-fA-F]+>\]TJ)","{HEADER_TITLE}",s)
assert clean(old_header)==clean(header)
after_image=fresh[0].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
assert orig_image.width==after_image.width and orig_image.height==after_image.height
assert orig_image.n==after_image.n
b0,b1=orig_image.samples,after_image.samples
stride=orig_image.stride
mismatches=0
for y in range(orig_image.height):
    for x in range(orig_image.width):
        k=y*stride+x*orig_image.n
        if b0[k:k+orig_image.n]==b1[k:k+orig_image.n]:continue
        mismatches+=1
        page_x,page_y=x/2,y/2
        if not ((200<=page_x<=435 and 52<=page_y<=80) or
                (174<=page_x<=309 and 290<=page_y<=307)):
            raise AssertionError(f"Unauthorised visual pixel outside header/type: {(page_x,page_y)}")
assert mismatches>50,"Expected visible modification missing"
report={
    "result":"passed","source_sha256":sha(SRC),"pdf_sha256":sha(OUTPDF.read_bytes()),
    "pdf_bytes":OUTPDF.stat().st_size,"page_count":fresh.page_count,
    "header_original":"PLANCHER","header_updated":title,
    "header_font_family":"DejaVuSans-Bold","header_font_size_native":size,
    "header_rgb":[0.07451,0.533333,0.776471],
    "type_balance_value":typew.field_value,
    "type_balance_xref":typew.xref,"pdf_widget_count":len(after),
    "untouched_widget_objects_identical":179,
    "pixel_differences":mismatches,"no_pixel_change_outside_two_authorized_regions":True,
    "note":"Linux PDF structure/render verified. Direct touch behavior requires Android device validation."
}
(OUT/"qa-v20.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(report,ensure_ascii=False,indent=2))
