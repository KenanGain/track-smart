import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, X, Download, Check, AlertTriangle, Users } from 'lucide-react';
import { applicationFromDriver } from './driver-application-map';

// Columns the import file is expected to contain. Header matching is
// case-/space-/punctuation-insensitive and accepts either the label
// ("First Name") or the key ("firstName").
type Col = { key: string; label: string; required?: boolean; example: string; note?: string };
const IMPORT_COLUMNS: Col[] = [
    { key: 'firstName', label: 'First Name', required: true, example: 'John' },
    { key: 'lastName', label: 'Last Name', required: true, example: 'Miller' },
    { key: 'driverType', label: 'Driver Type', example: 'Company Driver', note: 'Company Driver / Owner Operator / Local Driver …' },
    { key: 'email', label: 'Email', example: 'john.miller@example.com' },
    { key: 'phone', label: 'Phone', example: '(302) 555-0134' },
    { key: 'dob', label: 'Date of Birth', example: '1988-03-14', note: 'YYYY-MM-DD' },
    { key: 'gender', label: 'Gender', example: 'Male' },
    { key: 'ssn', label: 'SSN / SIN', example: '123-45-6789' },
    { key: 'citizenship', label: 'Citizenship', example: 'USA', note: 'USA or Canada' },
    { key: 'address', label: 'Street Address', example: '127 Fleet Rd' },
    { key: 'unit', label: 'Unit / Apt', example: '4B' },
    { key: 'city', label: 'City', example: 'Wilmington' },
    { key: 'state', label: 'State / Province', example: 'DE' },
    { key: 'zip', label: 'Zip / Postal', example: '19801' },
    { key: 'country', label: 'Country', example: 'USA', note: 'USA or Canada' },
    { key: 'licenseNumber', label: 'License Number', example: 'D1234-5678-90' },
    { key: 'licenseState', label: 'License State', example: 'DE' },
    { key: 'licenseClass', label: 'License Class', example: 'A' },
    { key: 'licenseExpiry', label: 'License Expiry', example: '2030-03-07', note: 'YYYY-MM-DD' },
    { key: 'hiredDate', label: 'Date Hired', example: '2021-07-09', note: 'YYYY-MM-DD' },
    { key: 'status', label: 'Status', example: 'Active', note: 'Active / Inactive / On Leave / Terminated' },
];

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const COL_BY_NORM: Record<string, string> = {};
IMPORT_COLUMNS.forEach((c) => { COL_BY_NORM[norm(c.key)] = c.key; COL_BY_NORM[norm(c.label)] = c.key; });

// Map a raw sheet row (keyed by original headers) → normalised { colKey: value }.
function pickRow(raw: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [h, v] of Object.entries(raw)) {
        const key = COL_BY_NORM[norm(h)];
        if (key) out[key] = String(v ?? '').trim();
    }
    return out;
}

const STATUSES = ['Active', 'Inactive', 'On Leave', 'Terminated'];
const normStatus = (s: string) => STATUSES.find((x) => norm(x) === norm(s)) ?? 'Active';

// Build a domain driver record (+ application data file) from a normalised row.
function rowToDriver(r: Record<string, string>) {
    const country = norm(r.country) === norm('Canada') || norm(r.citizenship) === norm('Canada') ? 'Canada' : 'USA';
    const first = r.firstName || '';
    const last = r.lastName || '';
    const licenses = r.licenseNumber
        ? [{
            id: 'lic-0',
            type: r.licenseClass ? 'CDL' : 'Driver License',
            licenseNumber: r.licenseNumber,
            province: r.licenseState || r.state || '',
            country,
            class: r.licenseClass || '',
            issueDate: '',
            expiryDate: r.licenseExpiry || '',
            status: 'Valid',
            conditions: '',
            endorsements: [] as string[],
            restrictions: [] as string[],
            isPrimary: true,
            suspended: false,
            uploadType: 'images',
        }]
        : [];
    const driver: any = {
        firstName: first,
        middleName: '',
        lastName: last,
        name: `${first} ${last}`.trim(),
        avatarInitials: `${first.charAt(0)}${last.charAt(0)}`.toUpperCase(),
        status: normStatus(r.status),
        phone: r.phone || '',
        email: r.email || '',
        dob: r.dob || '',
        gender: r.gender || 'Prefer not to say',
        ssn: r.ssn || '',
        citizenship: country,
        authorizedToWork: true,
        hiredDate: r.hiredDate || '',
        dateAdded: '',
        driverType: r.driverType || 'Company Driver',
        address: r.address || '',
        unit: r.unit || '',
        city: r.city || '',
        state: r.state || '',
        zip: r.zip || '',
        country,
        licenseNumber: r.licenseNumber || '',
        licenseState: r.licenseState || r.state || '',
        licenseExpiry: r.licenseExpiry || '',
        licenses,
        employmentHistory: [],
        emergencyContacts: [],
        previousResidences: [],
        travelDocuments: [],
        documents: [],
    };
    driver.application = applicationFromDriver(driver);
    return driver;
}

