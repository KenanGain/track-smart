"""Read the 2019 Carry Freight extracted.json and emit TypeScript const literals
for src/pages/inspections/NscAbPerformanceHistory.tsx.

Output goes to /tmp/ab_perf_history_blocks.ts so we can paste/Edit blocks into
the .tsx file by hand. Frontend types/JSX are NOT touched — only the inline
mock-data values for AB_CONV_*, AB_CVSA_*, AB_COLLISION_*, AB_VIOL_*, AB_MON_*.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

SRC = Path("docs/alberta-extraction-vendor-package-v7/per-pdf/Carrier_Profile_30_Sept_2019/extracted.json")
data = json.loads(SRC.read_text(encoding="utf-8"))
src = data["source"]; car = data["carrier"]; pull = data["pull"]


def s(v):
    """JS string literal."""
    if v is None:
        return "''"
    return repr(str(v)).replace('\\\\', '\\').replace("\\'", "'").replace('"', '\\"').replace("'", "\\'", 0)


def js(v):
    """Best-effort JSON-ish literal."""
    if v is None:
        return "''"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, str):
        # double-quoted with escaping
        esc = v.replace("\\", "\\\\").replace("'", "\\'")
        return f"'{esc}'"
    return json.dumps(v)


out = []
out.append("// ─── AB_CONV_GROUPS ──────────────────────────────────────────────────────────")
out.append("const AB_CONV_GROUPS: AbConvictionGroupRow[] = [")
for r in pull["convictionAnalysis"]:
    pct = (r.get("pctText") or "").strip() or ""
    out.append(f"  {{ group:{js(r['group']):60s}, count:{r['count']:>3}, pct:{js(pct)} }},")
out.append("];")
out.append(f"const AB_CONV_TOTAL = {{ count: {pull['totalConvictions']}, pct: '100%' }};")
out.append("")

out.append("// ─── AB_CONV_SUMMARY ─────────────────────────────────────────────────────────")
out.append("const AB_CONV_SUMMARY: AbConvictionSummaryRow[] = [")
for r in pull["convictionSummary"]:
    out.append(
        f"  {{ seq:{r['seq']:>2}, date:{js(r['date'])}, document:{js(r['document'])}, "
        f"docket:{js(r.get('docket') or '')}, jur:{js(r['jurisdiction'])}, "
        f"vehicle:{js(r.get('vehicle') or '')}, "
        f"driverName:{js(r.get('driverName') or '')}, "
        f"offence:{js(r['offence'])}, pts:{r['points']} }},"
    )
out.append("];")
out.append("")

out.append("// ─── AB_CONV_DETAILS ─────────────────────────────────────────────────────────")
out.append("const AB_CONV_DETAILS: AbConvictionDetailRow[] = [")
for r in pull["convictionDetails"]:
    # ccmtaCode in JSON is "0401 LOG NOT UP TO DATE"; frontend wants just the bare CCMTA + offence text style
    out.append("  {")
    out.append(f"    seq:{r['seq']},")
    out.append(f"    date:{js(r['date'])}, time:{js(r.get('time') or '')}, "
               f"document:{js(r['document'])}, docket:{js(r.get('docket') or '')}, "
               f"jurisdiction:{js(r['jurisdiction'])}, dateEntered:{js(r.get('dateEntered') or '')},")
    out.append(f"    issuingAgency:{js(r.get('issuingAgency') or '')}, location:{js(r.get('location') or '')},")
    out.append(f"    driver:{js(r.get('driver') or '')}, vehicle:{js(r.get('vehicle') or '')}, "
               f"commodity:{js(r.get('commodity') or '')},")
    out.append(f"    actSection:{js(r.get('actSection') or '')}, actDesc:{js(r.get('offence') or '')}, "
               f"ccmtaCode:{js(r.get('ccmtaCode') or '')},")
    out.append(f"    convVehicle:{js(r.get('convictionVehicle') or '')}, "
               f"convDate:{js(r.get('convictionDate') or '')}, activePts:{r['activePoints']},")
    out.append("  },")
out.append("];")
out.append("")

out.append("// ─── AB_CVSA_DEFECTS ─────────────────────────────────────────────────────────")
out.append("const AB_CVSA_DEFECTS: AbCvsaDefectRow[] = [")
for r in pull["cvsaDefectAnalysis"]:
    parts = [f"code:{js(r['code'])}", f"label:{js(r['label'])}"]
    if r.get("oos") is not None:   parts.append(f"oos:{r['oos']}")
    if r.get("req") is not None:   parts.append(f"req:{r['req']}")
    if r.get("total") is not None: parts.append(f"total:{r['total']}")
    if r.get("pctText"):           parts.append(f"pct:{js(r['pctText'])}")
    out.append("  { " + ", ".join(parts) + " },")
out.append("];")
totals = pull["cvsaDefectTotals"]
out.append(f"const AB_CVSA_DEFECT_TOTAL = {{ oos:{totals['oos']}, req:{totals['req']}, "
           f"total:{totals['total']}, pct:'100%' }};")
out.append("")

out.append("// ─── AB_CVSA_SUMMARY ─────────────────────────────────────────────────────────")
out.append("const AB_CVSA_SUMMARY: AbCvsaSummaryRow[] = [")
for r in pull["cvsaSummary"]:
    out.append(
        f"  {{ seq:{r['seq']:>2}, date:{js(r['date'])}, document:{js(r['document'])}, "
        f"jur:{js(r['jurisdiction'])}, agency:{js(r.get('agency') or '')}, "
        f"plate:{js(r.get('plate') or '')}, plateJur:{js(r.get('plateJur') or '')}, "
        f"level:{r['level']}, result:{js(r['result'])} }},"
    )
out.append("];")
out.append("")

out.append("// ─── AB_CVSA_DETAILS ─────────────────────────────────────────────────────────")
out.append("const AB_CVSA_DETAILS: AbCvsaDetailRow[] = [")
for r in pull["cvsaDetails"]:
    out.append("  {")
    out.append(f"    seq:{r['seq']:>2}, date:{js(r['date'])}, time:{js(r.get('time') or '')}, "
               f"document:{js(r['document'])}, jur:{js(r['jurisdiction'])}, level:{r['level']}, "
               f"result:{js(r['result'])}, dateEntered:{js(r.get('dateEntered') or '')},")
    out.append(f"    agency:{js(r.get('agency') or '')}, location:{js(r.get('location') or '')}, "
               f"driver:{js(r.get('driver') or '')},")
    veh_parts = []
    for v in r.get("vehicles", []):
        vp = [f"type:{js(v['type'])}", f"plate:{js(v['plate'])}", f"jur:{js(v['jurisdiction'])}"]
        if v.get("vin"):  vp.append(f"vin:{js(v['vin'])}")
        if v.get("year"): vp.append(f"year:{js(v['year'])}")
        if v.get("make"): vp.append(f"make:{js(v['make'])}")
        if v.get("decal"):vp.append(f"decal:{js(v['decal'])}")
        veh_parts.append("{ " + ", ".join(vp) + " }")
    out.append("    vehicles:[ " + ", ".join(veh_parts) + " ],")
    def_parts = []
    for d in r.get("defects", []):
        dp = f"{{ cat:{js(d['category'])}, vehicle:{d['vehicleIndex']}, kind:{js(d['kind'])} }}"
        def_parts.append(dp)
    out.append("    defects:[ " + ", ".join(def_parts) + " ],")
    out.append("  },")
out.append("];")
out.append("")

# ── Collision ───────────────────────────────────────────────────────────
out.append("// ─── AB_COLLISION_TOTALS ─────────────────────────────────────────────────────")
out.append("const AB_COLLISION_TOTALS: AbCollisionTotalRow[] = [")
for r in pull["collisionTotals"]:
    out.append(f"  {{ type:{js(r['type'])}, count:{r['count']}, "
               f"nonPrev:{r['nonPreventable']}, prevOrNot:{r['preventableOrNotEvaluated']}, pts:{r['points']} }},")
out.append("];")
out.append("")
# (Initial AB_COLLISION_META draft skipped — rebuilt below with proper ab_date helper.)


def r_to_ab_inline(iso):
    if not iso: return ""
    import re
    months = {1:"JAN",2:"FEB",3:"MAR",4:"APR",5:"MAY",6:"JUN",7:"JUL",8:"AUG",9:"SEP",10:"OCT",11:"NOV",12:"DEC"}
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", iso)
    if not m: return iso
    return f"{m.group(1)} {months[int(m.group(2))]} {int(m.group(3)):02d}"


# Replace the broken r_to_ab calls above with inlined text
final_text = "\n".join(out)
import re
def _sub(m):
    iso = m.group(1)
    if not iso: return ""
    return r_to_ab_inline(iso)
# Hack: we used r_to_ab(...) which didn't exist; rebuild that section properly below.

# Rebuild collision/violation/monitoring meta with inline date conversion
def ab_date(iso):
    return r_to_ab_inline(iso) or ""


out2 = ["// ─── COLLISION META / SUMMARY / DETAILS ─────────────────────────────────────",
        "const AB_COLLISION_META = {",
        f"  nscNumber: {js(car['nscNumber'])},",
        f"  carrierName: {js(car.get('legalName') or '')},",
        f"  periodStart: {js(ab_date(src.get('profilePeriodStart')))},",
        f"  periodEnd:   {js(ab_date(src.get('profilePeriodEnd')))},",
        f"  datePrinted: {js(ab_date(src.get('datePrinted')))},",
        "  pages: '1 To 3',",
        "};",
        "",
        "const AB_COLLISION_SUMMARY: AbCollisionSummaryRow[] = ["]
for r in pull["collisionSummary"]:
    out2.append(
        f"  {{ seq:{r['seq']}, date:{js(r['date'])}, document:{js(r['document'])}, "
        f"jur:{js(r['jurisdiction'])}, plate:{js(r.get('plate') or '')}, "
        f"plateJur:{js(r.get('plateJur') or '')}, status:{js(r.get('status') or '')}, "
        f"preventable:{js(r.get('preventable') or '')}, severity:{js(r['severity'])}, "
        f"pts:{r['points']}, driver:{js(r.get('driver') or '')} }},"
    )
out2.append("];")
out2.append("")
out2.append("const AB_COLLISION_DETAILS: AbCollisionDetailRow[] = [")
for r in pull["collisionDetails"]:
    out2.append("  {")
    out2.append(f"    seq:{r['seq']}, date:{js(r['date'])}, time:{js(r.get('time') or '')}, "
                f"document:{js(r['document'])}, jur:{js(r['jurisdiction'])}, "
                f"plate:{js(r.get('plate') or '')}, plateJur:{js(r.get('plateJur') or '')}, "
                f"severity:{js(r['severity'])},")
    out2.append(f"    assessment:{js(r.get('assessment') or '')}, driver:{js(r.get('driver') or '')}, "
                f"location:{js(r.get('location') or '')}, vehicle:{js(r.get('vehicle') or '')}, "
                f"vin:{js(r.get('vin') or '')}, activePts:{r['activePoints']},")
    out2.append("  },")
out2.append("];")
out2.append("")

# ── Violation ─────────────────────────────────────────────
out2.append("// ─── AB_VIOL_GROUPS / META / SUMMARY / DETAILS ─────────────────────────────")
out2.append("const AB_VIOL_GROUPS: AbViolGroupRow[] = [")
for r in pull["violationAnalysis"]:
    pct = (r.get("pctText") or "").strip() or ""
    out2.append(f"  {{ group:{js(r['group']):60s}, count:{r['count']}, pct:{js(pct)} }},")
out2.append("];")
out2.append(f"const AB_VIOL_TOTAL = {{ count: {pull['totalViolations']}, pct: '100%' }};")
out2.append("")
out2.append("const AB_VIOL_META = {")
out2.append(f"  periodStart: {js(ab_date(src.get('profilePeriodStart')))},")
out2.append(f"  periodEnd:   {js(ab_date(src.get('profilePeriodEnd')))},")
out2.append(f"  datePrinted: {js(ab_date(src.get('datePrinted')))},")
out2.append("  pages: '1 To 4',")
out2.append(f"  documents: {pull.get('totalViolationDocuments') or pull.get('totalViolations') or 0},")
out2.append(f"  offences: {pull['totalViolations']},")
out2.append("};")
out2.append("")
out2.append("const AB_VIOL_SUMMARY: AbViolSummaryRow[] = [")
for r in pull["violationSummary"]:
    out2.append(
        f"  {{ seq:{r['seq']}, date:{js(r['date'])}, document:{js(r['document'])}, "
        f"jur:{js(r['jurisdiction'])}, plate:{js(r.get('plate') or '')}, "
        f"plateJur:{js(r.get('plateJur') or '')}, "
        f"driverName:{js(r.get('driverName') or '')}, offence:{js(r.get('offence') or '')} }},"
    )
out2.append("];")
out2.append("")
out2.append("const AB_VIOL_DETAILS: AbViolDetailRow[] = [")
for r in pull["violationDetails"]:
    out2.append("  {")
    out2.append(f"    seq:{r['seq']}, date:{js(r['date'])}, time:{js(r.get('time') or '')}, "
                f"document:{js(r['document'])}, jurisdiction:{js(r['jurisdiction'])}, "
                f"dateEntered:{js(r.get('dateEntered') or '')},")
    out2.append(f"    issuingAgency:{js(r.get('issuingAgency') or '')},")
    out2.append(f"    location:{js(r.get('location') or '')},")
    out2.append(f"    driver:{js(r.get('driver') or '')},")
    out2.append(f"    vehicle:{js(r.get('vehicle') or '')},")
    out2.append(f"    commodity:{js(r.get('commodity') or '')},")
    out2.append("    offences:[")
    for o in r.get("offences", []):
        out2.append("      {")
        out2.append(f"        num:{o['num']},")
        out2.append(f"        actSection:{js(o['actSection'])},")
        out2.append(f"        actDesc:{js(o.get('actDesc') or '')},")
        out2.append(f"        ccmtaCode:{js(o['ccmtaCode'])},")
        out2.append(f"        ccmtaLabel:{js(o['ccmtaLabel'])},")
        out2.append(f"        vehicle:{js(o.get('vehicle') or '')},")
        out2.append(f"        text:{js(o.get('text') or '')},")
        out2.append("      },")
    out2.append("    ],")
    out2.append("  },")
out2.append("];")
out2.append("")

# ── Monitoring ─────────────────────────────────────────────
mon = pull["monitoring"]
ind = mon["industry"]
out2.append("// ─── AB_MON_META / INDUSTRY / THRESHOLDS / SUMMARY / DETAILS ───────────────")
out2.append("const AB_MON_META = {")
out2.append(f"  periodStart: {js(ab_date(src.get('profilePeriodStart')))},")
out2.append(f"  periodEnd:   {js(ab_date(src.get('profilePeriodEnd')))},")
out2.append(f"  datePrinted: {js(ab_date(src.get('datePrinted')))},")
out2.append("  pages: '1 To 5',")
out2.append("};")
out2.append("")
def fmt_or_empty(val, prec):
    return f"{val:.{prec}f}" if val is not None else ""

out2.append("const AB_MON_INDUSTRY = {")
out2.append(f"  asOf: {js(ab_date(ind.get('asOf')))},")
out2.append(f"  fleetRange: {js(ind.get('fleetRange') or '')},")
out2.append(f"  fleetType: {js(ind.get('fleetType') or '')},")
out2.append(f"  avgRFactor: {js(fmt_or_empty(ind.get('avgRFactor'), 3))},")
out2.append(f"  avgConvPts: {js(fmt_or_empty(ind.get('avgConvPts'), 2))},")
out2.append(f"  avgOosDef: {js(fmt_or_empty(ind.get('avgOosDef'), 1))},")
out2.append(f"  avgTotalDef: {js(fmt_or_empty(ind.get('avgTotalDef'), 1))},")
out2.append(f"  avgOosVeh: {js(fmt_or_empty(ind.get('avgOosVeh'), 2))},")
out2.append(f"  avgFailure: {js(fmt_or_empty(ind.get('avgFailure'), 3))},")
out2.append(f"  avgCollPts: {js(fmt_or_empty(ind.get('avgCollPts'), 2))},")
out2.append("};")
out2.append("")
out2.append("const AB_MON_THRESHOLDS: AbMonThresholdRow[] = [")
for t in mon["thresholds"]:
    out2.append(f"  {{ stage:{js('Stage ' + str(t['stage']))}, range:{js(t.get('rangeText') or '')} }},")
out2.append("];")
out2.append("")
out2.append("const AB_MON_SUMMARY: AbMonSummaryRow[] = [")
for r in mon["summary"]:
    score_text = r.get("scoreText") or ""
    out2.append(
        f"  {{ date:{js(r['monthEnd'])}, type:{js(r.get('type') or '')}, "
        f"trkPct:{js(r.get('trkPct') or '')}, busPct:{js(r.get('busPct') or '')}, "
        f"avg:{r['avgFleet']}, cur:{r.get('currentFleet') or 0}, "
        f"score:{js(score_text)}, convPct:{js(r.get('convPctText') or '')}, "
        f"inspPct:{js(r.get('inspPctText') or '')}, collPct:{js(r.get('collPctText') or '')}, "
        f"stage:{js(str(r.get('stage') or ''))} }},"
    )
out2.append("];")
out2.append("")
out2.append("const AB_MON_DETAILS: AbMonDetailRow[] = [")
for r in mon["details"]:
    def fmt_field(row, k, prec):
        v = row.get(k)
        return js(f"{v:.{prec}f}") if v is not None else "''"
    ti = r.get("totalInspections")
    ti_lit = str(ti) if ti is not None else "''"
    out2.append(
        f"  {{ date:{js(r['monthEnd'])}, avgFleet:{r['avgFleet']}, "
        f"convPtsVeh:{fmt_field(r, 'convPtsPerVeh', 2)}, "
        f"totalInsp:{ti_lit}, "
        f"oosDefInsp:{fmt_field(r, 'oosDefPerInsp', 1)}, "
        f"totalDefInsp:{fmt_field(r, 'totalDefPerInsp', 1)}, "
        f"oosPct:{js(r.get('oosPctText') or '')}, "
        f"oosVeh:{fmt_field(r, 'oosPerVeh', 2)}, "
        f"failureRate:{fmt_field(r, 'failureRate', 3)}, "
        f"collPtsVeh:{fmt_field(r, 'collPtsPerVeh', 2)} }},"
    )
out2.append("];")

result = final_text + "\n\n" + "\n".join(out2)
Path("ab_perf_history_blocks.ts").write_text(result, encoding="utf-8")
print(f"wrote ab_perf_history_blocks.ts — {len(result.splitlines())} lines")
