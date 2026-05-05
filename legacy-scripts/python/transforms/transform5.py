"""
transform5.py
Restore Safety Dashboard / Overview toggle.
- Add pageTab state
- Add toggle buttons to header Row 1
- Wrap current dashboard in {pageTab === 'dashboard' && (...)}
- Insert old Overview content wrapped in {pageTab === 'overview' && (...)}
"""

import re

with open('src/pages/safety-analysis/SafetyAnalysisPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Add pageTab state after the existing state declarations ──────────────
OLD_STATE = "  const [impactView, setImpactView] = useState<'negative' | 'positive'>('negative');"
NEW_STATE = """  const [pageTab, setPageTab] = useState<'dashboard' | 'overview'>('dashboard');
  const [impactView, setImpactView] = useState<'negative' | 'positive'>('negative');"""

if OLD_STATE in content:
    content = content.replace(OLD_STATE, NEW_STATE, 1)
    print("Step 1 OK: pageTab state added")
else:
    print("Step 1 SKIPPED: already present or not found")

# ── 2. Add toggle Row 1 in header (before Row 2 action buttons) ─────────────
OLD_HEADER = """          {/* Right — two stacked rows, right-aligned */}
          <div className="flex flex-col items-end gap-3 flex-shrink-0">


            {/* Row 2 — action buttons (aligns with subtitle) */}"""

NEW_HEADER = """          {/* Right — two stacked rows, right-aligned */}
          <div className="flex flex-col items-end gap-3 flex-shrink-0">

            {/* Row 1 — Safety Dashboard / Overview toggle */}
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
            </div>

            {/* Row 2 — action buttons (aligns with subtitle) */}"""

if OLD_HEADER in content:
    content = content.replace(OLD_HEADER, NEW_HEADER, 1)
    print("Step 2 OK: toggle added to header")
else:
    print("Step 2 FAILED: header row pattern not found")

# ── 3. Wrap dashboard content ───────────────────────────────────────────────
DASH_START = "        {/* ===== KPI BANNER ===== */}"
DASH_END   = "        {/* ===== ASSET DETAIL POPUP ===== */}"

if DASH_START in content and DASH_END in content:
    idx_start = content.index(DASH_START)
    idx_end   = content.index(DASH_END)
    # Find the closing tag of the Asset Detail Popup block
    # It ends with: "        )}\n\n      </div>\n    </div>\n  );\n}"
    # We want to wrap everything from DASH_START through the last )} before </div></div>
    # Find the closing )} of the asset popup block
    # It's at the end: "        )}\n\n      </div>"
    popup_close = "        )}\n\n      </div>\n    </div>\n  );\n}"
    if popup_close in content:
        idx_popup_close = content.rindex(popup_close)
        # Wrap: insert opening conditional before DASH_START, close after asset popup
        before = content[:idx_start]
        dashboard_block = content[idx_start:idx_popup_close]
        after = content[idx_popup_close:]
        content = (
            before
            + "        {pageTab === 'dashboard' && (\n          <>\n"
            + dashboard_block
            + "          </>\n        )}\n"
            + after
        )
        print("Step 3 OK: dashboard wrapped in conditional")
    else:
        print("Step 3 FAILED: popup close pattern not found")
else:
    print(f"Step 3 FAILED: KPI BANNER={DASH_START in content}, ASSET POPUP={DASH_END in content}")

# ── 4. Insert Overview content before the closing </div></div> of the page ──
# The old overview JSX (Safety Overview card + TABS + CONTENT) comes from old commit
OVERVIEW_JSX = r"""        {pageTab === 'overview' && (
          <>
        {/* ===== SAFETY OVERVIEW CARD ===== */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6">
          {/* Title */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 text-center">Safety Overview</h2>
          </div>

          {/* Fleet Safety Score + Rating Row */}
          <div className="flex items-center justify-between px-8 py-3 border-b border-slate-100">
            <div>
              <span className="text-sm text-slate-600 font-medium">Fleet Safety Score: </span>
              <span className={`text-sm font-bold ${getScoreColor(FLEET_SAFETY_SCORES.fleetSafetyScore)}`}>
                {FLEET_SAFETY_SCORES.fleetSafetyScore.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-sm text-slate-600 font-medium">Fleet Safety Rating: </span>
              <span className={`text-sm ${getRatingStyle(FLEET_SAFETY_SCORES.fleetSafetyRating)}`}>
                {FLEET_SAFETY_SCORES.fleetSafetyRating}
              </span>
            </div>
          </div>

          {/* 6 Sub-Scores: 3 across x 2 rows */}
          <div className="grid grid-cols-3 gap-y-3 gap-x-4 px-8 py-4">
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">Accident Score</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.accidentScore)}`}>{FLEET_SAFETY_SCORES.accidentScore.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">ELD Score</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.eldScore)}`}>{FLEET_SAFETY_SCORES.eldScore.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">Inspection Score</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.inspectionScore)}`}>{FLEET_SAFETY_SCORES.inspectionScore.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">Driver Score:</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.driverScore)}`}>{FLEET_SAFETY_SCORES.driverScore.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">VEDR Score:</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.vedrScore)}`}>{FLEET_SAFETY_SCORES.vedrScore.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">Roadside Violation Score:</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.roadsideViolationScore)}`}>{FLEET_SAFETY_SCORES.roadsideViolationScore.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        {/* ===== TABS + CONTENT CARD ===== */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200 px-4">
            <div className="flex gap-0">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Scoring Overview ── */}
          {activeTab === 'scoring' && (
            <div className="p-6">
              <h2 className="text-base font-bold text-slate-900 mb-3">Overview of Scoring Types</h2>
              <p className="text-sm text-slate-600 mb-4">
                Maintaining high safety and operational standards is crucial. To assess and monitor these aspects, S.A.F.E. utilizes a combination of
                scoring types to determine the overall safety health of an operation. Here's a general overview of the key scoring types used by S.A.F.E.:
              </p>
              {[
                {
                  title: 'Fleet Safety Score and Safety Rating:',
                  bullets: [
                    { label: 'Purpose:', text: 'Provides a comprehensive view of the company\'s overall safety health.' },
                    { label: 'Calculation:', text: 'Based on a proprietary model, this score considers factors such as accidents, driver behaviors, roadside inspections and violations, and telematic events (ELD and VEDR events).' },
                  ],
                },
                {
                  title: 'Accident Score:',
                  bullets: [
                    { label: 'Purpose:', text: 'Measures the impact and frequency of accidents.' },
                    { label: 'Calculation:', text: 'Counts the total number of accidents in the last 12 months, including those deemed non-preventable, and uses a proprietary model to assess the frequency against a fleet\'s total active trucks.' },
                  ],
                },
                {
                  title: 'Driver Score:',
                  bullets: [
                    { label: 'Purpose:', text: 'Assesses the safety performance of active drivers.' },
                    { label: 'Calculation:', text: 'The average of all active driver scores. Each individual driver score is based on their accident history, violations, inspections, and telematic event data (e.g., harsh braking, speeding).' },
                  ],
                },
                {
                  title: 'VEDR Score:',
                  bullets: [
                    { label: 'Purpose:', text: 'Evaluates the fleet\'s Video Event Data Recorder compliance and review rate.' },
                    { label: 'Calculation:', text: 'Considers VEDR camera uptime, the percentage of triggered events that have been reviewed, and the severity/frequency of detected events across the fleet.' },
                  ],
                },
                {
                  title: 'ELD Score:',
                  bullets: [
                    { label: 'Purpose:', text: 'Monitors Electronic Logging Device compliance.' },
                    { label: 'Calculation:', text: 'Evaluates ELD malfunction rates, unassigned driving time, data transfer compliance, and overall Hours of Service (HOS) adherence across all active drivers.' },
                  ],
                },
                {
                  title: 'Inspection Score:',
                  bullets: [
                    { label: 'Purpose:', text: 'Measures the fleet\'s roadside inspection performance.' },
                    { label: 'Calculation:', text: 'Clean inspection rate across all roadside inspections in the scoring period (last 24 months), weighted by inspection level and recency.' },
                  ],
                },
                {
                  title: 'Roadside Violation Score:',
                  bullets: [
                    { label: 'Purpose:', text: 'Tracks the rate of roadside violations including Out-of-Service orders.' },
                    { label: 'Calculation:', text: 'Based on violation counts and severity, with OOS violations carrying heavier penalties. Scores improve as violation rates decrease relative to fleet exposure.' },
                  ],
                },
              ].map(section => (
                <div key={section.title} className="mb-4">
                  <p className="text-sm font-semibold text-slate-800 mb-1">{section.title}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {section.bullets.map(b => (
                      <li key={b.label} className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-700">{b.label}</span>{' '}
                        <span className={b.label === 'Purpose:' ? 'text-blue-600' : ''}>{b.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* ── Incidents ── */}
          {activeTab === 'incidents' && (
            <div>
              {/* Incident Overview Banner */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl mx-4 mt-4 px-6 py-4">
                <div className="grid grid-cols-3 divide-x divide-blue-200 mb-3">
                  <div className="text-center pr-6">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Preventable Accidents — Last 12 Months</div>
                    <div className="text-4xl font-black text-blue-700">{COMPUTED_INCIDENT_STATS.preventableCount}</div>
                    <div className="text-xs text-slate-500 mt-1">of {INCIDENTS.length} total accidents</div>
                  </div>
                  <div className="text-center px-6">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Power Units</div>
                    <div className="text-4xl font-black text-blue-700">{COMPUTED_INCIDENT_STATS.activePowerUnits}</div>
                    <div className="text-xs text-slate-500 mt-1">units in service</div>
                  </div>
                  <div className="text-center pl-6">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Preventable Accident Rate</div>
                    <div className="text-4xl font-black text-blue-700">{COMPUTED_INCIDENT_STATS.preventableRate}%</div>
                    <div className="text-xs text-slate-500 mt-1">fleet-wide this period</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full border-2 border-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700 italic">{COMPUTED_INCIDENT_STATS.fleetMessage}</p>
                </div>
                <p className="text-xs text-slate-600">
                  Be sure to review the accidents below for accuracy. If any accidents below were non-preventable, be sure to challenge
                  the ruling to remove that accident from your score calculation.{' '}
                  <span className="text-blue-600">If you need assistance challenging an accident, please contact us.</span>
                </p>
              </div>

              {/* Filters row */}
              <div className="flex items-center gap-3 px-4 mt-4">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Search incident ID, driver, city, asset..."
                    value={incidentSearch}
                    onChange={e => setIncidentSearch(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={incidentTypeFilter}
                  onChange={e => setIncidentTypeFilter(e.target.value)}
                >
                  {INCIDENT_FILTER_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">{filteredIncidents.length} Records Found</span>
              </div>

              {/* Incidents Table */}
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider w-4"><input type="checkbox" className="rounded" /></th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Incident ID</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Incident Date</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Person Involved</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">City</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">State</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Incident Type</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Docs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.map(inc => {
                      const type = inc.severity.fatalities > 0 ? 'FATALITY' : inc.severity.towAway ? 'TOW AWAY' : 'ACCIDENT';
                      const typeColor = type === 'FATALITY' ? 'bg-red-100 text-red-700' : type === 'TOW AWAY' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700';
                      const dateStr = inc.date ? new Date(inc.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—';
                      const hasDoc = Math.floor(Math.abs(Math.sin(inc.incidentId.length * 7.13 + 1.5) * 9)) % 3 === 0;
                      const docCount = hasDoc ? Math.floor(Math.abs(Math.sin(inc.incidentId.length * 3.7) * 9)) % 5 + 1 : 0;
                      return (
                        <tr key={inc.incidentId} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedIncidentId(inc.incidentId)}>
                          <td className="px-4 py-3"><input type="checkbox" className="rounded" onClick={e => e.stopPropagation()} /></td>
                          <td className="px-4 py-3 text-blue-600 font-medium">{inc.incidentId}</td>
                          <td className="px-4 py-3 text-slate-700">{dateStr}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{inc.driver.name}</td>
                          <td className="px-4 py-3 text-slate-700">{inc.location.city}</td>
                          <td className="px-4 py-3 text-slate-700">{inc.location.stateProvince}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${typeColor}`}>{type}</span></td>
                          <td className="px-4 py-3 text-slate-400">{docCount > 0 ? <span className="flex items-center gap-1"><FileText size={13} className="text-slate-400" />{docCount}</span> : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Incident Detail Popup */}
              {selectedIncident && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedIncidentId(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{selectedIncident.incidentId}</h3>
                        <p className="text-xs text-slate-500">Incident Detail</p>
                      </div>
                      <button onClick={() => setSelectedIncidentId(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} className="text-slate-500" /></button>
                    </div>
                    <div className="p-5 space-y-2 text-sm">
                      {[
                        ['Driver', selectedIncident.driver.name],
                        ['Date', selectedIncident.date ? new Date(selectedIncident.date).toLocaleDateString() : '—'],
                        ['Location', `${selectedIncident.location.city}, ${selectedIncident.location.stateProvince}`],
                        ['Tow Away', selectedIncident.severity.towAway ? 'Yes' : 'No'],
                        ['Fatalities', String(selectedIncident.severity.fatalities)],
                        ['Injuries', String(selectedIncident.severity.injuriesNonFatal)],
                        ['Hazmat', selectedIncident.severity.hazmatReleased ? 'Yes' : 'No'],
                        ['Preventable', selectedIncident.preventable ? 'Yes' : 'No'],
                        ['Claim #', selectedIncident.insuranceClaimNumber || '—'],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0">
                          <span className="text-slate-500 font-medium">{label}</span>
                          <span className="text-slate-900 font-semibold">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Drivers ── */}
          {activeTab === 'drivers' && (
            <div>
              {/* Driver Stats Banner */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl mx-4 mt-4 px-6 py-4">
                <div className="grid grid-cols-3 divide-x divide-blue-200 mb-3">
                  <div className="text-center pr-6">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Driver Safety Score</div>
                    <div className="text-4xl font-black text-blue-700">{FLEET_SAFETY_SCORES.driverScore.toFixed(2)}%</div>
                    <div className="text-xs text-slate-500 mt-1">fleet-wide score</div>
                  </div>
                  <div className="text-center px-6">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Number of Active Drivers</div>
                    <div className="text-4xl font-black text-blue-700">{NUM_ACTIVE_DRIVERS}</div>
                    <div className="text-xs text-slate-500 mt-1">currently active</div>
                  </div>
                  <div className="text-center pl-6">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Drivers Below Fleet Average</div>
                    <div className="text-4xl font-black text-blue-700">{LOWEST_DRIVERS.length}<span className="text-xl text-slate-500">/{NUM_ACTIVE_DRIVERS}</span></div>
                    <div className="text-xs text-slate-500 mt-1">focus group this month</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full border-2 border-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700 italic">The report below shows the bottom 50% of your fleet's active drivers. Use this list to focus attention and training towards these drivers to improve.</p>
                </div>
                <p className="text-sm text-slate-600">
                  The driver safety score factors in multiple sub-scores, as outlined below. Based on the percentages below, a driver may be able to show quick improvement in a few areas.
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-600">
                  <li>To raise the inspection score, the driver can request additional roadside inspections. If the inspections come back clean, the inspection score will rise.</li>
                  <li>To raise the training score, the driver can complete their required training by any assigned due dates. On time training can raise the training score.</li>
                  <li>As a reminder, ELD and VEDR scores for drivers reset on the first day of each month.</li>
                </ul>
              </div>

              {/* Lowest / Highest sub-tabs */}
              <div className="flex items-center gap-4 px-4 mt-4">
                <button onClick={() => setDriverSubTab('lowest')} className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${driverSubTab === 'lowest' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                  Lowest Drivers ({LOWEST_DRIVERS.length})<div className="text-[10px] font-normal text-slate-400">Below Fleet Average</div>
                </button>
                <button onClick={() => setDriverSubTab('highest')} className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${driverSubTab === 'highest' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                  Highest Drivers ({HIGHEST_DRIVERS.length})<div className="text-[10px] font-normal text-slate-400">Above Fleet Average</div>
                </button>
              </div>

              {/* Drivers Table */}
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Driver</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Driver ID</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Overall</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Accidents</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">ELD</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Inspections</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Violations</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Trainings</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">VEDR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(driverSubTab === 'lowest' ? LOWEST_DRIVERS : HIGHEST_DRIVERS).map(drv => (
                      <tr key={drv.driverId} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedDriverId(drv.driverId)}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{drv.name}</td>
                        <td className="px-4 py-3 text-slate-500">{drv.driverId}</td>
                        <td className={`px-4 py-3 font-bold ${getScoreColor(drv.overall)}`}>{drv.overall.toFixed(2)}%</td>
                        <td className={`px-4 py-3 font-semibold ${getScoreColor(drv.accidents)}`}>{drv.accidents.toFixed(2)}%</td>
                        <td className={`px-4 py-3 font-semibold ${getScoreColor(drv.eld)}`}>{drv.eld.toFixed(2)}%</td>
                        <td className={`px-4 py-3 font-semibold ${getScoreColor(drv.inspections)}`}>{drv.inspections.toFixed(2)}%</td>
                        <td className={`px-4 py-3 font-semibold ${getScoreColor(drv.violations)}`}>{drv.violations.toFixed(2)}%</td>
                        <td className={`px-4 py-3 font-semibold ${drv.trainings === 0 ? 'text-red-600' : getScoreColor(drv.trainings)}`}>{drv.trainings.toFixed(2)}%</td>
                        <td className={`px-4 py-3 font-semibold ${getScoreColor(drv.vedr)}`}>{drv.vedr.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Driver Detail Popup */}
              {selectedDriver && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDriverId(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{selectedDriver.name}</h3>
                        <p className="text-xs text-slate-500">Driver Safety Detail · ID: {selectedDriver.id}</p>
                      </div>
                      <button onClick={() => setSelectedDriverId(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} className="text-slate-500" /></button>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${drvPopupSafetyScore >= 90 ? 'bg-emerald-100 text-emerald-700' : drvPopupSafetyScore >= 80 ? 'bg-blue-100 text-blue-700' : drvPopupSafetyScore >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{drvPopupSafetyLevel}</span>
                        <span className={`text-2xl font-black ${getScoreColor(drvPopupSafetyScore)}`}>{drvPopupSafetyScore.toFixed(2)}%</span>
                      </div>
                      <div className="space-y-2.5">
                        {([
                          { label: 'Safety Score', score: drvPopupSafetyScore },
                          { label: 'Accident Score', score: drvPopupAccidentScore },
                          { label: 'ELD Score', score: drvPopupEldScore },
                          { label: 'Inspection Score', score: drvPopupInspectionScore },
                          { label: 'Violation Score', score: drvPopupViolationScore },
                          { label: 'Training Score', score: drvPopupTrainingScore },
                          { label: 'VEDR Score', score: drvPopupVedrScore },
                        ] as { label: string; score: number }[]).map(s => (
                          <div key={s.label} className="flex items-center gap-3">
                            <div className="w-28 text-xs font-semibold text-slate-600 text-right shrink-0">{s.label}</div>
                            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                              <div className={`h-full rounded-full ${s.score >= 90 ? 'bg-emerald-500' : s.score >= 80 ? 'bg-blue-500' : s.score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.score}%` }} />
                              <div className="absolute inset-0 flex items-center px-2"><span className="text-[9px] font-bold text-white">{s.score.toFixed(1)}%</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ELD/VEDR ── */}
          {activeTab === 'eld-vedr' && (
            <div>
              {/* ELD/VEDR Stats Banner */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl mx-4 mt-4 px-6 py-4">
                <div className="grid grid-cols-3 divide-x divide-blue-200 mb-3">
                  <div className="text-center pr-6">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Valid ELD Events — Last 12 Months</div>
                    <div className="text-4xl font-black text-blue-700">{HOS_VIOLATION_EVENTS.length}</div>
                    <div className="text-xs text-slate-500 mt-1">HOS violations recorded</div>
                  </div>
                  <div className="text-center px-6">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Valid VEDR Events — Last 12 Months</div>
                    <div className="text-4xl font-black text-blue-700">{VEDR_VIOLATION_EVENTS.length}</div>
                    <div className="text-xs text-slate-500 mt-1">VEDR violations recorded</div>
                  </div>
                  <div className="text-center pl-6">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ratio of Drivers with Valid Events</div>
                    <div className="text-4xl font-black text-blue-700">{NUM_ACTIVE_DRIVERS + 3}<span className="text-xl text-slate-500">/{NUM_ACTIVE_DRIVERS}</span></div>
                    <div className="text-xs text-slate-500 mt-1">150% of active drivers</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700 italic">Your ELD and VEDR events require attention. Please review all records below and take action.</p>
                </div>
              </div>

              {/* ELD / VEDR sub-tabs */}
              <div className="flex items-center gap-3 px-4 mt-4">
                {(['ELD', 'VEDR'] as const).map(t => (
                  <button key={t} onClick={() => setEldVedrSubTab(t)} className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors ${eldVedrSubTab === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t}</button>
                ))}
                <span className="text-xs text-slate-400 ml-auto">{eldVedrSubTab === 'ELD' ? `${HOS_VIOLATION_EVENTS.length} of ${HOS_VIOLATION_EVENTS.length} HOS violations` : `${VEDR_VIOLATION_EVENTS.length} of ${VEDR_VIOLATION_EVENTS.length} VEDR violations`}</span>
              </div>

              {eldVedrSubTab === 'ELD' && (
                <div>
                  <div className="px-4 mt-3 mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">ELD</span>
                    <span className="text-sm font-semibold text-slate-800">Hours of Service Violations</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 mb-3">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-44" placeholder="Search driver, code, vehicle..." value={eldSearch} onChange={e => setEldSearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500"><Filter size={12} /> Filter:</div>
                    {[
                      { label: 'All', val: eldStatusFilter, set: setEldStatusFilter, opts: ['All', 'Open', 'Closed'] },
                      { label: 'All', val: eldOosFilter,    set: setEldOosFilter,    opts: ['All', 'OOS', 'Non-OOS'] },
                      { label: 'All', val: eldGroupFilter,  set: setEldGroupFilter,  opts: ['All', 'Logbook', 'Hours of Service', 'ELD Compliance', 'Rest Requirements'] },
                    ].map((f, i) => (
                      <select key={i} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white" value={f.val} onChange={e => f.set(e.target.value)}>
                        {f.opts.map(o => <option key={o}>{o}</option>)}
                      </select>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {['ID', 'Date', 'Driver', 'Vehicle', 'CFR Code', 'Violation', 'Group'].map(h => (
                            <th key={h} className="text-left px-4 py-2 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {HOS_VIOLATION_EVENTS
                          .filter(ev => {
                            const q = eldSearch.toLowerCase();
                            const matchQ = !q || ev.driver.toLowerCase().includes(q) || ev.vehicleId.toLowerCase().includes(q) || ev.cfrCode.toLowerCase().includes(q);
                            const matchGroup = eldGroupFilter === 'All' || ev.group === eldGroupFilter;
                            return matchQ && matchGroup;
                          })
                          .map(ev => (
                            <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedHosEvent(ev)}>
                              <td className="px-4 py-2.5 text-blue-600 font-medium text-xs whitespace-nowrap">{ev.id}</td>
                              <td className="px-4 py-2.5 text-slate-700 text-xs whitespace-nowrap">{ev.date}</td>
                              <td className="px-4 py-2.5 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{ev.driver.split(' ').map((n: string) => n[0]).join('')}</div>
                                  <span className="font-semibold text-slate-900">{ev.driver}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-xs"><span className="border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[11px]">{ev.vehicleId}</span></td>
                              <td className="px-4 py-2.5 text-xs"><span className="border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-mono text-[11px]">{ev.cfrCode}</span></td>
                              <td className="px-4 py-2.5 text-xs text-slate-700 max-w-[200px] truncate">{ev.violation}</td>
                              <td className="px-4 py-2.5 text-xs text-slate-500">{ev.group}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {selectedHosEvent && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedHosEvent(null)}>
                      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                          <h3 className="text-base font-bold text-slate-900">{selectedHosEvent.id} — HOS Violation</h3>
                          <button onClick={() => setSelectedHosEvent(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                        </div>
                        <div className="p-5 space-y-2 text-sm">
                          {[['Driver', selectedHosEvent.driver], ['Date', selectedHosEvent.date], ['Vehicle', selectedHosEvent.vehicleId], ['CFR Code', selectedHosEvent.cfrCode], ['Violation', selectedHosEvent.violation], ['Group', selectedHosEvent.group]].map(([l, v]) => (
                            <div key={l} className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0">
                              <span className="text-slate-500 font-medium">{l}</span>
                              <span className="text-slate-900 font-semibold">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {eldVedrSubTab === 'VEDR' && (
                <div>
                  <div className="px-4 mt-3 mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">VEDR</span>
                    <span className="text-sm font-semibold text-slate-800">VEDR Violations</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 mb-3">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 w-44" placeholder="Search driver, category..." value={vedrSearch} onChange={e => setVedrSearch(e.target.value)} />
                    </div>
                    <select className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white" value={vedrCategoryFilter} onChange={e => setVedrCategoryFilter(e.target.value)}>
                      {['All', 'Hard Braking', 'Speeding', 'Distraction', 'Following Distance', 'Lane Departure'].map(o => <option key={o}>{o}</option>)}
                    </select>
                    <select className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white" value={vedrStatusFilter} onChange={e => setVedrStatusFilter(e.target.value)}>
                      {['All', 'Open', 'Reviewed', 'Closed'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {['ID', 'Date', 'Driver', 'Vehicle', 'Category', 'Severity', 'Status'].map(h => (
                            <th key={h} className="text-left px-4 py-2 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {VEDR_VIOLATION_EVENTS
                          .filter(ev => {
                            const q = vedrSearch.toLowerCase();
                            const matchQ = !q || ev.driver.toLowerCase().includes(q) || ev.category.toLowerCase().includes(q);
                            const matchCat = vedrCategoryFilter === 'All' || ev.category === vedrCategoryFilter;
                            const matchStatus = vedrStatusFilter === 'All' || ev.status === vedrStatusFilter;
                            return matchQ && matchCat && matchStatus;
                          })
                          .map(ev => {
                            const sevColor = ev.severity === 'Critical' ? 'bg-red-100 text-red-700' : ev.severity === 'High' ? 'bg-orange-100 text-orange-700' : ev.severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';
                            const statusColor = ev.status === 'Open' ? 'text-red-600 bg-red-50' : ev.status === 'Reviewed' ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50';
                            return (
                              <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedVedrViolation(ev)}>
                                <td className="px-4 py-2.5 text-purple-600 font-medium text-xs whitespace-nowrap">{ev.id}</td>
                                <td className="px-4 py-2.5 text-slate-700 text-xs whitespace-nowrap">{ev.date}</td>
                                <td className="px-4 py-2.5 text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{ev.driver.split(' ').map((n: string) => n[0]).join('')}</div>
                                    <span className="font-semibold text-slate-900">{ev.driver}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-xs"><span className="border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[11px]">{ev.vehicleId}</span></td>
                                <td className="px-4 py-2.5 text-xs text-slate-700">{ev.category}</td>
                                <td className="px-4 py-2.5 text-xs"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sevColor}`}>{ev.severity}</span></td>
                                <td className="px-4 py-2.5 text-xs"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>{ev.status}</span></td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  {selectedVedrViolation && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedVedrViolation(null)}>
                      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                          <h3 className="text-base font-bold text-slate-900">{selectedVedrViolation.id} — VEDR Violation</h3>
                          <button onClick={() => setSelectedVedrViolation(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                        </div>
                        <div className="p-5 space-y-2 text-sm">
                          {[['Driver', selectedVedrViolation.driver], ['Date', selectedVedrViolation.date], ['Vehicle', selectedVedrViolation.vehicleId], ['Category', selectedVedrViolation.category], ['Severity', selectedVedrViolation.severity], ['Status', selectedVedrViolation.status]].map(([l, v]) => (
                            <div key={l} className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0">
                              <span className="text-slate-500 font-medium">{l}</span>
                              <span className="text-slate-900 font-semibold">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Inspections ── */}
          {activeTab === 'inspections' && (
            <div>
              <div className="px-6 pt-5 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Inspection Overview &mdash; Last 2 Years</h3>
              </div>

              {/* Inspection sub-tabs */}
              <div className="flex items-center gap-2 px-4 mb-4">
                {(['All', 'SMS', 'CVOR'] as const).map(t => (
                  <button key={t} onClick={() => setInspectionJurFilter(t)} className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors ${inspectionJurFilter === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t}</button>
                ))}
                <span className="ml-auto text-xs text-slate-400">{inspectionsData.filter(i => inspectionJurFilter === 'All' || getJurisdiction(i) === inspectionJurFilter).length} total inspections</span>
              </div>

              {/* Inspection Overview Stats */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl mx-4 mb-4 px-6 py-4">
                <h3 className="text-lg font-bold text-slate-900">Inspection Overview &mdash; Last 2 Years</h3>
                {(() => {
                  const filtered = inspectionsData.filter(i => inspectionJurFilter === 'All' || getJurisdiction(i) === inspectionJurFilter);
                  const cleanCount = filtered.filter(i => i.result === 'CLEAN').length;
                  const violationCount = filtered.filter(i => i.result !== 'CLEAN').length;
                  return (
                    <>
                      <div className="grid grid-cols-3 divide-x divide-blue-200 mt-3 mb-3">
                        <div className="text-center pr-6">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Clean Inspections</div>
                          <div className="text-4xl font-black text-blue-700">{cleanCount}</div>
                          <div className="text-xs text-slate-500 mt-1">passed without violations</div>
                        </div>
                        <div className="text-center px-6">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Inspections with Violations</div>
                          <div className="text-4xl font-black text-blue-700">{violationCount}</div>
                          <div className="text-xs text-slate-500 mt-1">requiring follow-up</div>
                        </div>
                        <div className="text-center pl-6">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Inspections</div>
                          <div className="text-4xl font-black text-blue-700">{filtered.length}</div>
                          <div className="text-xs text-slate-500 mt-1">records in view</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 rounded-full border-2 border-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 italic">Your inspection scores look acceptable right now. You can review any inspection records below.</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Inspections Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider w-4"><input type="checkbox" className="rounded" /></th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Inspection ID</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Driver</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">City</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">State</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Level</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionsData
                      .filter(i => inspectionJurFilter === 'All' || getJurisdiction(i) === inspectionJurFilter)
                      .map(insp => {
                        const resultColor = insp.result === 'CLEAN' ? 'bg-emerald-100 text-emerald-700' : insp.result === 'OOS' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                        const levelColor = 'bg-slate-100 text-slate-700';
                        return (
                          <tr key={insp.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedInspectionId(insp.id)}>
                            <td className="px-4 py-3"><input type="checkbox" className="rounded" onClick={e => e.stopPropagation()} /></td>
                            <td className="px-4 py-3 text-blue-600 font-medium text-xs">{insp.id}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs">{insp.date}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900 text-sm">{insp.driver}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs uppercase">{insp.city}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs">{insp.state}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${levelColor}`}>{insp.level}</span></td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${resultColor}`}>{insp.result}</span></td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Inspection Detail Popup */}
              {selectedInspection && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedInspectionId(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{selectedInspection.id}</h3>
                        <p className="text-xs text-slate-500">Inspection Detail</p>
                      </div>
                      <button onClick={() => setSelectedInspectionId(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} className="text-slate-500" /></button>
                    </div>
                    <div className="p-5 space-y-2 text-sm">
                      {[
                        ['Driver', selectedInspection.driver],
                        ['Date', selectedInspection.date],
                        ['City', selectedInspection.city],
                        ['State', selectedInspection.state],
                        ['Level', selectedInspection.level],
                        ['Result', selectedInspection.result],
                        ['Jurisdiction', getJurisdiction(selectedInspection)],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0">
                          <span className="text-slate-500 font-medium">{label}</span>
                          <span className="text-slate-900 font-semibold">{val}</span>
                        </div>
                      ))}
                      {selectedInspection.violations && selectedInspection.violations.length > 0 && (
                        <div className="pt-2">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Violations</div>
                          <div className="space-y-1.5">
                            {selectedInspection.violations.map((v: Record<string, string>, i: number) => (
                              <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-2">
                                <div className="text-xs font-semibold text-red-700">{v.code} — {v.description}</div>
                                {v.oos === 'true' && <div className="text-[10px] text-red-500 font-bold mt-0.5">OUT OF SERVICE</div>}
                                <div className="flex gap-3 mt-1">
                                  {v.unit && <button className="text-[10px] text-blue-600 underline">Download</button>}
                                  {v.unit && <button className="text-[10px] text-blue-600 underline">PDF</button>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
          </>
        )}
"""

# Insert the overview content right before the final closing `      </div>\n    </div>\n  );\n}`
PAGE_END = "      </div>\n    </div>\n  );\n}"
if PAGE_END in content:
    idx = content.rindex(PAGE_END)
    content = content[:idx] + OVERVIEW_JSX + "\n" + content[idx:]
    print("Step 4 OK: overview section inserted")
else:
    print("Step 4 FAILED: page end pattern not found")

with open('src/pages/safety-analysis/SafetyAnalysisPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

lines = content.count('\n') + 1
print(f"Done. Lines: {lines}")