type Parsed = { drivers: any[]; skipped: number; total: number; fileName: string };

export function DriverImportModal({ isOpen, onClose, onImport }: {
    isOpen: boolean;
    onClose: () => void;
    onImport: (drivers: any[]) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [parsed, setParsed] = useState<Parsed | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);

    if (!isOpen) return null;

    const reset = () => { setParsed(null); setError(null); };
    const close = () => { reset(); onClose(); };

    const downloadTemplate = () => {
        const headers = IMPORT_COLUMNS.map((c) => c.label);
        const example = IMPORT_COLUMNS.map((c) => c.example);
        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        ws['!cols'] = headers.map(() => ({ wch: 18 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Drivers');
        XLSX.writeFile(wb, 'driver-import-template.xlsx');
    };

    const handleFile = async (file: File) => {
        setError(null);
        try {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
            if (!rows.length) { setError('The file has no data rows.'); return; }
            const drivers: any[] = [];
            let skipped = 0;
            for (const raw of rows) {
                const r = pickRow(raw);
                if (!r.firstName || !r.lastName) { skipped++; continue; }
                drivers.push(rowToDriver(r));
            }
            if (!drivers.length) { setError('No valid rows found. Each row needs at least a First Name and Last Name.'); return; }
            setParsed({ drivers, skipped, total: rows.length, fileName: file.name });
        } catch {
            setError('Could not read that file. Please upload a valid .csv, .xlsx or .xls file.');
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    };

    const doImport = () => {
        if (!parsed) return;
        onImport(parsed.drivers);
        close();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users className="w-5 h-5" /></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Bulk Import Drivers</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Upload a CSV or Excel (.xlsx) file to add multiple drivers at once.</p>
                        </div>
                    </div>
                    <button onClick={close} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Required structure */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-slate-800">File structure</h4>
                            <button onClick={downloadTemplate} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors">
                                <Download className="w-3.5 h-3.5" /> Download template
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">The first row must be the header row. Column order doesn't matter — headers are matched by name. <span className="font-semibold text-slate-600">First Name</span> and <span className="font-semibold text-slate-600">Last Name</span> are required; everything else is optional.</p>
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <div className="max-h-56 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="px-4 py-2.5">Column</th>
                                            <th className="px-4 py-2.5">Required</th>
                                            <th className="px-4 py-2.5">Example</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {IMPORT_COLUMNS.map((c) => (
                                            <tr key={c.key} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-2">
                                                    <div className="font-semibold text-slate-800">{c.label}</div>
                                                    {c.note && <div className="text-[11px] text-slate-400">{c.note}</div>}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {c.required
                                                        ? <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-600">Required</span>
                                                        : <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Optional</span>}
                                                </td>
                                                <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{c.example}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Upload / result */}
                    {!parsed ? (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onDrop}
                            className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${dragging ? 'border-blue-400 bg-blue-50/50' : 'border-slate-300 bg-slate-50/40'}`}
                        >
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
                                <UploadCloud className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">Drag &amp; drop your file here</p>
                            <p className="text-xs text-slate-400 mb-4">or</p>
                            <button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                                <FileSpreadsheet className="w-4 h-4" /> Choose file
                            </button>
                            <p className="mt-3 text-[11px] text-slate-400">Accepted: .csv, .xlsx, .xls</p>
                            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                            {error && (
                                <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                                    <AlertTriangle className="w-3.5 h-3.5" /> {error}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="w-5 h-5" /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-800 truncate">{parsed.fileName}</p>
                                    <p className="text-xs text-slate-600">
                                        <span className="font-semibold text-emerald-700">{parsed.drivers.length} driver{parsed.drivers.length === 1 ? '' : 's'}</span> ready to import
                                        {parsed.skipped > 0 && <span className="text-amber-600"> · {parsed.skipped} row{parsed.skipped === 1 ? '' : 's'} skipped (missing name)</span>}
                                    </p>
                                </div>
                                <button onClick={reset} className="text-xs font-semibold text-blue-600 hover:underline shrink-0">Choose another</button>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {parsed.drivers.slice(0, 12).map((d, i) => (
                                    <span key={i} className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">{d.name}</span>
                                ))}
                                {parsed.drivers.length > 12 && <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200">+{parsed.drivers.length - 12} more</span>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                    <button onClick={close} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-white bg-white">Cancel</button>
                    <button onClick={doImport} disabled={!parsed} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
                        <UploadCloud className="w-4 h-4" /> Import{parsed ? ` ${parsed.drivers.length}` : ''} driver{parsed && parsed.drivers.length === 1 ? '' : 's'}
                    </button>
                </div>
            </div>
        </div>
    );
}
