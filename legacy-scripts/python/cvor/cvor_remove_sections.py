#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find boundaries (0-indexed)
def find_line(text, start=0):
    for i in range(start, len(lines)):
        if text in lines[i]:
            return i
    return -1

# 1. Remove [7+8] CATEGORY DETAIL ACCORDION (lines 6322–6340 in 1-indexed)
accordion_start = find_line('{/* ── [7+8] CATEGORY DETAIL ACCORDION ── */}')
# The accordion block closes at the </div> before KPI CARDS
kpi_cards_start = find_line('{/* ── KPI CARDS ── */}', accordion_start)
print(f"Accordion: {accordion_start+1} → {kpi_cards_start} (removing up to KPI CARDS)")

# 2. Remove CVOR SECTION 1 (percentile formula card)
sec1_start = find_line('{/* ===== CVOR SECTION 1: CATEGORY SUMMARY BAR (SMS-STYLE) ===== */}')
sec2_start = find_line('{/* ===== CVOR SECTION 2: VIOLATION SUMMARY CHARTS ===== */}')
print(f"CVOR SECTION 1: {sec1_start+1} → {sec2_start} (removing)")

# 3. Remove CVOR SECTION 2 (BASIC Summary bar + percentile cards)
sec3_start = find_line('{/* ===== CVOR SECTION 3: METRICS BY PROVINCE ===== */}')
# Section 2 ends just before section 3 — find the enclosing </div></div> lines before sec3
# The section 2 closes with two </div> then blank line before SECTION 3 comment
sec2_end = sec3_start  # start of section 3 — keep section 3
# But we also need to remove the wrapping </div></div> that are part of section 2
# Let's check the lines just before sec3
# Lines 6764-6766 are: </div>, </div>, blank line  — these close section 2's outer containers
# We need to keep them if they close the CVOR Performance Dashboard wrapper
# Actually find the last </div> lines before sec3 that are part of section 2

# Looking at structure: section 2 IIFE returns <>...</> so the actual wrapping is the <>
# The lines just before sec3_start are: </div> (line 6765), blank (6766)
# These close the grid inside the section 2 return
# We'll remove from sec2_start to the line before sec3_start (keeping sec3 opening comment)
print(f"CVOR SECTION 2: {sec2_start+1} → {sec3_start} (removing)")

# Build new lines array:
# Keep: lines[:accordion_start]  (everything before accordion)
# Skip: accordion_start to kpi_cards_start-1  (accordion block)
# Keep: lines[kpi_cards_start:sec1_start]  (KPI cards + whatever between)
# Skip: sec1_start to sec2_start  (section 1)
# Skip: sec2_start to sec3_start  (section 2)
# Keep: lines[sec3_start:]  (section 3 onwards)

new_lines = (
    lines[:accordion_start]
    + lines[kpi_cards_start:sec1_start]
    + lines[sec3_start:]
)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Done. Lines: {len(lines)} → {len(new_lines)}")
