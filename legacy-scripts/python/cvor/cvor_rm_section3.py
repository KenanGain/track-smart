#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = next(i for i, l in enumerate(lines) if 'CVOR SECTION 3: METRICS BY PROVINCE' in l)
end   = next(i for i, l in enumerate(lines) if 'CVOR Inspection Filters' in l and i > start)

print(f"Removing lines {start+1}–{end} ({end-start} lines)")

new_lines = lines[:start] + lines[end:]

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Done. {len(lines)} → {len(new_lines)} lines")
