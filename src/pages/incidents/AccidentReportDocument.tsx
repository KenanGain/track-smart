import { type ReactNode } from 'react';
import { ACCIDENT_TYPES } from '@/data/accident-types.data';
import { ACCIDENT_STATUS_META, type AccidentRecord, type AccidentFile } from '@/data/accident-records.data';
import { useCompanyBranding } from '@/pages/ats/company-branding.data';
import { getAssetsForAccount } from '@/pages/accounts/carrier-assets.data';

/**
 * Printable / PDF accident report. Rendered with INLINE hex colors only (no Tailwind
 * palette classes) so html2canvas can rasterize it — Tailwind v4's oklch() colors are
 * unparseable by html2canvas. Covers the accident up to the Claim section (the internal
 * Verification / Review is excluded), and embeds photos + attached-document metadata + tags.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDateTime(dt?: string): string {
    if (!dt) return '';
    const [d, t] = dt.split('T');
    const [y, m, day] = (d || '').split('-');
    if (!y) return dt;
    return `${MONTHS[Number(m) - 1] ?? m} ${Number(day)}, ${y}${t ? ` · ${t}` : ''}`;
}
const yesNo = (v?: boolean) => (v ? 'Yes' : 'No');
const money = (amt?: string, cur?: string) => (amt ? `${amt} ${cur ?? 'USD'}` : '');
const compose = (...parts: (string | number | undefined | false)[]) => parts.filter(v => v !== undefined && v !== null && v !== '' && v !== false).join(', ');
const fmtSize = (b?: number) => (b == null ? '' : b < 1024 ? `${b} B` : `${(b / 1024).toFixed(0)} KB`);
const typesOf = (r: AccidentRecord) => {
    const ids = r.accidentTypeIds?.length ? r.accidentTypeIds : (r.accidentTypeId ? [r.accidentTypeId] : []);
    return ids.map(id => ACCIDENT_TYPES.find(t => t.id === id)?.displayName ?? '').filter(Boolean).join(', ');
};

const IMG_EXT = /\.(jpe?g|png|gif|webp|heic)$/i;
const VID_EXT = /\.(mp4|mov|avi|webm|mkv)$/i;
function fileKind(name: string): string {
    if (IMG_EXT.test(name)) return 'Image';
    if (VID_EXT.test(name)) return 'Video';
    if (/\.pdf$/i.test(name)) return 'PDF';
    return 'Document';
}
const escXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Deterministic, self-contained SVG "photo" data-URI (colour varies by seed) — the prototype
 *  has no real image bytes, so we render a representative demo photo. */
