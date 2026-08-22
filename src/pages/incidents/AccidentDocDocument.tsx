import { type ReactNode, type CSSProperties } from 'react';
import { ACCIDENT_TYPES } from '@/data/accident-types.data';
import { type AccidentRecord } from '@/data/accident-records.data';
import { useCompanyBranding } from '@/pages/ats/company-branding.data';

/**
 * Generates a real, formatted document for a single accident file (Driver statement, Police
 * report, Towing invoice, COI, …), populated from the accident record. Rendered with INLINE hex
 * colors only (no Tailwind oklch classes) so html2canvas can rasterize it for PDF download.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDateTime(dt?: string): string {
    if (!dt) return '';
    const [d, t] = dt.split('T');
    const [y, m, day] = (d || '').split('-');
    if (!y) return dt;
    return `${MONTHS[Number(m) - 1] ?? m} ${Number(day)}, ${y}${t ? ` · ${t}` : ''}`;
}
const fmtDate = (dt?: string) => fmtDateTime(dt?.split('T')[0]);
const compose = (...p: (string | number | undefined | false)[]) => p.filter(v => v !== undefined && v !== null && v !== '' && v !== false).join(', ');
const typesOf = (r: AccidentRecord) => {
    const ids = r.accidentTypeIds?.length ? r.accidentTypeIds : (r.accidentTypeId ? [r.accidentTypeId] : []);
    return ids.map(id => ACCIDENT_TYPES.find(t => t.id === id)?.displayName ?? '').filter(Boolean).join(', ');
};
const hashNum = (s: string, min: number, max: number) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return min + (h % (max - min + 1)); };
const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

export type AccidentDocKind =
    | 'driver-statement' | 'police-report' | 'citation' | 'towing-invoice' | 'repair-estimate'
    | 'elog' | 'claim-ledger' | 'proof-of-loss' | 'coverage-confirmation' | 'investigation-notes'
    | 'witness-statement' | 'coi' | 'generic';

export function docKindFromGroup(group: string, fileName?: string): AccidentDocKind {
    const g = group.toLowerCase();
    const f = (fileName ?? '').toLowerCase();
    if (g.startsWith('witness statement')) return 'witness-statement';
    if (g.startsWith('coi')) return 'coi';
    if (g.includes('driver statement')) return 'driver-statement';
    if (g.includes('police')) return 'police-report';
    if (g.includes('citation') || g.includes('ticket')) return 'citation';
    if (g.includes('towing')) return 'towing-invoice';
    if (g.includes('repair')) return 'repair-estimate';
    if (g.includes('e-log') || g.includes('elog')) return 'elog';
    if (g.includes('ledger')) return 'claim-ledger';
    if (g.includes('claim document')) return f.includes('coverage') ? 'coverage-confirmation' : 'proof-of-loss';
    if (g.includes('additional')) return 'investigation-notes';
    return 'generic';
}
const DOC_TITLE: Record<AccidentDocKind, string> = {
    'driver-statement': 'Driver Statement', 'police-report': 'Police Collision Report', 'citation': 'Traffic Citation',
    'towing-invoice': 'Towing & Recovery Invoice', 'repair-estimate': 'Repair Estimate', 'elog': 'Hours-of-Service Record (ELD)',
    'claim-ledger': 'Insurance Claim Ledger', 'proof-of-loss': 'Sworn Proof of Loss', 'coverage-confirmation': 'Confirmation of Coverage',
    'investigation-notes': 'Internal Investigation Notes', 'witness-statement': 'Witness Statement', 'coi': 'Certificate of Insurance', 'generic': 'Document',
};

export function AccidentDocDocument({ record: r, group, fileName, accentColor }: { record: AccidentRecord; group: string; fileName: string; accentColor?: string }) {
    const [branding] = useCompanyBranding();
    const kind = docKindFromGroup(group, fileName);
    const accent = accentColor || branding.accentColor || '#2563eb';
    const ink = '#0f172a', muted = '#64748b', line = '#e2e8f0';
    const initials = (branding.name || 'AL').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const acc = typesOf(r) || 'Accident';
    const seed = fileName + r.id;

    const Section = ({ title, children }: { title: string; children: ReactNode }) => (
        <section style={{ marginTop: 20, breakInside: 'avoid' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: accent, borderBottom: `1px solid ${line}`, paddingBottom: 4 }}>{title}</h2>
            {children}
        </section>
    );
    const Row = ({ label, value }: { label: string; value?: string }) => (
        value ? <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, padding: '5px 0', borderBottom: `1px dashed ${line}`, fontSize: 12.5 }}><span style={{ color: muted }}>{label}</span><span style={{ color: ink, fontWeight: 500, textAlign: 'right' }}>{value}</span></div> : null
    );
    const Para = ({ text }: { text?: string }) => (text ? <p style={{ margin: '6px 0 0', fontSize: 12.5, color: ink, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{text}</p> : null);
    const th: CSSProperties = { padding: '6px 8px', borderBottom: `2px solid ${line}`, color: muted, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' };
    const td: CSSProperties = { padding: '6px 8px', borderBottom: `1px solid ${line}`, color: ink, fontSize: 12.5 };
    const Table = ({ head, rows, total }: { head: string[]; rows: (string | number)[][]; total?: [string, string] }) => (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead><tr>{head.map((h, i) => <th key={i} style={{ ...th, textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri}>{row.map((c, ci) => <td key={ci} style={{ ...td, textAlign: ci === 0 ? 'left' : 'right' }}>{c}</td>)}</tr>)}</tbody>
            {total && <tfoot><tr><td style={{ padding: '8px', fontWeight: 700, color: ink }} colSpan={head.length - 1}>{total[0]}</td><td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: accent }}>{total[1]}</td></tr></tfoot>}
        </table>
    );
    const SignBlock = ({ name, role }: { name: string; role: string }) => (
        <div style={{ display: 'flex', gap: 40, marginTop: 30 }}>
            <div style={{ flex: 1 }}><div style={{ height: 34, borderBottom: `1px solid ${ink}` }} /><div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{role}{name ? ` — ${name}` : ''}</div></div>
            <div style={{ width: 150 }}><div style={{ height: 34, borderBottom: `1px solid ${ink}` }} /><div style={{ fontSize: 11, color: muted, marginTop: 4 }}>Date</div></div>
        </div>
    );

    const driver = r.driverName || 'Driver';
    const owner = r.ownerName || branding.name || 'Carrier';
    const when = fmtDateTime(r.dateTime);
    const loc = r.location || '—';

    const body = (): ReactNode => {
        switch (kind) {
            case 'driver-statement':
                return <>
                    <Para text={`I, ${driver}, provide the following statement regarding the incident involving unit ${r.unitId || '—'} on ${when} at ${loc}.`} />
                    <Section title="Account of events"><Para text={r.description || 'No narrative recorded.'} /></Section>
                    <Section title="Details">
                        <Row label="Driver" value={driver} /><Row label="Vehicle unit" value={r.unitId} />
                        <Row label="Date & time" value={when} /><Row label="Location" value={loc} />
                        <Row label="Injuries reported" value={r.injuries ? (r.injuryNotes || 'Yes') : 'None'} />
                        <Row label="Police notified" value={r.policePresent ? 'Yes' : 'No'} />
                    </Section>
                    <p style={{ marginTop: 16, fontSize: 11.5, color: muted }}>I confirm the above statement is true and accurate to the best of my knowledge.</p>
                    <SignBlock name={driver} role="Driver signature" />
                </>;
            case 'police-report':
                return <>
                    <Section title="Report details">
                        <Row label="Report number" value={r.policeReport || `RPT-${hashNum(seed, 10000, 99999)}`} />
                        <Row label="Agency" value={r.policeAgency || 'State Highway Patrol'} />
                        <Row label="Investigating officer" value={compose(r.officer1Name || 'Ofc. J. Marsh', r.officer1Badge && `#${r.officer1Badge}`)} />
                        <Row label="Date & time" value={when} /><Row label="Location" value={loc} />
                        <Row label="Units involved" value={r.vehiclesInCollision || String(1 + (r.otherVehicles?.length ?? 0))} />
                    </Section>
                    <Section title="Narrative"><Para text={r.description || 'Officer responded to the scene and documented the collision.'} /></Section>
                    <Section title="Findings">
                        <Row label="Citation issued" value={r.citationIssued ? `Yes — ${r.citationNumber || 'see citation'}` : 'No'} />
                        <Row label="Injuries" value={r.numInjuries && r.numInjuries !== '0' ? r.numInjuries : 'None reported'} />
                        <Row label="Contributing factor" value={r.preventable === 'Preventable' ? 'Driver error' : 'Under review'} />
                    </Section>
                </>;
            case 'citation': {
                const fine = r.citationNumber ? hashNum(seed, 150, 450) : hashNum(seed, 150, 450);
                return <>
                    <Section title="Citation">
                        <Row label="Citation number" value={r.citationNumber || `CIT-${hashNum(seed, 100000, 999999)}`} />
                        <Row label="Issued to" value={driver} /><Row label="Vehicle unit" value={r.unitId} />
                        <Row label="Violation" value={fileName.toLowerCase().includes('too-close') ? 'Following too closely (§ 402.13)' : 'Moving violation'} />
                        <Row label="Officer" value={compose(r.officer1Name || 'Ofc. J. Marsh', r.officer1Badge && `#${r.officer1Badge}`)} />
                        <Row label="Location" value={loc} /><Row label="Date & time" value={when} />
                        <Row label="Fine amount" value={usd(fine)} />
                    </Section>
                    <p style={{ marginTop: 14, fontSize: 11.5, color: muted }}>Payment or contest must be submitted within 30 days of the issue date.</p>
                    <SignBlock name={compose(r.officer1Name || 'Ofc. J. Marsh')} role="Issuing officer" />
                </>;
            }
            case 'towing-invoice': {
                const hook = hashNum(seed + 'h', 150, 300), mile = hashNum(seed + 'm', 200, 600), recov = hashNum(seed + 'r', 400, 1200), storage = hashNum(seed + 's', 120, 400);
                const total = hook + mile + recov + storage;
                return <>
                    <Section title="Service provider">
                        <Row label="Company" value={r.towingCompany || 'Cascade Towing & Recovery'} />
                        <Row label="Contact" value={r.towingContact} /><Row label="Phone" value={r.towingPhone || '(509) 555-0140'} />
                        <Row label="Unit towed" value={r.unitId} /><Row label="Date of service" value={fmtDate(r.dateTime)} />
                    </Section>
                    <Section title="Charges">
                        <Table head={['Description', 'Amount']} rows={[['Hook-up / dispatch', usd(hook)], ['Mileage to yard', usd(mile)], ['Heavy recovery / winch-out', usd(recov)], ['Storage (per day)', usd(storage)]]} total={['Total due', usd(r.towingBill ? Number(String(r.towingBill).replace(/[^\d.]/g, '')) || total : total)]} />
                    </Section>
                </>;
            }
            case 'repair-estimate': {
                const parts = hashNum(seed + 'p', 1200, 4000), labor = hashNum(seed + 'l', 800, 2600), paint = hashNum(seed + 'pt', 300, 1100);
                const total = parts + labor + paint;
                return <>
                    <Section title="Repair facility">
                        <Row label="Vendor" value={r.repairVendor || 'Evergreen Fleet Collision'} />
                        <Row label="Vehicle unit" value={r.unitId} /><Row label="Estimate date" value={fmtDate(r.dateTime)} />
                        <Row label="Status" value={r.repairStatus || 'Estimate — pending approval'} />
                    </Section>
                    <Section title="Line items">
                        <Table head={['Description', 'Amount']} rows={[['Parts & components', usd(parts)], ['Labor (body & mechanical)', usd(labor)], ['Paint & materials', usd(paint)]]} total={['Estimated total', usd(r.totalRepairAmount ? Number(String(r.totalRepairAmount).replace(/[^\d.]/g, '')) || total : total)]} />
                    </Section>
                </>;
            }
            case 'elog': {
                const drive = r.hrsDrivingAtCrash || String(hashNum(seed, 4, 9)), duty = r.hrsOnDutyAtCrash || String(Number(drive) + 2);
                return <>
                    <Section title="Record">
                        <Row label="Driver" value={driver} /><Row label="Vehicle unit" value={r.unitId} /><Row label="Log date" value={fmtDate(r.dateTime)} />
                    </Section>
                    <Section title="Duty status">
                        <Table head={['Status', 'Start', 'Hours']} rows={[['Off duty', '00:00', '6.0'], ['Sleeper berth', '06:00', '2.0'], ['On duty (not driving)', '08:00', '1.5'], ['Driving', '09:30', drive], ['On duty (post-incident)', '—', '0.5']]} />
                    </Section>
                    <Section title="Summary">
                        <Row label="Driving hours at incident" value={`${drive} h`} /><Row label="On-duty hours at incident" value={`${duty} h`} />
                        <Row label="Last duty status" value={r.lastDutyStatus || 'Driving'} /><Row label="Last DVIR" value={r.lastDvirStatus || 'No defects reported'} />
                    </Section>
                </>;
            }
            case 'claim-ledger': {
                const reserve = hashNum(seed + 'rv', 20000, 80000), pay = hashNum(seed + 'py', 2000, 15000);
                return <>
                    <Section title="Claim">
                        <Row label="Claim number" value={r.claimNumber || `CLM-${hashNum(seed, 1000, 9999)}`} />
                        <Row label="Insurer" value={r.insuranceCarrier || r.insurer || 'Great West Casualty'} />
                        <Row label="Policy number" value={r.insurancePolicyNumber} /><Row label="Adjuster" value={compose(r.adjusterName, r.adjusterEmail)} />
                    </Section>
                    <Section title="Transactions">
                        <Table head={['Date', 'Description', 'Amount']} rows={[[fmtDate(r.reportedAt), 'Reserve set', usd(reserve)], [fmtDate(r.reportedAt), 'Adjuster assigned', '—'], [fmtDate(r.dateTime), 'Initial payment', usd(pay)]]} total={['Total incurred', usd(r.totalIncurred ? Number(String(r.totalIncurred).replace(/[^\d.]/g, '')) || reserve + pay : reserve + pay)]} />
                    </Section>
                </>;
            }
            case 'proof-of-loss': {
                const amt = hashNum(seed, 8000, 60000);
                return <>
                    <Para text={`The undersigned, on behalf of ${owner}, submits this sworn Proof of Loss in connection with the loss described below and declares the statements herein to be true.`} />
                    <Section title="Loss">
                        <Row label="Claim number" value={r.claimNumber || `CLM-${hashNum(seed, 1000, 9999)}`} />
                        <Row label="Insured" value={owner} /><Row label="Date of loss" value={fmtDate(r.dateTime)} /><Row label="Location" value={loc} />
                        <Row label="Cause of loss" value={acc} /><Row label="Amount claimed" value={usd(amt)} />
                    </Section>
                    <SignBlock name={owner} role="Authorized representative" />
                </>;
            }
            case 'coverage-confirmation':
                return <>
                    <Para text={`This letter confirms that the following policy was in force on the date of loss, ${fmtDate(r.dateTime)}.`} />
                    <Section title="Policy">
                        <Row label="Insurer" value={r.insuranceCarrier || r.insurer || 'Great West Casualty'} />
                        <Row label="Policy number" value={r.insurancePolicyNumber || `GW-${hashNum(seed, 10000, 99999)}`} />
                        <Row label="Named insured" value={owner} /><Row label="Vehicle unit" value={r.unitId} />
                    </Section>
                    <Section title="Coverage limits">
                        <Table head={['Coverage', 'Limit']} rows={[['Liability (CSL)', '$1,000,000'], ['Cargo', '$100,000'], ['Physical damage', 'ACV'], ['Deductible', usd(hashNum(seed, 1000, 5000))]]} />
                    </Section>
                </>;
            case 'investigation-notes':
                return <>
                    <Section title="Summary">
                        <Row label="Accident" value={acc} /><Row label="Driver" value={driver} /><Row label="Date" value={when} />
                        <Row label="Preventability" value={r.preventable || 'Under review'} /><Row label="Severity" value={r.severity} />
                    </Section>
                    <Section title="Findings"><Para text={r.internalNotes || r.managerNotes || 'Internal review in progress; dashcam and telematics under evaluation.'} /></Section>
                    <Section title="Corrective action"><Para text={r.preventable === 'Preventable' ? 'Coaching and refresher training assigned to the driver.' : 'No corrective action required at this time.'} /></Section>
                </>;
            case 'witness-statement': {
                const name = group.split('—')[1]?.trim() || 'Witness';
                const w = (r.witnesses ?? []).find(x => (x.name || '').trim() === name);
                return <>
                    <Section title="Witness">
                        <Row label="Name" value={w?.name || name} /><Row label="Phone" value={w?.phone} />
                        <Row label="Prov. / state" value={w?.province} /><Row label="Address" value={w?.address} />
                    </Section>
                    <Section title="Statement"><Para text={compose(w?.whereWhen && `Where they were: ${w.whereWhen}`, w?.cause && `Probable cause: ${w.cause}`) || `Witness observed the collision on ${when} at ${loc}.`} /></Section>
                    <SignBlock name={w?.name || name} role="Witness signature" />
                </>;
            }
            case 'coi': {
                const idx = Number(group.match(/vehicle\s*(\d+)/i)?.[1] || '1') - 1;
                const v = (r.otherVehicles ?? [])[idx];
                return <>
                    <Para text="This certificate is issued as a matter of information only and confers no rights upon the certificate holder." />
                    <Section title="Insured party">
                        <Row label="Insurer" value={v?.insuranceCompany || 'Third-party insurer'} />
                        <Row label="Policy number" value={v?.policyNumber || `POL-${hashNum(seed, 10000, 99999)}`} />
                        <Row label="Named insured" value={v?.ownerName || v?.driverName || 'Other party'} />
                        <Row label="Vehicle" value={compose(v?.year, v?.make, v?.model)} />
                        <Row label="Plate" value={compose(v?.plate, v?.plateJurisdiction)} />
                    </Section>
                    <Section title="Coverage">
                        <Table head={['Coverage', 'Limit']} rows={[['Bodily injury / property damage', '$500,000 CSL'], ['Collision deductible', usd(hashNum(seed, 500, 2000))]]} />
                    </Section>
                </>;
            }
            default:
                return <><Section title="Details"><Row label="Driver" value={driver} /><Row label="Vehicle unit" value={r.unitId} /><Row label="Date" value={when} /><Row label="Location" value={loc} /></Section><Para text={r.description} /></>;
        }
    };

    return (
        <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: ink, background: '#ffffff', width: '100%', maxWidth: 760, margin: '0 auto', padding: '32px 36px', boxSizing: 'border-box' }}>
            {/* Letterhead */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {branding.logoDataUrl
                        ? <img src={branding.logoDataUrl} alt={branding.name} style={{ height: 40, width: 'auto', objectFit: 'contain', borderRadius: 6 }} />
                        : <div style={{ width: 40, height: 40, borderRadius: 8, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{initials}</div>}
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: ink }}>{branding.name}</div>
                        {branding.tagline && <div style={{ fontSize: 10.5, color: muted }}>{branding.tagline}</div>}
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 10.5, color: muted, lineHeight: 1.5 }}>
                    {branding.address && <div>{branding.address}</div>}
                    <div>{[branding.phone, branding.email].filter(Boolean).join('  ·  ')}</div>
                </div>
            </div>
            <div style={{ marginTop: 14, borderBottom: `2px solid ${accent}`, paddingBottom: 10 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.15, color: ink }}>{DOC_TITLE[kind]}</h1>
                <p style={{ margin: '4px 0 0', fontSize: 11.5, color: muted }}>{compose(acc, r.driverName, r.unitId)} · {when} · {loc}{r.claimNumber ? ` · Claim ${r.claimNumber}` : ''}</p>
            </div>
            {body()}
            <div style={{ marginTop: 26, paddingTop: 8, borderTop: `1px solid ${line}`, fontSize: 10, color: muted, display: 'flex', justifyContent: 'space-between' }}>
                <span>{fileName}</span>
                <span>{branding.name} · Generated {fmtDate(r.reportedAt)}</span>
            </div>
        </div>
    );
}
