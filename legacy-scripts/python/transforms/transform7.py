"""
transform7.py
1. Replace toggle styling with the old pill-style toggle
2. Remove the duplicate overview section (lines ~3175 to end of file)
"""

with open('src/pages/safety-analysis/SafetyAnalysisPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Replace toggle with pill style ────────────────────────────────────────
OLD_TOGGLE = """            {/* Row 1 — Safety Dashboard / Overview toggle */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden h-8">
              <button
                onClick={() => setPageTab('dashboard')}
                className={`px-4 h-full text-xs font-semibold transition-colors ${pageTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm border-r border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Safety Dashboard
              </button>
              <button
                onClick={() => setPageTab('overview')}
                className={`px-4 h-full text-xs font-semibold transition-colors ${pageTab === 'overview' ? 'bg-white text-slate-900 shadow-sm border-l border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Overview
              </button>
            </div>"""

NEW_TOGGLE = """            {/* Row 1 — page view toggle */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/50 h-10">
              <button
                onClick={() => setPageTab('dashboard')}
                className={`text-sm font-semibold px-5 rounded-lg transition-all ${
                  pageTab === 'dashboard'
                    ? 'bg-white text-blue-700 shadow ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                Safety Dashboard
              </button>
              <button
                onClick={() => setPageTab('overview')}
                className={`text-sm font-semibold px-5 rounded-lg transition-all ${
                  pageTab === 'overview'
                    ? 'bg-white text-blue-700 shadow ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                Overview
              </button>
            </div>"""

if OLD_TOGGLE in content:
    content = content.replace(OLD_TOGGLE, NEW_TOGGLE, 1)
    print("Step 1 OK: toggle replaced with pill style")
else:
    print("Step 1 FAILED: old toggle not found")

# ── 2. Remove duplicate overview section ─────────────────────────────────────
# The duplicate starts at:  "\n\n        {pageTab === 'overview' && (\n          <>\n        {/* ===== SAFETY OVERVIEW CARD ====="
# and ends at the file's final closing:  "      </div>\n    </div>\n  );\n}"
# The first (good) overview ends with: "</>}\n\n"
# The duplicate starts right after that.

GOOD_END = "        </>}\n"
DUPLICATE_START = "\n\n        {pageTab === 'overview' && (\n          <>\n        {/* ===== SAFETY OVERVIEW CARD ===== */}\n"
PAGE_CLOSE = "\n      </div>\n    </div>\n  );\n}"

if GOOD_END in content and DUPLICATE_START in content:
    # Find position of first good end
    idx_good = content.index(GOOD_END) + len(GOOD_END)
    # Find the duplicate start right after
    idx_dup = content.index(DUPLICATE_START, idx_good - 5)
    # Find the page close (last one)
    idx_close = content.rindex(PAGE_CLOSE)

    # Remove everything from idx_dup to idx_close, replace with just PAGE_CLOSE
    content = content[:idx_dup] + PAGE_CLOSE + "\n}"
    print("Step 2 OK: duplicate overview removed")
else:
    print(f"Step 2 FAILED: GOOD_END={GOOD_END in content}, DUPLICATE_START={DUPLICATE_START in content}")
    # Debug: show what's after the first </>}
    if GOOD_END in content:
        idx = content.index(GOOD_END)
        print("After good end:", repr(content[idx:idx+120]))

with open('src/pages/safety-analysis/SafetyAnalysisPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

lines = content.count('\n') + 1
print(f"Done. Lines: {lines}")
