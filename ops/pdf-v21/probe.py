#!/usr/bin/env python3
"""Inspect native V20 PDF excentricity field controls, AP and scripts (read-only)."""
import fitz,json,hashlib,re
from pathlib import Path
pdf_path=Path("essais-plancher-v20-intermediaire-focus-20261031/CDQ_Plancher_Essai_Fonctionnel_V20.pdf")
data=pdf_path.read_bytes()
assert hashlib.sha256(data).hexdigest()=="a4c242bae61deed77fc78cce02e8fe67c7c01bdfecb184a127ffede56f8030ff"
doc=fitz.open(stream=data,filetype="pdf")
page=doc[0]
out={"sha256":hashlib.sha256(data).hexdigest(),"widgets":[],"javascript":[],"arrow_vectors":[],"graphics":[]}
for w in page.widgets() or []:
 if not any(k in (w.field_name or "").lower() for k in ["excentric","coin","fleche","arrow","bloc4","echelon"]):continue
 d={"name":w.field_name,"xref":w.xref,"type":w.field_type_string,"value":str(w.field_value),"flags":w.field_flags,
    "rect":[round(float(x),4) for x in w.rect],"object":doc.xref_object(w.xref,compressed=False)[:4000]}
 _,ref=doc.xref_get_key(w.xref,"AP/N")
 d["appearance_ref"]=ref
 if ref.endswith(" R"):
  try:
   ax=int(ref.split()[0]);d["appearance_head"]=doc.xref_stream(ax).decode("latin-1")[:2200]
  except Exception as e:d["appearance_error"]=str(e)
 out["widgets"].append(d)
for xref in range(1,doc.xref_length()):
 obj=doc.xref_object(xref,compressed=False)
 if not("/JavaScript" in obj or "/JS" in obj or "excentric" in obj.lower() or "fleche" in obj.lower() or "arrow" in obj.lower()):
  continue
 if "/JS" in obj or "/JavaScript" in obj:
  typ,v=doc.xref_get_key(xref,"JS")
  b=""
  if typ=="string":b=v
  elif typ=="xref":
   jx=int(v.split()[0])
   try:b=doc.xref_stream(jx).decode("latin-1",errors="replace")
   except:b=doc.xref_object(jx,compressed=False)
  else:b=obj
  out["javascript"].append({"xref":xref,"obj":obj[:1200],"js_type":typ,"js_content":b[:30000]})
for xref in page.get_contents():
 t=doc.xref_stream(xref).decode("latin-1")
 if " re " in t or "c\n" in t:
  out["graphics"].append({"xref":xref,"len":len(t),"head":t[:2000],
    "excentric_section":t[t.find("ESSAI DE CHARGE EXCENTRIQUE")-300:t.find("ESSAI DE CHARGE EXCENTRIQUE")+2500] if "ESSAI DE CHARGE EXCENTRIQUE" in t else ""})
report=Path("essais-plancher-v21-flèches-20261031")
report.mkdir(exist_ok=True)
(report/"probe-v20.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
print("PASS V20 PDF",out["sha256"],"widgets matching",len(out["widgets"]),"JS refs",len(out["javascript"]))
print("WIDGETS",[(x["name"],x["value"],x["type"],x["appearance_ref"]) for x in out["widgets"]])
print("JS INDEX",[(x["xref"],len(x["js_content"]),[k for k in ["excentric","coin_charge","arrow","fleche","color"] if k in x["js_content"].lower()]) for x in out["javascript"]])
