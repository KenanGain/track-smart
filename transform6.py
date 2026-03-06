"""
transform6.py
Replace the overview section in the main app with the one from the older SafetyAnalysisPage.tsx.
Also add missing imports to the main app file.
"""

# ── Read old file and extract overview JSX ──────────────────────────────────
with open('SafetyAnalysisPage.tsx', 'r', encoding='utf-8') as f:
    old_lines = f.readlines()

# Lines 1354–2988 (1-indexed) → 0-indexed: 1353:2988
# The section starts with:  {pageTab === 'overview' && <>
# The section ends with:    </>}
overview_body = ''.join(old_lines[1353:2988])
print("Old overview extracted, chars:", len(overview_body))
print("Starts:", overview_body[:80])
print("Ends:  ", overview_body[-60:])

# ── Read main app file ───────────────────────────────────────────────────────
with open('src/pages/safety-analysis/SafetyAnalysisPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Add missing imports ───────────────────────────────────────────────────
# Need: VIOLATION_DATA, SAFETY_EVENTS_RESULTS, ChevronDown, Eye, Filter, MapPin
# Check which are missing

if 'VIOLATION_DATA' not in content:
    content = content.replace(
        "import { SAFETY_EVENTS_RESULTS }",
        "import { VIOLATION_DATA } from '@/data/violations.data';\nimport { SAFETY_EVENTS_RESULTS }"
    )
    print("Added VIOLATION_DATA import")

if "import { SAFETY_EVENTS_RESULTS }" not in content:
    content = content.replace(
        "import {\n  TrendingUp,",
        "import { SAFETY_EVENTS_RESULTS } from '../safety-events/SafetyEventsPage';\nimport {\n  TrendingUp,"
    )
    print("Added SAFETY_EVENTS_RESULTS import")

# Add missing lucide icons
missing_icons = []
for icon in ['ChevronDown', 'Eye', 'Filter', 'MapPin', 'Download']:
    if icon not in content:
        missing_icons.append(icon)

if missing_icons:
    # Add them to the lucide import block
    content = content.replace(
        '  ChevronLeft,\n  LayoutGrid,\n  List,\n} from \'lucide-react\';',
        '  ChevronLeft,\n  LayoutGrid,\n  List,\n  ' + ',\n  '.join(missing_icons) + ',\n} from \'lucide-react\';'
    )
    print(f"Added missing icons: {missing_icons}")

# ── 2. Add violation constants before the main component ────────────────────
if 'HOS_VIOLATIONS' not in content:
    insert_before = "// ===== MAIN PAGE ====="
    violation_consts = """// ===== VIOLATION CATEGORY CONSTANTS =====
const HOS_VIOLATIONS = VIOLATION_DATA.categories['hours_of_service']?.items ?? [];
const DRIVER_FITNESS_VIOLATIONS = VIOLATION_DATA.categories['driver_fitness']?.items ?? [];
const UNSAFE_DRIVING_VIOLATIONS = VIOLATION_DATA.categories['unsafe_driving']?.items ?? [];

"""
    content = content.replace(insert_before, violation_consts + insert_before)
    print("Added violation constants")

# ── 3. Replace the overview section ─────────────────────────────────────────
OLD_OVERVIEW_START = "        {pageTab === 'overview' && (\n          <>"
OLD_OVERVIEW_END_MARKER = "          </>\n        )}"

if OLD_OVERVIEW_START in content and OLD_OVERVIEW_END_MARKER in content:
    start_idx = content.index(OLD_OVERVIEW_START)
    end_idx = content.index(OLD_OVERVIEW_END_MARKER) + len(OLD_OVERVIEW_END_MARKER)
    content = content[:start_idx] + overview_body.rstrip() + '\n' + content[end_idx:]
    print("Overview section replaced OK")
else:
    print(f"FAILED: OLD_OVERVIEW_START found={OLD_OVERVIEW_START in content}, OLD_OVERVIEW_END found={OLD_OVERVIEW_END_MARKER in content}")

# ── Write result ─────────────────────────────────────────────────────────────
with open('src/pages/safety-analysis/SafetyAnalysisPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

lines = content.count('\n') + 1
print(f"Done. Lines: {lines}")
