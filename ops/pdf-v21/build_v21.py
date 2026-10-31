#!/usr/bin/env python3
"""Isolated V21: native per-corner block-4 color patch. All other PDF objects preserved."""
from pathlib import Path
import fitz,json,hashlib
root=Path(__file__).resolve().parents[2]
p=root/"essais-plancher-v20-intermediaire-focus-20261031/CDQ_Plancher_Essai_Fonctionnel_V20.pdf"
out=root/"essais-plancher-v21-fleches-20261031"
out.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
data=p.read_bytes()
assert sha(data)=="a4c242bae61deed77fc78cce02e8fe67c7c01bdfecb184a127ffede56f8030ff"
src=fitz.open(stream=data,filetype="pdf")
assert src.page_count==1 and len(list(src[0].widgets() or []))==180
assert src.xref_get_key(297,"JS")[0]=="string"
old='var pointState=vals[j]===null?"gray":partialState;'
new=('var pointState=!canEvaluate||vals[j]===null?"gray":'
     '(Math.abs(vals[j]-c4)<=t4*e+.0000000001*Math.max(1,Math.abs(t4*e))?"green":"red");')
original_js=src.xref_get_key(297,"JS")[1]
assert original_js.count(old)==1
assert 'var partialState=' in original_js
assert 'CDQ_status(d,"bloc4",ecc.state);' in original_js
raw=src.xref_object(297,compressed=False)
assert raw.count(old)==1 and "/S /JavaScript" in raw
doc=fitz.open(stream=data,filetype="pdf")
doc.update_object(297,raw.replace(old,new))
assert doc.xref_get_key(297,"JS")[1]==original_js.replace(old,new)
pdf=out/"CDQ_Intermediaire_Essai_Fonctionnel_V21.pdf"
doc.save(str(pdf),garbage=0,deflate=True,clean=False)
doc.close()
v21=fitz.open(str(pdf))
assert v21.page_count==src.page_count and v21.xref_length()==src.xref_length()
assert v21.xref_get_key(297,"JS")[1]==original_js.replace(old,new)
assert v21[0].get_text(sort=False)==src[0].get_text(sort=False)
assert len(list(v21[0].widgets() or []))==180
changed=[i for i in range(1,src.xref_length()) if src.xref_object(i,compressed=False)!=v21.xref_object(i,compressed=False)]
assert changed==[297],changed
assert src[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).samples==v21[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).samples
Path("/tmp/cdq-plancher-v21-native.js").write_text(v21.xref_get_key(297,"JS")[1],encoding="utf-8")
report={"result":"pdf_structure_passed","baseline_version":"V20","baseline_sha256":sha(data),
  "output_sha256":sha(pdf.read_bytes()),"output_bytes":pdf.stat().st_size,
  "page_count":v21.page_count,"all_180_widgets_unchanged":True,
  "modified_xrefs":changed,"static_render_identical":True,
  "change":"Only independent pointState from the measured corner versus charge and existing tolerance",
  "unchanged":"Group bloc4 state, phase, missing values, other blocks, arrows graphics, all other PDF scripts"}
(out/"qa-v21.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(report,ensure_ascii=False,indent=2))
