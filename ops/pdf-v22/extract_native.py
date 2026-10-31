from pathlib import Path
import hashlib
import fitz
p=Path("essais-plancher-v22-echelon-20261031/CDQ_Intermediaire_Essai_Fonctionnel_V22.pdf")
b=p.read_bytes()
assert hashlib.sha256(b).hexdigest()=="7760dbbfd1265f21c7085f0fced744186a24b1fe1442d20c651fa1b01fd98afd"
doc=fitz.open(stream=b,filetype="pdf")
assert doc.page_count==1
widgets=list(doc[0].widgets() or [])
assert len(widgets)==180
e=next(w for w in widgets if w.field_name=="essai_cdq_echelon")
assert e.field_flags==0 and e.field_type_string=="Text"
assert "/V 84 0 R" in doc.xref_object(e.xref,compressed=False)
assert doc.xref_get_key(297,"JS")[0]=="string"
Path("/tmp/cdq-v22-native-calculations.js").write_text(doc.xref_get_key(297,"JS")[1],encoding="utf-8")
print("PASS native PDF unchanged, editable échelon field and original calculations")
