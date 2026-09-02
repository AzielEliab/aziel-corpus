from __future__ import annotations
import html, io, json, re, zipfile
from pathlib import Path

from xml.sax.saxutils import escape

# Minimal, dependency-free XLSX and PDF writers. They intentionally use a small,# stable subset of each format for long-term reproducibility.
def _col(n: int) -> str:
    s = ""
    while n:
        n, r = divmod(n-1, 26); s = chr(65+r) + s

    return s
def write_xlsx(path: str | Path, sheets: list[tuple[str, list[list[object]]]]) -> Path:
    path = Path(path)
    safe_names=[]
    for name,_ in sheets:
        name=re.sub(r"[\\/*?:\[\]]", "_", name)[:31] or "Sheet"
        base=name; i=2
        while name in safe_names: name=(base[:28]+f"_{i}")[:31]; i+=1
        safe_names.append(name)
    ct=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">','<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>','<Default Extension="xml" ContentType="application/xml"/>','<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>','<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>']
    for i in range(len(sheets)): ct.append(f'<Override PartName="/xl/worksheets/sheet{i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
    ct.append('</Types>')
    rootrels='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    wb='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+''.join(f'<sheet name="{escape(n)}" sheetId="{i+1}" r:id="rId{i+1}"/>' for i,n in enumerate(safe_names))+'</sheets></workbook>'
    wbrels='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join(f'<Relationship Id="rId{i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i+1}.xml"/>' for i in range(len(sheets)))+f'<Relationship Id="rId{len(sheets)+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
    styles='<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F3A44"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'
    def sheet_xml(rows):
        out=['<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>']
        for ri,row in enumerate(rows,1):
            out.append(f'<row r="{ri}">')
            for ci,val in enumerate(row,1):
                ref=f'{_col(ci)}{ri}'; st=' s="1"' if ri==1 else ''
                if isinstance(val,(int,float)) and not isinstance(val,bool): out.append(f'<c r="{ref}"{st}><v>{val}</v></c>')
                else:
                    txt='' if val is None else str(val); txt=escape(txt)
                    out.append(f'<c r="{ref}" t="inlineStr"{st}><is><t xml:space="preserve">{txt}</t></is></c>')
            out.append('</row>')
        if rows and rows[0]: out.append(f'<autoFilter ref="A1:{_col(len(rows[0]))}{max(1,len(rows))}"/>')
        out.append('</sheetData></worksheet>'); return ''.join(out)
    path.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',''.join(ct)); z.writestr('_rels/.rels',rootrels); z.writestr('xl/workbook.xml',wb); z.writestr('xl/_rels/workbook.xml.rels',wbrels); z.writestr('xl/styles.xml',styles)
        for i,(_,rows) in enumerate(sheets,1): z.writestr(f'xl/worksheets/sheet{i}.xml',sheet_xml(rows))

    return path
def write_pdf(path: str | Path, title: str, lines: list[str]) -> Path:
    path=Path(path); page_w,page_h=792,612; margin=36; font=9; leading=12; per=max(1,int((page_h-2*margin-32)/leading)); pages=[]
    clean=[]
    for line in lines:
        line=str(line).replace('\t','    ')
        while len(line)>140: clean.append(line[:140]); line=line[140:]
        clean.append(line)
    for i in range(0,len(clean),per): pages.append(clean[i:i+per])
    if not pages: pages=[[]]
    objs=[]
    def add(b:bytes): objs.append(b); return len(objs)
    font_obj=add(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    page_ids=[]; content_ids=[]
    for pi,plines in enumerate(pages,1):
        content=[b'BT',f'/F1 {font} Tf'.encode(),f'{margin} {page_h-margin-20} Td'.encode()]
        hdr=f'{title} - Page {pi}/{len(pages)}'; all_lines=[hdr,'']+plines
        first=True
        for line in all_lines:
            if not first: content.append(f'0 -{leading} Td'.encode())
            first=False
            esc=line.encode('latin-1','replace').replace(b'\\',b'\\\\').replace(b'(',b'\\(').replace(b')',b'\\)')
            content.append(b'('+esc+b') Tj')
        content.append(b'ET'); stream=b'\n'.join(content); cid=add(f'<< /Length {len(stream)} >>\nstream\n'.encode()+stream+b'\nendstream'); content_ids.append(cid); page_ids.append(None)
    pages_obj_index=len(objs)+1
    # placeholder pages object first, then page objects can reference it
    pages_id=add(b'')
    for i,cid in enumerate(content_ids): page_ids[i]=add(f'<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {page_w} {page_h}] /Resources << /Font << /F1 {font_obj} 0 R >> >> /Contents {cid} 0 R >>'.encode())
    objs[pages_id-1]=f'<< /Type /Pages /Kids [{" ".join(f"{pid} 0 R" for pid in page_ids)}] /Count {len(page_ids)} >>'.encode()
    catalog=add(f'<< /Type /Catalog /Pages {pages_id} 0 R >>'.encode())
    out=io.BytesIO(); out.write(b'%PDF-1.4\n%AZIEL\n'); offsets=[0]
    for i,obj in enumerate(objs,1): offsets.append(out.tell()); out.write(f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n')

    xref=out.tell(); out.write(f'xref\n0 {len(objs)+1}\n'.encode()); out.write(b'0000000000 65535 f \n')
    for off in offsets[1:]: out.write(f'{off:010d} 00000 n \n'.encode())
    out.write(f'trailer\n<< /Size {len(objs)+1} /Root {catalog} 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()); path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(out.getvalue()); return path
