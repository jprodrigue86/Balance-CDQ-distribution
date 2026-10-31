from __future__ import annotations
import fitz, re, hashlib, json
from pathlib import Path
p=Path("essais-plancher-v19-largeurs-20261031/CDQ_Plancher_Essai_Fonctionnel_V19.pdf")
blob=p.read_bytes()
assert hashlib.sha256(blob).hexdigest()=="f1a79665f0005d1ca0fd5136d0cbce9b37eec8d93bee721c8fa8071c3177f92b"
d=fitz.open(stream=blob,filetype="pdf")
pg=d[0]
report={"source_sha256":hashlib.sha256(blob).hexdigest(),"pages":len(d),"header_words":[],"widgets":[],"xobjects":[],"images":[],"fonts":[]}
for w in pg.get_text("dict")["blocks"]:
  if w["type"]==0:
    for l in w["lines"]:
      for s in l["spans"]:
        if s["bbox"][1]<400:
          report["header_words"].append({k:s[k] for k in ["text","font","size","flags","color","bbox","origin"]})
for w in pg.widgets() or []:
  if "type_balance" in (w.field_name or "").lower() or "coin_charge_point_1_avant_correction" in (w.field_name or "") or "charge_point_1_avant_correction" in (w.field_name or ""):
    report["widgets"].append({"field_name":w.field_name,"value":w.field_value,"xref":w.xref,"rect":list(w.rect),"field_type":w.field_type_string,"flags":w.field_flags,"font":w.text_font,"fontsize":w.text_fontsize,"text_color":w.text_color,"xref_obj":d.xref_object(w.xref,compressed=False)[:1800]})
for x in pg.get_xobjects():
  xref,name,invoker,bbox=x
  xx=d.xref_object(xref,compressed=False)
  item={"name":name,"xref":xref,"invoker":invoker,"bbox":list(bbox),"dict":xx[:650]}
  try:
    stream=d.xref_stream(xref)
    item["stream_len"]=len(stream)
    item["stream_head"]=stream[:300].decode("latin-1","replace")
    item["has_plancher_ascii"]=b"PLANCHER" in stream
    item["has_plancher_hex"]=b"504c414e43484552" in stream
  except Exception as e:item["stream_error"]=str(e)
  report["xobjects"].append(item)
for im in pg.get_images(full=True):
  xref=im[0]
  report["images"].append({"xref":xref,"info":list(im)[:7],"object":d.xref_object(xref,compressed=False)[:600]})
for ff in pg.get_fonts(full=True):
  report["fonts"].append({"xref":ff[0],"info":list(ff)[:5]})
print(json.dumps(report,ensure_ascii=False,indent=2))