function demoPhoto(seed: string, label: string): string {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    const sky1 = `hsl(${hue},55%,72%)`, sky2 = `hsl(${(hue + 30) % 360},48%,54%)`, ground = `hsl(${(hue + 200) % 360},14%,30%)`;
    const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='220' viewBox='0 0 360 220'>` +
        `<defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${sky1}'/><stop offset='1' stop-color='${sky2}'/></linearGradient></defs>` +
        `<rect width='360' height='220' fill='url(#s)'/>` +
        `<rect y='150' width='360' height='70' fill='${ground}'/>` +
        `<line x1='0' y1='180' x2='360' y2='180' stroke='rgba(255,255,255,0.6)' stroke-width='3' stroke-dasharray='26 16'/>` +
        `<rect x='58' y='94' width='150' height='60' rx='6' fill='rgba(255,255,255,0.92)'/>` +
        `<rect x='208' y='110' width='74' height='44' rx='6' fill='rgba(30,41,59,0.9)'/>` +
        `<circle cx='96' cy='158' r='16' fill='#111'/><circle cx='96' cy='158' r='7' fill='#6b7280'/>` +
        `<circle cx='250' cy='158' r='16' fill='#111'/><circle cx='250' cy='158' r='7' fill='#6b7280'/>` +
        `<rect x='0' y='188' width='360' height='32' fill='rgba(0,0,0,0.45)'/>` +
        `<text x='14' y='210' fill='#ffffff' font-family='Arial, sans-serif' font-size='15' font-weight='bold'>${escXml(label)}</text>` +
        `</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type ReportTheme = 'standard' | 'compact' | 'enhanced' | 'traditional' | 'bw';
function themeTokens(theme: ReportTheme) {
    switch (theme) {
        case 'compact':     return { accent: '#1e293b', ink: '#0f172a', muted: '#64748b', line: '#e2e8f0', rowPad: '4px 0', font: 'ui-sans-serif, system-ui, sans-serif', title: 22, section: 12 };
        case 'enhanced':    return { accent: '#2563eb', ink: '#0f172a', muted: '#64748b', line: '#e2e8f0', rowPad: '7px 0', font: 'ui-sans-serif, system-ui, sans-serif', title: 30, section: 13 };
        case 'traditional': return { accent: '#111827', ink: '#111827', muted: '#374151', line: '#cbd5e1', rowPad: '6px 0', font: 'Georgia, "Times New Roman", serif', title: 27, section: 13 };
        case 'bw':          return { accent: '#111111', ink: '#111111', muted: '#444444', line: '#d1d5db', rowPad: '6px 0', font: 'ui-sans-serif, system-ui, sans-serif', title: 26, section: 12 };
        default:            return { accent: '#2563eb', ink: '#0f172a', muted: '#64748b', line: '#e2e8f0', rowPad: '6px 0', font: 'ui-sans-serif, system-ui, sans-serif', title: 28, section: 13 };
    }
}

export function AccidentReportDocument({ record: r, theme = 'standard', accountId }: { record: AccidentRecord; theme?: ReportTheme; accountId?: string }) {
    const [branding] = useCompanyBranding();
    const t = themeTokens(theme);
    // Resolve the involved power unit + trailer from the fleet for full vehicle detail.
    const assets = accountId ? getAssetsForAccount(accountId) : [];
    const veh = assets.find(a => r.vehicleAssetId && a.id === r.vehicleAssetId) || assets.find(a => r.unitId && a.unitNumber === r.unitId);
    const trl = assets.find(a => r.trailerAssetId && a.id === r.trailerAssetId) || assets.find(a => r.trailerUnit && a.unitNumber === r.trailerUnit);
    const mono = theme === 'bw' || theme === 'traditional';
    const accent = mono ? '#111827' : (branding.accentColor || t.accent);
    const initials = (branding.name || 'AL').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const badge = ACCIDENT_STATUS_META[r.status]?.label;
    const acc = typesOf(r) || 'Accident report';
    const subtitle = compose(r.driverName, r.unitId) + ` · ${fmtDateTime(r.dateTime)} · ${r.location || '—'}` + (r.claimNumber ? ` · Claim ${r.claimNumber}` : '');
    const addr = compose(r.ownerStreet, r.ownerCity, compose(r.ownerState, r.ownerZip), r.ownerCountry);
    const driverAddr = compose(r.driverStreet, r.driverCity, compose(r.driverState, r.driverZip), r.driverCountry);

    const Section = ({ title, children }: { title: string; children: ReactNode }) => (
        <section style={{ marginTop: 22, breakInside: 'avoid' }}>
            <h2 style={{ margin: '0 0 10px', fontSize: t.section, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: accent, borderBottom: `1px solid ${t.line}`, paddingBottom: 5 }}>{title}</h2>
            {children}
        </section>
    );
    const Row = ({ label, value }: { label: string; value?: string }) => (
        value ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, padding: t.rowPad, borderBottom: `1px dashed ${t.line}`, fontSize: 12.5 }}>
                <span style={{ color: t.muted }}>{label}</span>
                <span style={{ color: t.ink, fontWeight: 500, textAlign: 'right' }}>{value}</span>
            </div>
        ) : null
    );
    const Para = ({ label, value }: { label: string; value?: string }) => (
        value ? <div style={{ padding: '6px 0', borderBottom: `1px dashed ${t.line}` }}><div style={{ fontSize: 11, color: t.muted, marginBottom: 3 }}>{label}</div><div style={{ fontSize: 12.5, color: t.ink, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{value}</div></div> : null
    );
    const TagChips = ({ tags }: { tags?: string[] }) => (
        tags && tags.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {tags.map(tag => <span key={tag} style={{ border: `1px solid ${t.line}`, background: theme === 'bw' ? '#fff' : '#f8fafc', color: t.muted, borderRadius: 999, padding: '1px 7px', fontSize: 9.5, fontWeight: 600 }}>{tag}</span>)}
            </div>
        ) : null
    );
    const has = (...vals: unknown[]) => vals.some(v => v !== undefined && v !== null && v !== '' && v !== false && !(Array.isArray(v) && v.length === 0));

    // ── attachment collections (each file carries a fallback uploader for its metadata line) ──
    type Item = { file: AccidentFile; group: string; uploader?: string };
    const collect = (groups: { label: string; files?: AccidentFile[]; uploader?: string }[]): Item[] =>
        groups.flatMap(g => (g.files ?? []).map(f => ({ file: f, group: g.label, uploader: g.uploader })));
    const driverUp = r.driverName || r.reportedBy || 'Driver';
    const officeUp = r.reportedBy || 'Dispatch (office)';
    const claimsUp = r.claimedBy || r.adjusterName || 'Claims dept';
    const photos = collect([
        { label: 'Vehicle damage', files: r.vehicleDamageFiles, uploader: driverUp },
        { label: 'Evidence photo', files: r.photoFiles, uploader: driverUp },
        { label: 'Video', files: r.videoFiles, uploader: driverUp },
        { label: 'Dashcam', files: r.dashcamFiles, uploader: driverUp },
    ]);
    const docs = collect([
        { label: 'Driver statement', files: r.driverStatementFiles, uploader: driverUp },
        { label: 'Police report', files: r.policeReportFiles, uploader: officeUp },
        { label: 'Citation / ticket', files: r.citationFiles, uploader: officeUp },
        { label: 'Repairs document', files: r.repairFiles, uploader: officeUp },
        { label: 'Towing invoice', files: r.towingInvoiceFiles, uploader: officeUp },
        { label: 'E-log', files: r.elogFiles, uploader: officeUp },
        ...(r.witnesses ?? []).map((w, i) => ({ label: `Witness ${i + 1} statement`, files: w.statementFiles, uploader: w.name || `Witness ${i + 1}` })),
        ...(r.otherVehicles ?? []).map((v, i) => ({ label: `COI — vehicle ${i + 1}`, files: v.coiFiles, uploader: v.insuranceCompany || officeUp })),
        { label: 'Claim ledger', files: r.ledgerFiles, uploader: claimsUp },
        { label: 'Claim documents', files: r.claimDocsFiles, uploader: claimsUp },
    ]);
    const metaLine = (f: AccidentFile, group: string, uploader?: string) =>
        compose(group, fileKind(f.fileName), fmtSize(f.fileSize), `Uploaded by ${f.uploadedBy || uploader || '—'}`, fmtDateTime(f.uploadedAt || r.reportedAt));

    return (
        <div id="app-doc" style={{ fontFamily: t.font, color: t.ink, background: '#ffffff', width: '100%', maxWidth: 820, margin: '0 auto', padding: '40px 44px' }}>
            {/* Letterhead — company branding (matches the hiring document letterhead) */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {branding.logoDataUrl
                            ? <img src={branding.logoDataUrl} alt={branding.name} style={{ height: 44, width: 'auto', objectFit: 'contain', borderRadius: 6 }} />
                            : <div style={{ width: 44, height: 44, borderRadius: 8, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>{initials}</div>}
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: t.ink }}>{branding.name}</div>
                            {branding.tagline && <div style={{ fontSize: 11, color: t.muted }}>{branding.tagline}</div>}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: t.muted, lineHeight: 1.5 }}>
                        {branding.address && <div>{branding.address}</div>}
                        <div>{[branding.phone, branding.email].filter(Boolean).join('  ·  ')}</div>
                    </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, borderBottom: `2px solid ${accent}`, paddingBottom: 12 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: t.title, fontWeight: 800, lineHeight: 1.15, color: t.ink }}>Accident Report — {acc}</h1>
                        <p style={{ margin: '5px 0 0', fontSize: 12, color: t.muted }}>{subtitle}</p>
                    </div>
                    {badge && <span style={{ borderRadius: 4, padding: '3px 9px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', background: mono ? '#fff' : accent, color: mono ? '#111' : '#fff', border: mono ? '1px solid #111' : 'none' }}>{badge}</span>}
                </div>
            </div>

            <Section title="Owner information">
                <Row label="Registered owner" value={r.ownerName} />
                <Row label="Phone" value={r.ownerPhone} />
                <Row label="Address" value={addr} />
                <Row label="Insurance policy number" value={r.policyNumber} />
                <Row label="NSC / CVOR number" value={r.nscCvor} />
                <Row label="DOT number" value={r.dotNumber} />
            </Section>
            <Section title="Driver information">
                <Row label="Driver" value={r.driverName} />
                <Row label="Phone" value={r.driverPhone} />
                <Row label="Address" value={driverAddr} />
                <Row label="Licence number" value={r.licenceNumber} />
                <Row label="Licence expiry" value={r.licenceExpiry} />
                <Row label="Province / state of issue" value={r.licenceProvince} />
            </Section>
            <Section title="Vehicle & trailer involved">
                <div style={{ fontSize: 12, fontWeight: 700, margin: '2px 0 4px', color: t.ink }}>Power unit</div>
                <Row label="Unit number" value={r.unitId} />
                <Row label="Make / model / year" value={compose(veh?.make, veh?.model, veh?.year)} />
                <Row label="Vehicle type" value={compose(veh?.assetType, veh?.vehicleType)} />
                <Row label="Colour" value={veh?.color} />
                <Row label="VIN" value={r.vehicleVin || veh?.vin} />
                <Row label="Plate" value={compose(r.vehiclePlate || veh?.plateNumber, r.vehicleJurisdiction || veh?.plateJurisdiction, veh?.plateCountry)} />
                <Row label="Plate type" value={veh?.plateType} />
                <Row label="Registration expiry" value={veh?.registrationExpiryDate} />
                <Row label="Gross weight" value={veh?.grossWeight ? `${veh.grossWeight} ${veh.grossWeightUnit ?? ''}`.trim() : ''} />
                <Row label="Odometer" value={veh?.odometer ? `${veh.odometer} ${veh.odometerUnit ?? ''}`.trim() : ''} />
                <Row label="Ownership" value={veh?.financialStructure} />
                <Row label="Operational status" value={veh?.operationalStatus} />
                {(r.trailerUnit || trl) && <>
                    <div style={{ fontSize: 12, fontWeight: 700, margin: '12px 0 4px', color: t.ink }}>Trailer</div>
                    <Row label="Unit number" value={r.trailerUnit} />
                    <Row label="Make / model / year" value={compose(trl?.make, trl?.model, trl?.year)} />
                    <Row label="Trailer type" value={compose(trl?.assetType, trl?.vehicleType)} />
                    <Row label="Colour" value={trl?.color} />
                    <Row label="VIN" value={r.trailerVin || trl?.vin} />
                    <Row label="Plate" value={compose(r.trailerPlate || trl?.plateNumber, r.trailerJurisdiction || trl?.plateJurisdiction, trl?.plateCountry)} />
                    <Row label="Plate type" value={trl?.plateType} />
                    <Row label="Registration expiry" value={trl?.registrationExpiryDate} />
                    <Row label="Gross weight" value={trl?.grossWeight ? `${trl.grossWeight} ${trl.grossWeightUnit ?? ''}`.trim() : ''} />
                    <Row label="Ownership" value={trl?.financialStructure} />
                    <Row label="Operational status" value={trl?.operationalStatus} />
                </>}
            </Section>
            <Section title="Accident & collision">
                <Para label="What happened" value={r.description} />
                <Row label="Direction of travel" value={r.directionOfTravel} />
                <Row label="Speed prior" value={r.travelSpeed ? `${r.travelSpeed} ${r.travelSpeedUnit ?? 'km/h'}` : ''} />
                <Row label="Headlights on" value={(r.travelSpeed || r.directionOfTravel) ? yesNo(r.headlightsOn) : ''} />
                <Row label="Lane / lanes wide" value={compose(r.laneNumber, r.lanesWide && `of ${r.lanesWide}`)} />
                <Row label="Landmarks" value={r.landmarks} />
                <Row label="Warning signals" value={r.warningSignals ? `Yes — ${r.warningSignalDesc || 'given'}` : ''} />
            </Section>
            <Section title="Collision severity">
                <Row label="Fatalities" value={r.numFatalities} />
                <Row label="Injuries" value={r.numInjuries} />
                <Row label="Vehicles in collision" value={r.vehiclesInCollision} />
                <Row label="Vehicles towed" value={r.numVehiclesTowed} />
                {Number(r.numInjuries) > 0 && <Para label="Injury details" value={r.injuryNotes} />}
                <Row label="Severity classification" value={r.severity || ''} />
            </Section>
            {Number(r.numVehiclesTowed) > 0 && (
                <Section title="Towing">
                    <Row label="Towing company" value={r.towingCompany} />
                    <Row label="Towing bill" value={money(r.towingBill, r.towingBillCurrency)} />
                    <Row label="Contact" value={r.towingContact} />
                    <Row label="Phone" value={r.towingPhone} />
                    <Row label="Email" value={r.towingEmail} />
                    <Row label="Address" value={r.towingAddress} />
                </Section>
            )}
            <Section title="Commodity / cargo">
                <Row label="Commodity damaged" value={yesNo(r.commodityDamaged)} />
                <Row label="Description" value={r.commodityDescription} />
                <Row label="Quantity" value={r.commodityQty} />
                <Row label="Estimated value" value={money(r.commodityValue, r.commodityValueCurrency)} />
                <Row label="Loss" value={r.commodityLoss} />
                <Row label="HAZMAT spill" value={yesNo(r.hazmatSpill)} />
            </Section>
            {r.hazmatSpill && (
                <Section title="HAZMAT details">
                    <Row label="HazMat class" value={r.hazmatClass} />
                    <Row label="UN / NA number" value={r.unNaNumber} />
                    <Row label="Quantity released" value={r.quantityReleased} />
                    <Row label="Estimated value" value={money(r.hazmatValue, r.hazmatValueCurrency)} />
                    <Row label="Placarded" value={yesNo(r.placarded)} />
                </Section>
            )}
            {has(r.repairVendor, r.repairStatus, r.estimatedRepair, r.totalRepairAmount) && (
                <Section title="Repair">
                    <Row label="Repair vendor" value={r.repairVendor} />
                    <Row label="Repair status" value={r.repairStatus} />
                    <Row label="Estimated repair" value={money(r.estimatedRepair, r.repairCurrency)} />
                    <Row label="Total repair amount" value={money(r.totalRepairAmount, r.repairCurrency)} />
                </Section>
            )}
            {has(r.odometerAfter, r.hrsDrivingAtCrash, r.hrsOnDutyAtCrash, r.lastDutyStatus, r.lastDvirStatus) && (
                <Section title="At the time of the crash">
                    <Row label="Odometer after crash" value={r.odometerAfter} />
                    <Row label="Hours driving at crash" value={r.hrsDrivingAtCrash} />
                    <Row label="Hours on duty at crash" value={r.hrsOnDutyAtCrash} />
                    <Row label="Last duty status" value={r.lastDutyStatus} />
                    <Row label="Last DVIR status" value={r.lastDvirStatus} />
                </Section>
            )}
            {has(r.roadType, r.postedSpeed, r.vehicleSpeed, r.roadCondsList, r.trafficControlsList, r.trafficCondsList, r.weatherList, r.visibilityList) && (
                <Section title="Road & environment">
                    <Row label="Road type" value={r.roadType} />
                    <Row label="Posted speed" value={r.postedSpeed} />
                    <Row label="Vehicle speed" value={r.vehicleSpeed} />
                    <Row label="Road conditions" value={(r.roadCondsList ?? []).join(', ')} />
                    <Row label="Traffic controls" value={(r.trafficControlsList ?? []).join(', ')} />
                    <Row label="Traffic conditions" value={(r.trafficCondsList ?? []).join(', ')} />
                    <Row label="Weather" value={(r.weatherList ?? []).join(', ')} />
                    <Row label="Visibility" value={(r.visibilityList ?? []).join(', ')} />
                </Section>
            )}
            <Section title="Location">
                <Row label="Description" value={r.location} />
                <Row label="Street address" value={r.accStreet} />
                <Row label="City" value={r.accCity} />
                <Row label="State / province" value={r.accState} />
                <Row label="Country" value={r.accCountry} />
                <Row label="Zip / pin" value={r.accZip} />
                <Row label="Location type" value={r.locationType} />
            </Section>
            {(r.otherVehicles?.length ?? 0) > 0 && (
                <Section title={`Other vehicles (${r.otherVehicles!.length})`}>
                    {r.otherVehicles!.map((v, i) => (
                        <div key={v.id} style={{ marginTop: i === 0 ? 0 : 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, margin: '4px 0', color: t.ink }}>Vehicle {i + 1}</div>
                            <Row label="Year / make / model" value={compose(v.year, v.make, v.model)} />
                            <Row label="Colour" value={v.colour} />
                            <Row label="Plate" value={compose(v.plate, v.plateJurisdiction)} />
                            <Row label="VIN" value={v.vehicleVin} />
                            <Row label="Driver" value={v.driverName} />
                            <Row label="Driver phone" value={v.driverPhone} />
                            <Row label="Driver address" value={v.driverAddress} />
                            <Row label="Licence" value={compose(v.licenceNumber, v.licenceProvince)} />
                            <Row label="Licence expiry" value={v.licenceExpiry} />
                            <Row label="Owner / employer" value={compose(v.ownerName, v.ownerAddress, v.ownerPhone)} />
                            <Row label="Persons in vehicle" value={v.personsInVehicle} />
                            <Row label="Injured" value={v.injured ? compose('Yes', v.injuredDriver && 'driver', v.injuredPassenger && 'passenger') : 'No'} />
                            <Row label="Insurance" value={compose(v.insuranceCompany, v.policyNumber)} />
                            <Row label="Action / movement" value={[...(v.actions ?? []), v.actionsOther].filter(Boolean).join(', ')} />
                        </div>
                    ))}
                </Section>
            )}
            {(r.witnesses?.length ?? 0) > 0 && (
                <Section title={`Witnesses (${r.witnesses!.length})`}>
                    {r.witnesses!.map((w, i) => (
                        <div key={w.id} style={{ marginTop: i === 0 ? 0 : 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, margin: '4px 0', color: t.ink }}>Witness {i + 1}</div>
                            <Row label="Name" value={w.name} />
                            <Row label="Phone" value={w.phone} />
                            <Row label="Prov. / state" value={w.province} />
                            <Row label="Address" value={w.address} />
                            <Row label="Saw the accident" value={yesNo(w.sawAccident)} />
                            <Para label="Where they were" value={w.whereWhen} />
                            <Para label="Probable cause" value={w.cause} />
                        </div>
                    ))}
                    {r.witnessNotes && <Para label="Additional notes" value={r.witnessNotes} />}
                </Section>
            )}
            {(r.policePresent || has(r.policeReport, r.policeAgency, r.citationIssued)) && (
                <Section title="Police report">
                    <Row label="Report number" value={r.policeReport} />
                    <Row label="Agency" value={r.policeAgency} />
                    <Row label="Agency phone" value={r.policeAgencyPhone} />
                    <Row label="Officer 1" value={compose(r.officer1Name, r.officer1Badge && `#${r.officer1Badge}`)} />
                    <Row label="Citation issued" value={yesNo(r.citationIssued)} />
                    {r.citationIssued && <Row label="Citation / ticket number" value={r.citationNumber} />}
                    <Row label="Anyone arrested" value={r.arrested ? compose('Yes', r.arrestedName) : 'No'} />
                    <Para label="Note" value={r.policeNote} />
                </Section>
            )}
            <Section title="Claim">
                <Row label="Claim number" value={r.claimNumber} />
                <Row label="Claim status" value={r.claimStatus} />
                <Row label="Insurance carrier" value={r.insuranceCarrier} />
                <Row label="Policy number" value={r.insurancePolicyNumber} />
                <Row label="Adjuster" value={compose(r.adjusterName, r.adjusterPhone, r.adjusterEmail)} />
                <Row label="TPA / third-party admin" value={r.tpaAdmin} />
                <Row label="Total loss" value={yesNo(r.totalLoss)} />
                <Row label="Subrogation" value={yesNo(r.subrogation)} />
                <Row label="Amount paid" value={money(r.amountPaid, r.claimCurrency)} />
                <Row label="Cash reserve" value={money(r.cashReserve, r.claimCurrency)} />
                <Row label="Total incurred" value={money(r.totalIncurred, r.claimCurrency)} />
                <Para label="Adjuster note" value={r.adjusterNote} />
            </Section>

            {/* Photos & evidence — image + name + tags + metadata */}
            {photos.length > 0 && (
                <Section title={`Photos & evidence (${photos.length})`}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 4 }}>
                        {photos.map(({ file: f, group, uploader }) => {
                            const isImg = IMG_EXT.test(f.fileName);
                            return (
                                <div key={f.id} style={{ border: `1px solid ${t.line}`, borderRadius: 8, overflow: 'hidden', breakInside: 'avoid' }}>
                                    {isImg
                                        ? <img src={demoPhoto(f.fileName, group)} alt={f.fileName} style={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }} />
                                        : <div style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme === 'bw' ? '#f3f4f6' : '#f1f5f9', color: t.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>{fileKind(f.fileName).toUpperCase()}</div>}
                                    <div style={{ padding: 8 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName}</div>
                                        <div style={{ fontSize: 9.5, color: t.muted, marginTop: 2 }}>{metaLine(f, group, uploader)}</div>
                                        <TagChips tags={f.tags} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {/* Attached documents — name + metadata + tags (no thumbnail) */}
            {docs.length > 0 && (
                <Section title={`Attached documents (${docs.length})`}>
                    <div>
                        {docs.map(({ file: f, group, uploader }) => (
                            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', padding: '8px 0', borderBottom: `1px dashed ${t.line}`, breakInside: 'avoid' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 12.5, fontWeight: 600, color: t.ink }}>{f.fileName}</div>
                                    <div style={{ fontSize: 10.5, color: t.muted, marginTop: 2 }}>{metaLine(f, group, uploader)}</div>
                                    <TagChips tags={f.tags} />
                                </div>
                                <span style={{ flexShrink: 0, border: `1px solid ${t.line}`, borderRadius: 999, padding: '1px 8px', fontSize: 9.5, fontWeight: 700, color: t.muted, whiteSpace: 'nowrap' }}>{fileKind(f.fileName)}</span>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            <div style={{ marginTop: 26, paddingTop: 12, borderTop: `1px solid ${t.line}`, fontSize: 10.5, color: t.muted, display: 'flex', justifyContent: 'space-between' }}>
                <span>Generated by {r.ownerName || 'TrackSmart'} · Accident report</span>
                <span>Reported {r.reportedAt} by {r.reportedBy}</span>
            </div>
        </div>
    );
}
