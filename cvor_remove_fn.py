#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find start/end of renderCvorAnalysisRow
fn_start = next(i for i, l in enumerate(lines) if 'const renderCvorAnalysisRow' in l)
# End is the '        };' that closes it (line 5018 = index 5017)
fn_end = next(i for i in range(fn_start + 1, len(lines)) if lines[i].strip() == '};')
print(f"Removing renderCvorAnalysisRow: lines {fn_start+1}–{fn_end+1}")

new_lines = lines[:fn_start] + lines[fn_end+1:]

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Done. {len(lines)} → {len(new_lines)} lines")
