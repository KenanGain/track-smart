"""
transform8.py
1. Remove Fleet Analysis donut panel
2. Remove standalone Individual Driver View section
3. Insert the driver detail as an expanding panel INSIDE the Drivers section
"""

with open('src/pages/safety-analysis/SafetyAnalysisPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Remove Fleet Analysis block ───────────────────────────────────────────
FLEET_MARKER = "        {/* ===== FLEET ANALYSIS (shown when no driver selected) ===== */}"
DRIVER_MARKER = "        {/* ===== INDIVIDUAL DRIVER VIEW ===== */}"

if FLEET_MARKER in content and DRIVER_MARKER in content:
    idx_fleet = content.index(FLEET_MARKER)
    idx_driver = content.index(DRIVER_MARKER)
    # Remove everything from FLEET_MARKER up to (but not including) DRIVER_MARKER
    content = content[:idx_fleet] + content[idx_driver:]
    print("Step 1 OK: Fleet Analysis removed")
else:
    print(f"Step 1 FAILED: FLEET={FLEET_MARKER in content}, DRIVER={DRIVER_MARKER in content}")

# ── 2. Extract IIFE block and remove standalone driver section ────────────────
IIFE_OPEN  = "          (() => {\n"
IIFE_CLOSE = "          })()\n        )}\n"
DRIVERS_SECTION_MARKER = "        {/* ===== DRIVERS SECTION: GRID / LIST TOGGLE ===== */}"

if DRIVER_MARKER in content and DRIVERS_SECTION_MARKER in content:
    idx_dv_start = content.index(DRIVER_MARKER)
    idx_ds       = content.index(DRIVERS_SECTION_MARKER)

    # The block between them contains:
    # {selectedDashboardDriverId && (\n          (() => {\n ... \n          })()\n        )}\n\n
    block = content[idx_dv_start:idx_ds]

    # Extract IIFE inner content (everything from after IIFE_OPEN to before IIFE_CLOSE)
    if IIFE_OPEN in block and IIFE_CLOSE in block:
        inner_start = block.index(IIFE_OPEN) + len(IIFE_OPEN)
        inner_end   = block.rindex(IIFE_CLOSE)
        iife_inner = block[inner_start:inner_end]
        print("Step 2a OK: IIFE inner extracted, chars:", len(iife_inner))
    else:
        iife_inner = None
        print("Step 2a FAILED: IIFE markers not found in block")
        print("Block preview:", repr(block[:200]))

    # Remove standalone section (replace with just the drivers marker)
    content = content[:idx_dv_start] + content[idx_ds:]
    print("Step 2b OK: standalone driver section removed")
else:
    iife_inner = None
    print(f"Step 2 FAILED: DRIVER_MARKER={DRIVER_MARKER in content}, DRIVERS={DRIVERS_SECTION_MARKER in content}")

# ── 3. Insert expanding driver detail inside Drivers section ──────────────────
# The drivers section ends its grid/list block with:
#           )}        <- closes {driverView === 'grid' ? ... : ...}
#         </div>      <- closes the outer Drivers div
# followed by:
#         {/* ===== ASSETS SECTION ...

if iife_inner:
    DRIVERS_END = "          )}\n        </div>\n\n        {/* ===== ASSETS SECTION: GRID / LIST TOGGLE ===== */}"

    EXPANDED_BLOCK = (
        "          )}\n"
        "          {/* ===== EXPANDED DRIVER DETAIL ===== */}\n"
        "          {selectedDashboardDriverId && (\n"
        "            (() => {\n"
        + iife_inner
        + "            })()\n"
        "          )}\n"
        "        </div>\n\n"
        "        {/* ===== ASSETS SECTION: GRID / LIST TOGGLE ===== */}"
    )

    if DRIVERS_END in content:
        content = content.replace(DRIVERS_END, EXPANDED_BLOCK, 1)
        print("Step 3 OK: expanding panel inserted inside Drivers section")
    else:
        print("Step 3 FAILED: DRIVERS_END pattern not found")
        idx = content.find("ASSETS SECTION")
        if idx > -1:
            print("Context:", repr(content[idx-300:idx+50]))

with open('src/pages/safety-analysis/SafetyAnalysisPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

lines = content.count('\n') + 1
print(f"Done. Lines: {lines}")
