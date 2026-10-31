#!/usr/bin/env python3
"""One-time geometry inspection of the last published CDQ Plancher V18 test (no changes)."""
from __future__ import annotations
import base64
import hashlib
import json
import re
import struct
import zlib
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "essais-plancher-v18-indicateurs-20261030"
OUT = ROOT / "essais-plancher-v19-largeurs-20261031"
OUT.mkdir(exist_ok=True)
HTML = (BASE / "index.html").read_text(encoding="utf-8")
SRC = (ROOT / "essais-conclusion-20261028" / "CDQ_Plancher_Conclusion_Essai_2026-10-28.pdf").read_bytes()

def sha(data):
    return hashlib.sha256(data).hexdigest()

def specs_from_html():
    return {n: (int(size), digest) for n,size,digest in re.findall(r"(SOURCE|V\d+)=\{size:(\d+),sha:'([a-f0-9]{64})'\}",HTML)}

def patch(source, name, a, b):
    if len(source)!=a[0] or sha(source)!=a[1]:
        raise ValueError("Incorrect prior PDF source for "+name)
    if name=="delta10":
        compressed=(BASE/"delta_v9_to_v10.b64").read_text(encoding="ascii")
    else:
        m=re.search(r'<script type="text/plain" id="'+name+r'">([\s\S]*?)</script>',HTML)
        if not m:
            raise ValueError("Missing "+name)
        compressed=m.group(1)
    data=zlib.decompress(base64.b64decode(re.sub(r"\s+","",compressed)))
    if data[:5]!=b"CDQP1":
        raise ValueError("Unexpected patch magic")
    s,t=struct.unpack_from(">II",data,5)
    if s!=a[0] or t!=b[0] or data[13:45].hex()!=a[1] or data[45:77].hex()!=b[1]:
        raise ValueError("Patch metadata mismatch "+name)
    out=bytearray(t)
    pos=77
    dst=0
    while pos<len(data):
        op=data[pos];pos+=1
        if op==0:
            start,n=struct.unpack_from(">II",data,pos);pos+=8
            if start+n>len(source):raise ValueError("Copy out of range")
            out[dst:dst+n]=source[start:start+n]
        elif op==1:
            n=struct.unpack_from(">I",data,pos)[0];pos+=4
            out[dst:dst+n]=data[pos:pos+n];pos+=n
        else:raise ValueError("Unexpected patch op "+str(op))
        dst+=n
    if dst!=len(out) or sha(out)!=b[1]:
        raise ValueError("Target PDF verification failed "+name)
    return bytes(out)

def reconstruct():
    spec=specs_from_html()
    if len(SRC)!=spec["SOURCE"][0] or sha(SRC)!=spec["SOURCE"][1]:
        raise ValueError("Published V18 base source differs from reference")
    cur=SRC
    prev="SOURCE"
    for n in (4,6,9,10,11,12,13,14,15,16,17):
        cur=patch(cur,"delta"+str(n),spec[prev],spec["V"+str(n)])
        prev="V"+str(n)
    return cur,spec

def inspect():
    original,spec=reconstruct()
    doc=fitz.open(stream=original,filetype="pdf")
    page=doc[0]
    fields=[]
    for w in page.widgets() or []:
        name=w.field_name or ""
        if "charge_point_" in name or "bloc3_" in name:
            fields.append({"name":name,"rect":list(map(lambda n:round(n,4),w.rect)),"xref":w.xref,"type":w.field_type_string})
    streams=[]
    seen=set()
    for order,xref in enumerate(page.get_contents()):
        if xref in seen:continue
        seen.add(xref)
        content=doc.xref_stream(xref)
        decoded=content.decode("latin-1",errors="replace")
        lines=decoded.splitlines()
        rows=[line[:250] for line in lines if " re B Q" in line or " Td <" in line or line.startswith("% CDQ")]
        if "Point" in decoded or "506F696E74" in decoded or "charge" in decoded.lower() or "bloc3" in decoded.lower() or "plancher" in decoded.lower():
            streams.append({"xref":xref,"order":order,"bytes":len(content),"prefix":decoded[:160],
                 "row_count":len(rows),"selected_head":rows[:40],"selected_tail":rows[-20:]})
    stream_overview=[]
    for xref in dict.fromkeys(page.get_contents()):
        raw=doc.xref_stream(xref)
        txt=raw.decode("latin-1",errors="replace")
        rectlines=[line[:300] for line in txt.splitlines() if " re " in line or " re" in line]
        positions=[line[:300] for line in txt.splitlines() if " Td " in line or " Tm " in line]
        stream_overview.append({"xref":xref,"bytes":len(raw),"prefix":txt[:1200], "full_content_latin1":txt if xref==4 else None,
            "end":txt[-350:],"rectlines_head":rectlines[:20],"rectlines_tail":rectlines[-15:],
            "text_head":positions[:20],"text_tail":positions[-12:]})
    table_words=[{"word":w[4],"rect":[round(v,2) for v in w[:4]]}
        for w in page.get_text("words") if 365<=w[1]<490]
    table_drawings=[]
    for d in page.get_drawings():
        r=d.get("rect")
        if r and 360<r.y0<490 and r.width<600:
            if d.get("type") in ("fs","s","f"):
                table_drawings.append({"rect":[round(v,2) for v in r],
                    "fill":d.get("fill"),"color":d.get("color"),"width":d.get("width"),"type":d.get("type")})
    report={
        "source":{"v18_final_sha256":sha(original),"bytes":len(original),"expected_sha":spec["V17"][1]},
        "page":{"width":page.rect.width,"height":page.rect.height,"total_widgets":sum(1 for _ in page.widgets() or [])},
        "charge_fields":fields,
        "streams":streams,
        "stream_overview":stream_overview,
        "table_words":table_words,
        "table_drawings":table_drawings[:100],
        "contents_total":len(page.get_contents()),
    }
    (OUT/"inspection-v18.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print("PDF reconstructed and verified:",len(original),"bytes",sha(original))
    print("Charge fields:",len(fields),"content streams:",len(page.get_contents()),"candidate streams:",len(streams))
    for s in streams:print("Candidate stream:",s["xref"],s["bytes"],repr(s["prefix"][:100]))
if __name__=="__main__":
    inspect()
