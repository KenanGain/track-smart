"""Dump every page of an Alberta Carrier Profile PDF as plain text.

Usage:
    python dump_pdf.py raw-pdfs/Carry_Freight_19_Dec_2018.pdf > /tmp/dump.txt
"""
import sys
import fitz  # PyMuPDF

if len(sys.argv) != 2:
    sys.stderr.write("usage: dump_pdf.py <pdf>\n"); sys.exit(2)

doc = fitz.open(sys.argv[1])
print(f"PAGES={doc.page_count}")
for i in range(doc.page_count):
    print(f"\n========== PAGE {i+1} ==========")
    print(doc[i].get_text())
