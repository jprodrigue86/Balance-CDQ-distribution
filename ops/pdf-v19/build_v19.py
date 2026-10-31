#!/usr/bin/env python3
"""True vector/AcroForm resize of CDQ Plancher V18 block 3 only.
No cover-up rectangles, no flattening, and no changes to other blocks.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import runpy
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "essais-plancher-v19-largeurs-20261031"
OUT.mkdir(exist_ok=True)
HERE = Path(__file__).resolve().parent
source, _specs = runpy.run_path(str(HERE / "probe_v18.py"))["reconstruct"]()
assert hashlib.sha256(source).hexdigest() == "9676a3eb7d83a73f814dd480c897ce7a248172aeb50a142d8221ed5f7e130dc0"

baseline = fitz.open(stream=source, filetype="pdf")
assert baseline.page_count == 1
before_text = baseline[0].get_text(sort=False)
before_pix = baseline[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False)
doc = fitz.open(stream=source, filetype="pdf")
assert doc.page_count == 1
page = doc[0]
original_page_size = (page.rect.width, page.rect.height)
assert original_page_size == (612, 792)

old_cols = [
    (14.67419, 44.88576),     # Point (static vector rectangles)
    (47.47532, 117.39351),    # Charge utilisée
    (119.9831, 193.35404),    # Charge de contrainte
    (195.9436, 260.68267),    # Tolérance
    (264.1354, 346.13822),    # Avant correction
    (349.591, 425.55151),     # Erreur avant
    (429.0042, 517.91252),    # Après correction
    (521.3653, 596.46262),    # Erreur après
]
COLS = len(old_cols)
ROWS = 6
GAP = 3.0
left, right = old_cols[0][0], old_cols[-1][1]
W = (right - left - (COLS - 1) * GAP) / COLS
new_cols = [(left + i*(W+GAP), left + i*(W+GAP) + W) for i in range(COLS)]
assert COLS == 8 and 70 < W < 71

contents = page.get_contents()
assert len(contents) == 5
native_xref = contents[0]
raw = doc.xref_stream(native_xref).decode("latin-1")
lines = raw.splitlines()
assert len(lines) > 900

RE_RECT = re.compile(r"^(\s*)(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re(\s*)$")
RE_TM = re.compile(r"^(\s*1 0 0 1 )(-?[\d.]+)( -?[\d.]+ Tm\s*)$")
operations = []

def adjust_rect(i, col):
    m = RE_RECT.fullmatch(lines[i])
    if not m:
        raise AssertionError(f"Unrecognized native rectangle op at line {i}: {lines[i]}")
    x, yy, ww, hh = map(float, m.group(2,3,4,5))
    a,b=old_cols[col]
    if abs(x-a)>0.001 or abs(x+ww-b)>0.001:
        raise AssertionError(f"Unrecognized V18 geometry for rectangle #{col}: {lines[i]}")
    if not ((abs(yy-412.3922)<0.01 and abs(hh-21.56863)<0.01) or
            (any(abs(yy-v)<0.01 for v in (395.5686,379.0039,362.4392,345.8745,329.3098,312.7451)) and
             abs(hh-15.09804)<0.01 and col==0)):
        raise AssertionError("Rectangle outside authorized block 3")
    start,end=new_cols[col]
    lines[i]=f"{m.group(1)}{start:.5f} {m.group(3)} {W:.5f} {m.group(5)} re{m.group(6)}"
    operations.append({"op":"rect","line":i,"col":col,"old":[x,ww],"new":[start,W]})

def adjust_text(i,col):
    m = RE_TM.fullmatch(lines[i])
    if not m:
        raise AssertionError(f"Unexpected text matrix at line {i}: {lines[i]}")
    x=float(m.group(2))
    old_mid=sum(old_cols[col])/2
    new_mid=sum(new_cols[col])/2
    newx=x+new_mid-old_mid
    lines[i]=f"{m.group(1)}{newx:.5f}{m.group(3)}"
    operations.append({"op":"text-center","line":i,"col":col,"old_x":x,"new_x":newx})

# 8 turquoise header cell rectangles; 8 sets of centered header captions.
header_rows = []
for i,s in enumerate(lines):
    m=RE_RECT.fullmatch(s)
    if not m:continue
    x,y,w,h=map(float,m.group(2,3,4,5))
    if abs(y-412.3922)<0.01 and abs(h-21.56863)<0.01:
        header_rows.append(i)
assert len(header_rows)==8, header_rows
for col,i in enumerate(header_rows):
    adjust_rect(i,col)
    end=header_rows[col+1] if col<7 else next(j for j in range(i+1,len(lines)) if "395.5686" in lines[j] and " re" in lines[j])
    captions=[j for j in range(i+1,end) if RE_TM.fullmatch(lines[j])]
    assert len(captions)==(2 if col in (1,2,4,6) else 1),(col,captions)
    for j in captions:adjust_text(j,col)

# 6 numbered Point rectangles are native vector strokes, not annotations.
point_lines=[]
for i,s in enumerate(lines):
    m=RE_RECT.fullmatch(s)
    if not m:continue
    x,y,w,h=map(float,m.group(2,3,4,5))
    if (abs(x-old_cols[0][0])<0.001 and abs(w-(old_cols[0][1]-old_cols[0][0]))<0.001 and
        abs(h-15.09804)<0.01 and 312<y<397):
        point_lines.append(i)
assert len(point_lines)==6,point_lines
for i in point_lines:
    adjust_rect(i,0)
    j=next(j for j in range(i+1,i+9) if RE_TM.fullmatch(lines[j]))
    assert lines[j+3].strip().startswith("<3") and lines[j+3].strip().endswith(" Tj"),(j,lines[j+3])
    adjust_text(j,0)

updated_stream=("\n".join(lines)+("\n" if raw.endswith("\n") else "")).encode("latin-1")
assert updated_stream != raw.encode("latin-1")
assert len([x for x in operations if x["op"]=="rect"]) == 14
assert len([x for x in operations if x["op"]=="text-center"]) == 18
doc.update_stream(native_xref,updated_stream,compress=True)

# Modify genuine AcroForm widget /Rect in the PDF objects, including the four
# overlapping red/green indicator widgets for every Before/After cell.
COL_FOR_SUFFIX={
    "charge_utilisee":1,"charge_contrainte":2,"tolerance":3,
    "avant_correction":4,"erreur_avant":5,"apres_correction":6,"erreur_apres":7,
}
widget_before={}
widget_after={}
moved=[]
widgets=list(page.widgets() or [])
assert len(widgets)==180,len(widgets)
for widget in widgets:
    key=widget.field_name
    widget_before[key]=doc.xref_object(widget.xref,compressed=False)
    hit=re.fullmatch(r"essai_cdq_charge_point_([1-6])_(.+)",key or "")
    if hit:
        row=int(hit.group(1))
        col=COL_FOR_SUFFIX.get(hit.group(2))
    else:
        hit=re.fullmatch(r"essai_cdq_coin_charge_point_([1-6])_(avant_correction|apres_correction)_(green|red)",key or "")
        if hit:
            row=int(hit.group(1))
            col=4 if hit.group(2)=="avant_correction" else 6
        else:
            col=None
    if col is None:continue
    rect=widget.rect
    a,b=old_cols[col]
    if abs(rect.x0-a)>0.01 or abs(rect.x1-b)>0.01:
        raise AssertionError(f"Unexpected V18 field rectangle {key} {list(rect)}")
    typ,val=doc.xref_get_key(widget.xref,"Rect")
    assert typ=="array"
    vals=list(map(float,re.findall(r"-?[\d.]+",val)))
    assert len(vals)==4,(key,typ,val)
    x1,x2=new_cols[col]
    doc.xref_set_key(widget.xref,"Rect",f"[{x1:.5f} {vals[1]:.5f} {x2:.5f} {vals[3]:.5f}]")
    moved.append(key)
assert len(moved)==66,len(moved)
assert sum(1 for k in moved if "coin_charge" in k)==24
assert sum(1 for k in moved if "coin_charge" not in k)==42

path=OUT/"CDQ_Plancher_Essai_Fonctionnel_V19.pdf"
doc.save(str(path),garbage=0,deflate=True,clean=False)
doc.close()
modified=fitz.open(str(path))
p=modified[0]
new_widgets=list(p.widgets() or [])
assert len(new_widgets)==180
assert {w.field_name for w in new_widgets}==set(widget_before)
for widget in new_widgets:
    orig=widget_before[widget.field_name]
    after=modified.xref_object(widget.xref,compressed=False)
    if widget.field_name not in moved:
        assert orig==after,widget.field_name+" changed outside scope"
    else:
        # Only the /Rect object is modified; preserve field flags, value, AP,
        # JavaScript, formatting and all existing calculation actions.
        rem=lambda v:re.sub(r"/Rect\s*\[[^\]]*\]","/Rect []",v)
        assert rem(orig)==rem(after),widget.field_name+" changed beyond Rect"
        hit=re.fullmatch(r"essai_cdq_charge_point_([1-6])_(.+)",widget.field_name or "")
        if hit:col=COL_FOR_SUFFIX[hit.group(2)]
        else:col=4 if "avant_correction" in widget.field_name else 6
        rect=widget.rect
        assert abs(rect.width-W)<.01 and abs(rect.x0-new_cols[col][0])<.01,widget.field_name

# No unrelated page text should have changed, only positions (not strings).
assert before_text==p.get_text(sort=False),"Document text changed"
after_pix=p.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False)
assert (before_pix.width,before_pix.height,before_pix.n)==(after_pix.width,after_pix.height,after_pix.n)
# Pixel-perfect outside the changed region, including all other blocks.
stride=before_pix.stride
buf1,buf2=before_pix.samples,after_pix.samples
for y in range(before_pix.height):
    page_y=y/1.5
    if 350 <= page_y <= 481:continue
    a=y*stride
    if buf1[a:a+stride]!=buf2[a:a+stride]:
        raise AssertionError(f"Unexpected visual change outside block3 at page y={page_y:.3f}")
# Compare actual rectangle widths after reload. PDF annotation appearances must
# also follow the newly resized AcroForm rectangles.
sample_rects=[]
for w in new_widgets:
    if re.fullmatch(r"essai_cdq_charge_point_[1-6]_(charge_utilisee|charge_contrainte|tolerance|avant_correction|erreur_avant|apres_correction|erreur_apres)",w.field_name or ""):
        sample_rects.append(round(w.rect.width,3))
assert len(sample_rects)==42 and max(sample_rects)-min(sample_rects)<0.02
assert p.get_text(sort=False)==before_text
sha=lambda b:hashlib.sha256(b).hexdigest()
report={
    "result":"passed","base_pdf":"CDQ_Plancher_Essai_Fonctionnel_V18.pdf",
    "base_sha256":sha(source),"updated_pdf":path.name,"updated_sha256":sha(path.read_bytes()),
    "updated_size_bytes":path.stat().st_size,"page_count":modified.page_count,
    "widget_count_before":len(widgets),"widget_count_after":len(new_widgets),
    "widgets_rect_resized":len(moved),"native_rectangles_resized":14,
    "header_text_labels_recentered":12,"point_labels_recentered":6,
    "block":"Bloc 3 - Essai de charge centrale","columns":8,"rows":6,
    "new_equal_width_pdf_pt":round(W,5),"equal_gutters_pdf_pt":GAP,
    "outer_bounds_pdf_pt":[round(left,5),round(right,5)],
    "pixel_identical_outside_block3":True,"form_widgets_preserved":True,
    "widget_actions_appearances_preserved":True,"form_text_preserved":True,
    "note":"GitHub Linux PDF validation; Android CDQ reader still needs real user verification."
}
(OUT/"qa-v19.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(report,ensure_ascii=False,indent=2))
