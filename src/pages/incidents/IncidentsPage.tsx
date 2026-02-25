
import { useState, useMemo, useRef, useEffect } from "react";
import { MOCK_DRIVERS } from "@/data/mock-app-data";
import { INITIAL_ASSETS } from "../assets/assets.data";
import { Toggle } from "@/components/ui/toggle";
import { INCIDENTS } from "./incidents.data";
import { useAppData } from "@/context/AppDataContext";
import {
  AlertTriangle,
  Shield,
  DollarSign,

  Activity,
  X,
  Search,
  Calendar,
  Edit,
  MapPin,

  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  UploadCloud,
  FileText,
  User,
  UserX,
  Truck,
  Camera,
  HelpCircle,
  Video,
  Wifi,
} from "lucide-react";




// --- HELPER COMPONENTS ---

const fmt = (v: any) =>
  v == null ? "—" : typeof v === "number" ? `$${v.toLocaleString()}` : v;
const fmtDateTime = (d: string) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

const fmtDate = (d: string) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : "—";

const StatusBadge = ({ value }: { value: string }) => {
  const styles: Record<string, string> = {
    preventable: "bg-red-50 text-red-600 border border-red-100",
    non_preventable: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    tbd: "bg-amber-50 text-amber-600 border border-amber-100",
    unknown: "bg-gray-50 text-gray-500 border border-gray-100",
  };
  const labels: Record<string, string> = {
    preventable: "PREVENTABLE",
    non_preventable: "NON-PREVENTABLE",
    tbd: "TBD",
    unknown: "UNKNOWN",
  };
  
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide ${
        styles[value] || styles.unknown
      }`}
    >
      {labels[value] || value}
    </span>
  );
};

const preventBadge = (v: string) => <StatusBadge value={v} />;

const sourceBadge = (s: string) => {
  const map: any = {
    fmcsa_crash_feed: { l: "FMCSA", c: "bg-blue-100 text-blue-800 border-blue-200" },
    ui_accident_table: { l: "UI", c: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    insurance_loss_register: { l: "Ins", c: "bg-purple-100 text-purple-800 border-purple-200" },
  };
  const def = { l: s, c: "bg-gray-100 text-gray-800 border-gray-200" };
  const { l, c } = map[s] || def;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${c}`}>
      {l}
    </span>
  );
};



const boolCell = (v: boolean) =>
  v === true ? (
    <span className="text-red-600 font-bold text-xs">YES</span>
  ) : v === false ? (
    <span className="text-gray-400 text-xs">No</span>
  ) : (
    <span className="text-gray-300">—</span>
  );



const KpiCard = ({ icon: Icon, label, value, sub, accent }: any) => (
  <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm flex items-start justify-between min-h-[100px]">
    <div className="flex flex-col justify-between h-full">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">
          {value}
        </p>
        {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent} shrink-0 bg-opacity-10`}
    >
      <Icon size={18} className={`${accent.replace('bg-', 'text-').replace('/10', '')}`} />
    </div>
  </div>
);

const Sect = ({ title, children }: any) => (
  <div className="mb-5">
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
      {title}
    </h3>
    {children}
  </div>
);

const Fld = ({ l, v, full, blue }: any) => (
  <div className={full ? "col-span-2" : ""}>
    <p className="text-xs text-gray-400 mb-0.5">{l}</p>
    <p
      className={`text-sm font-medium break-words ${
        blue ? "text-blue-600" : "text-gray-900"
      }`}
    >
      {v ?? "—"}
    </p>
  </div>
);

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

const Avatar = ({ name }: { name: string }) => {
  const colors = [
    "bg-blue-100 text-blue-600",
    "bg-emerald-100 text-emerald-600",
    "bg-purple-100 text-purple-600",
    "bg-amber-100 text-amber-600",
    "bg-rose-100 text-rose-600",
  ];
  const colorIndex = name.length % colors.length;
  const colorClass = colors[colorIndex];

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${colorClass} shrink-0`}>
      {getInitials(name)}
    </div>
  );
};

// --- MODALS ---

const Modal = ({ open, onClose, width, children }: any) => {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: width || 680,
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};


const DetailPopup = ({ inc, onClose, onEdit }: any) => {
  if (!inc) return null;
  return (
    <Modal open={!!inc} onClose={onClose} width={660}>
      {/* Fixed header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #e5e7eb",
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
            Settings / Accidents
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
                margin: 0,
              }}
            >
              Crash Report
            </h2>
            <span
              style={{
                fontSize: 11,
                background: "#eff6ff",
                color: "#2563eb",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 600,
                fontFamily: "monospace",
              }}
            >
              {inc.incidentId}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            Details of the event, vehicle and driver information.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(inc)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Edit size={13} />
            Edit
          </button>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <X size={16} color="#6b7280" />
          </button>
        </div>
      </div>
      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {/* Map */}
        <div
          style={{
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "linear-gradient(135deg,#f9fafb,#f3f4f6)",
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ textAlign: "center", color: "#9ca3af" }}>
            <MapPin size={20} style={{ margin: "0 auto 4px" }} />
            <p style={{ fontSize: 11, maxWidth: 320, margin: 0 }}>
              {inc.location.full}
            </p>
          </div>
        </div>
        <Sect title="Event Details">
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            <Fld l="Timestamp" v={fmtDateTime(inc.occurredAt)} />
            <Fld l="Accident Type" v={inc.cause?.incidentType} />
            <Fld l="Address" v={inc.location.full} full />
            <div className="col-span-2 grid grid-cols-2 gap-x-5">
              <Fld l="Primary Cause" v={inc.cause?.primaryCause} />
              <Fld l="Location Type" v={inc.location?.locationType} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Preventability</p>
              {preventBadge(inc.preventability.value)}
            </div>
            <Fld
              l="FMCSR 390.15"
              v={(inc.classification as any).fmcsr39015 || (inc.classification.fmcsaReportable ? "Yes" : "No")}
            />
          </div>
        </Sect>
        <div className="grid grid-cols-2 gap-5">
          <Sect title="Vehicles & Cargo">
            <div className="space-y-4">
              {(inc.vehicles && inc.vehicles.length > 0 ? inc.vehicles : [{}]).map((veh: any, vi: number) => (
                <div key={vi}>
                  {/* Vehicle header with number + CMV badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      {inc.vehicles && inc.vehicles.length > 1 ? `Vehicle ${vi + 1}` : "Vehicle"}
                    </span>
                    {veh.assetCategory && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        veh.assetCategory === "CMV"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {veh.assetCategory}
                      </span>
                    )}
                    {veh.assetId && (
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                        {veh.assetId}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {[
                      ["Make / Model", veh.make && veh.model ? `${veh.make} ${veh.model}` : (veh.make || veh.model)],
                      ["Year", veh.year],
                      ["Vehicle Type", veh.vehicleType],
                      ["VIN", veh.vin],
                      ["License Plate", veh.licenseNumber],
                      veh.commodityType ? ["Commodity", veh.commodityType] : null,
                    ].filter(Boolean).map(([l, v]: any, i) => (
                      <Fld key={i} l={l} v={v} />
                    ))}
                  </div>
                  {vi < (inc.vehicles?.length ?? 1) - 1 && <hr className="border-gray-100 mt-3" />}
                </div>
              ))}
            </div>
          </Sect>
          <Sect title="Commodity">
            <div className="space-y-2">
              <Fld l="Commodity Type" v={(inc as any).commodityType || inc.vehicles?.[0]?.commodityType || "\u2014"} />
              <Fld l="Commodity Loss" v={(inc as any).commodityLoss ? "Yes" : "No"} />
            </div>
          </Sect>
          <Sect title="Driver">
            <div className="space-y-2">
              <Fld l="Name" v={inc.driver.name} />
              <Fld l="Driver Type" v={inc.driver.driverType} />
              <Fld l="Email" v={inc.driver.email} blue />
              <Fld l="Phone" v={inc.driver.phone} blue />
              <Fld l="License" v={inc.driver.license} />
              <Fld l="License State" v={inc.driver.licenseState} />
              <Fld l="Age Band" v={inc.driver.ageBand} />
              <Fld l="Driving Experience" v={inc.driver.drivingExperience} />
              <Fld l="Length of Employment" v={inc.driver.lengthOfEmployment} />
            </div>
          </Sect>
        </div>
        <Sect title="Severity & Costs">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              {
                l: "Fatalities",
                v: inc.severity.fatalities,
                bad: inc.severity.fatalities > 0,
              },
              {
                l: "Injuries",
                v: inc.severity.injuriesNonFatal,
                bad: inc.severity.injuriesNonFatal > 0,
              },
              {
                l: "Tow Away",
                v: inc.severity.towAway ? "Yes" : "No",
                bad: inc.severity.towAway,
              },
              {
                l: "HAZMAT",
                v: inc.severity.hazmatReleased ? "Yes" : "No",
                bad: inc.severity.hazmatReleased,
              },
            ].map((s: any, i) => (
              <div
                key={i}
                className={`rounded-lg border p-2 text-center ${
                  s.bad
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                <p className="text-base font-bold">{s.v}</p>
                <p className="text-xs">{s.l}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            <Fld
              l="Company Costs"
              v={fmt(inc.costs.companyCostsFromDollarOne)}
            />
            <Fld l="Insurance Paid" v={fmt(inc.costs.insuranceCostsPaid)} />
            <Fld l="Insurance Reserves" v={fmt(inc.costs.insuranceReserves)} />
            <Fld l="Total Costs" v={fmt(inc.costs.totalAccidentCosts)} />
          </div>
        </Sect>
        <Sect title="Documents Linked">
          <div className="flex flex-wrap gap-3">
            {[
              { id: "policeReport", icon: Shield, color: "text-blue-700 bg-blue-50 border-blue-200", title: "Police Report" },
              { id: "insuranceClaim", icon: DollarSign, color: "text-emerald-700 bg-emerald-50 border-emerald-200", title: "Insurance Claim" },
              { id: "medicalReport", icon: Activity, color: "text-rose-700 bg-rose-50 border-rose-200", title: "Medical Report" },
              { id: "towReceipt", icon: Truck, color: "text-amber-700 bg-amber-50 border-amber-200", title: "Tow Receipt" },
              { id: "accidentPhoto", icon: Camera, color: "text-purple-700 bg-purple-50 border-purple-200", title: "Photos" },
              { id: "telemetry", icon: Wifi, color: "text-teal-700 bg-teal-50 border-teal-200", title: "Telemetry" },
            ].map((d) => {
              const active = ((inc.documents as string[]) || []).includes(d.id);
              return (
                <div 
                  key={d.id} 
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    active ? d.color : "bg-gray-50 border-gray-100 text-gray-400 grayscale opacity-60"
                  }`}
                >
                  <d.icon size={16} />
                  <span>{d.title}</span>
                  {active && <span className="ml-1">✓</span>}
                </div>
              );
            })}
          </div>
        </Sect>
        <Sect title="Road & Conditions">
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            <Fld l="Road Type" v={inc.roadway.roadType} />
            <Fld
              l="Speed Limit"
              v={
                inc.roadway.postedSpeedLimitKmh
                  ? `${inc.roadway.postedSpeedLimitKmh} km/h`
                  : null
              }
            />
            <Fld l="Weather" v={inc.roadway.weatherConditions} />
            <Fld l="Road Conditions" v={inc.roadway.roadConditions} />
            <Fld l="Terrain" v={inc.roadway.terrain} />
            <Fld l="Light" v={inc.roadway.light} />
          </div>
        </Sect>
        <Sect title="Sources">
          <div className="flex gap-2 flex-wrap">
            {inc.sources.map((s: any, i: number) => (
              <span key={i}>{sourceBadge(s)}</span>
            ))}
          </div>
        </Sect>
      </div>
      {/* Fixed footer */}
      <div
        style={{
          padding: "12px 24px",
          borderTop: "1px solid #e5e7eb",
          flexShrink: 0,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: "8px 20px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "#4b5563",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Close
        </button>
        <button
          onClick={() => onEdit(inc)}
          style={{
            padding: "8px 20px",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: "#2563eb",
            cursor: "pointer",
          }}
        >
          Edit Accident
        </button>
      </div>
    </Modal>
  );
};


const EditPopup = ({ inc, onClose, onSave }: any) => {
  if (!inc) return null;
  const [form, setForm] = useState(JSON.parse(JSON.stringify(inc)));

  // Accident document types from AppDataContext
  const { documents: allDocs } = useAppData();
  const accidentDocTypes = allDocs.filter((d: any) => d.isAccidentDoc);

  const u = (s: string, f: string, v: any) =>
    setForm((p: any) => {
      const next = { ...p, [s]: { ...p[s], [f]: v } };
      // Smart Cost Calculation
      if (s === "costs" && f !== "currency") {
        const c = next.costs;
        const total =
          (Number(c.companyCostsFromDollarOne) || 0) +
          (Number(c.insuranceCostsPaid) || 0) +
          (Number(c.insuranceReserves) || 0);
        next.costs.totalAccidentCosts = total;
      }
      return next;
    });

  // Per-doc-type file upload handler
  const handleAccidentDocUpload = (typeId: string, e: any) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((f: any) => ({
        name: f.name,
        typeId,
        date: new Date().toISOString(),
        size: (f.size / 1024).toFixed(1) + " KB",
      }));
      setForm((p: any) => ({
        ...p,
        accidentDocuments: {
          ...(p.accidentDocuments || {}),
          [typeId]: [
            ...((p.accidentDocuments || {})[typeId] || []),
            ...newFiles,
          ],
        },
      }));
    }
    // reset so same file can be re-selected
    e.target.value = "";
  };

  const removeAccidentDoc = (typeId: string, idx: number) => {
    setForm((p: any) => ({
      ...p,
      accidentDocuments: {
        ...(p.accidentDocuments || {}),
        [typeId]: ((p.accidentDocuments || {})[typeId] || []).filter(
          (_: any, i: number) => i !== idx
        ),
      },
    }));
  };

  const Inp = ({ l, s, f, type = "text", full }: any) => (
    <div className={full ? "col-span-2" : ""}>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {l}
      </label>
      <input
        type={type}
        value={form[s]?.[f] ?? ""}
        onChange={(e) =>
          u(s, f, type === "number" ? Number(e.target.value) : e.target.value)
        }
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
    </div>
  );

  const LocInp = ({ l, f, full, half }: any) => (
    <div className={full ? "col-span-2" : half ? "" : ""}>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {l}
      </label>
      <input
        value={form.location?.[f] ?? ""}
        onChange={(e) => u("location", f, e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
    </div>
  );

  const Sel = ({ l, s, f, opts, full }: any) => (
    <div className={full ? "col-span-2" : ""}>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {l}
      </label>
      <select
        value={form[s]?.[f] ?? ""}
        onChange={(e) => u(s, f, e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
      >
        <option value="" disabled>
          Select...
        </option>
        {opts.map((o: any) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
  const Chk = ({ l, s, f }: any) => (
  <div className="flex items-center gap-3 pt-5">
    <Toggle
      checked={!!form[s]?.[f]}
      onCheckedChange={(val) => u(s, f, val)}
    />
    <label className="text-sm text-gray-700 font-medium">{l}</label>
  </div>
);

  const strOpts = (arr: string[]) => arr.map((x) => ({ v: x, l: x }));

  return (
    <Modal open={!!inc} onClose={onClose} width={720}>
      {/* Fixed header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #e5e7eb",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Edit size={16} color="#2563eb" />
          </div>
          <div>

            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#111827",
                margin: 0,
              }}
            >
              {inc.incidentId ? "Edit Accident" : "New Accident"}
            </h2>
            {inc.incidentId && (
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                {inc.incidentId}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          <X size={16} color="#6b7280" />
        </button>
      </div>
      {/* Scrollable form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <Sect title="Event Details">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Date of Loss (mm/dd/yy)
              </label>
              <input
                type="datetime-local"
                value={form.occurredAt?.slice(0, 16) || ""}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, occurredAt: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <Sel
              l="Accident Type"
              s="cause"
              f="incidentType"
              opts={strOpts([
                "Lost Control/Jackknife/Rollover",
                "Head-on Collision",
                "Rearend Collision",
                "Intersection",
                "Pedestrian",
                "Sideswipe - High Speed",
                "Sideswipe - Low Speed",
                "Backing",
                "Struck Object",
                "Animal Strike",
                "Parking Lot",
                "Hit While Parked",
                "Rearended By Other",
                "Equipment Fire",
                "Equipment Theft",
                "Cargo Theft",
                "Temperature Damage",
                "Water Damage",
                "Load Shift",
                "Load Transfer Damage",
                "Cargo Damage",
                "Miscellaneous",
              ])}
            />
            <Sel
              l="Primary Cause"
              s="cause"
              f="primaryCause"
              opts={strOpts([
                "Fatigue",
                "Load Securement",
                "Mechanical Failure",
                "Unsafe Behaviour",
                "Cargo Transfer",
                "Driver Health",
                "Third Party",
                "Unknown",
              ])}
            />
            <Sel
              l="Preventability"
              s="preventability"
              f="value"
              opts={[
                { v: "tbd", l: "TBD" },
                { v: "preventable", l: "Preventable" },
                { v: "non_preventable", l: "Non-Preventable" },
                { v: "unknown", l: "Unknown" },
              ]}
            />
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-xs font-medium text-gray-500">FMCSR 390.15</label>
                <div className="relative group/fmcsr">
                  <HelpCircle size={13} className="text-gray-400 cursor-help" />
                  <div className="absolute top-full left-0 mt-1 w-[420px] max-h-[340px] overflow-y-auto p-3 bg-gray-900 text-white text-[10px] leading-relaxed rounded-lg opacity-0 invisible group-hover/fmcsr:opacity-100 group-hover/fmcsr:visible pointer-events-none group-hover/fmcsr:pointer-events-auto transition-all z-[9999] shadow-2xl border border-gray-700">
                    <p className="font-bold text-[11px] mb-1.5">FMCSR - November 1, 2017</p>
                    <p className="font-bold mb-1">§390.15 Assistance in investigations and special studies.</p>
                    <p className="mb-1">(a) Each motor carrier and intermodal equipment provider must do the following:</p>
                    <p className="ml-2 mb-1">(1) Make all records and information pertaining to an accident available to an authorized representative or special agent of the Federal Motor Carrier Safety Administration, an authorized State or local enforcement agency representative, or authorized third party representative within such time as the request or investigation may specify.</p>
                    <p className="ml-2 mb-1">(2) Give an authorized representative all reasonable assistance in the investigation of any accident, including providing a full, true, and correct response to any question of the inquiry.</p>
                    <p className="mb-1">(b) For accidents that occur after April 29, 2003, motor carriers must maintain an accident register for three years after the date of each accident. For accidents that occurred on or prior to April 29, 2003, motor carriers must maintain an accident register for a period of one year after the date of each accident. Information placed in the accident register must contain at least the following:</p>
                    <p className="ml-2 mb-0.5">(1) A list of accidents as defined at §390.5 of this chapter containing for each accident:</p>
                    <p className="ml-4 mb-0.5">(i) Date of accident.</p>
                    <p className="ml-4 mb-0.5">(ii) City or town, or most near, where the accident occurred and the State where the accident occurred.</p>
                    <p className="ml-4 mb-0.5">(iii) Driver Name.</p>
                    <p className="ml-4 mb-0.5">(iv) Number of injuries.</p>
                    <p className="ml-4 mb-0.5">(v) Number of fatalities.</p>
                    <p className="ml-4 mb-1">(vi) Whether hazardous materials, other than fuel spilled from the fuel tanks of motor vehicle involved in the accident, were released.</p>
                    <p className="ml-2 mb-2">(2) Copies of all accident reports required by State or other governmental entities or insurers.</p>
                    <hr className="border-gray-600 my-2" />
                    <p className="font-bold mb-1">§390.5 Definitions.</p>
                    <p className="mb-1"><span className="font-semibold">Accident</span> means:</p>
                    <p className="ml-2 mb-0.5">(1) Except as provided in paragraph (2) of this definition, an occurrence involving a commercial motor vehicle operating on a highway in interstate or intrastate commerce which results in:</p>
                    <p className="ml-4 mb-0.5">(i) A fatality;</p>
                    <p className="ml-4 mb-0.5">(ii) Bodily injury to a person who, as a result of the injury, immediately receives medical treatment away from the scene of the accident; or</p>
                    <p className="ml-4 mb-1">(iii) One or more motor vehicles incurring disabling damage as a result of the accident, requiring the motor vehicle(s) to be transported away from the scene by a tow truck or other motor vehicle.</p>
                    <p className="ml-2 mb-0.5">(2) The term accident does not include:</p>
                    <p className="ml-4 mb-0.5">(i) An occurrence involving only boarding and alighting from a stationary motor vehicle; or</p>
                    <p className="ml-4">(ii) An occurrence involving only the loading or unloading of cargo.</p>
                  </div>
                </div>
              </div>
              <select
                value={form.classification?.fmcsr39015 ?? form.classification?.accidentType ?? ""}
                onChange={(e) => u("classification", "fmcsr39015", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="" disabled>Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Not Applicable">Not Applicable</option>
              </select>
            </div>
            <div className="flex flex-col justify-end pb-2">
              <Chk
                l="Police Report Obtained?"
                s="classification"
                f="policeReport"
              />
            </div>
          </div>
        </Sect>

        <Sect title="Location">
          <div className="grid grid-cols-4 gap-x-4 gap-y-3">
            <div className="col-span-1">
              <LocInp l="Unit #" f="unit" />
            </div>
            <div className="col-span-3">
              <LocInp l="Street Address" f="streetAddress" />
            </div>
            <div className="col-span-2">
              <LocInp l="City" f="city" />
            </div>
            <div className="col-span-2">
              <LocInp l="State/Prov" f="stateOrProvince" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Country
              </label>
              <select
                value={form.location?.country ?? "USA"}
                onChange={(e) => u("location", "country", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="USA">USA</option>
                <option value="Canada">Canada</option>
              </select>
            </div>
            <div className="col-span-2">
              <LocInp l="Zip / Pin Code" f="zip" />
            </div>
            <Sel
              l="Location Type"
              s="location"
              f="locationType"
              full
              opts={strOpts([
                "Urban Area",
                "Industrial Area",
                "Rural Area",
                "Company Terminal",
                "Shipper",
                "Receiver",
                "Truck Stop",
              ])}
            />
          </div>
        </Sect>

        <Sect title="Road & Environment">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Sel
              l="Road Conditions"
              s="roadway"
              f="roadConditions"
              opts={strOpts([
                "Black Ice",
                "Dry",
                "Wet",
                "Icy",
                "Slush",
                "Snow Covered",
                "Pooling Water",
              ])}
            />
            <Sel
              l="Terrain"
              s="roadway"
              f="terrain"
              opts={strOpts([
                "Downhill",
                "Uphill",
                "Straight and Flat",
                "Curve Left",
                "Curve Right",
                "Hill With Curve",
                "Other",
              ])}
            />
            <Inp l="Weather" s="roadway" f="weatherConditions" />
            <Inp l="Light" s="roadway" f="light" />
            <Sel
              l="Road Type"
              s="roadway"
              f="roadType"
              opts={strOpts([
                "Urban",
                "Rural",
                "Highway",
                "Interstate",
                "Private Property",
                "Parking Lot",
              ])}
            />
            <Inp
              l="Posted Speed Limit (km/h)"
              s="roadway"
              f="postedSpeedLimitKmh"
              type="number"
            />
            <Sel
              l="Traffic Control Device"
              s="roadway"
              f="trafficControl"
              opts={strOpts([
                "None",
                "Traffic Signal",
                "Stop Sign",
                "Yield Sign",
                "Rail Crossing",
                "Construction Zone",
              ])}
            />
          </div>
        </Sect>

        <Sect title="Driver Information">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Select Driver</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                value={MOCK_DRIVERS.find(d => d.name === form.driver?.name)?.id || ""}
                onChange={(e) => {
                  const d = MOCK_DRIVERS.find(x => x.id === e.target.value);
                  if (d) {
                    // Calc Age Band
                    let ageBand = "Unknown";
                    if (d.dob) {
                       const age = new Date().getFullYear() - new Date(d.dob).getFullYear();
                       if (age < 21) ageBand = "Under 21";
                       else if (age <= 25) ageBand = "21 - 25";
                       else if (age <= 30) ageBand = "26 - 30";
                       else if (age <= 35) ageBand = "31 - 35";
                       else if (age <= 40) ageBand = "36 - 40";
                       else if (age <= 45) ageBand = "41 - 45";
                       else if (age <= 50) ageBand = "46 - 50";
                       else if (age <= 55) ageBand = "51 - 55";
                       else if (age <= 60) ageBand = "56 - 60";
                       else ageBand = "Over 65";
                    }
                    
                    // Calc Employment Length
                    let empLen = "";
                    if (d.hiredDate) {
                        const years = new Date().getFullYear() - new Date(d.hiredDate).getFullYear();
                        empLen = years < 1 ? "< 1 Year" : `${years} Years`;
                    }

                    // Calc Driving Experience
                    let totalMonths = 0;
                    if (d.employmentHistory && Array.isArray(d.employmentHistory)) {
                        d.employmentHistory.forEach((h: any) => {
                            if (h.startDate && h.endDate) {
                                const start = new Date(h.startDate);
                                const end = new Date(h.endDate);
                                const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                                if (months > 0) totalMonths += months;
                            }
                        });
                    }
                    // Add current employment
                    if (d.hiredDate) {
                        const start = new Date(d.hiredDate);
                        const end = new Date();
                        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                        if (months > 0) totalMonths += months;
                    }
                    const yearsExp = Math.floor(totalMonths / 12);
                    const monthsExp = totalMonths % 12;
                    const drivingExperience = `${yearsExp} Years${monthsExp > 0 ? `, ${monthsExp} Months` : ''}`;

                    setForm((p: any) => ({
                      ...p,
                      driver: {
                        ...p.driver,
                        name: d.name,
                        driverType: d.driverType || "Company",
                        email: d.email,
                        phone: d.phone,
                        license: d.licenseNumber,
                        licenseState: d.licenseState,
                        ageBand,
                        sinNumber: d.ssn || "",
                        lengthOfEmployment: empLen,
                        drivingExperience
                      }
                    }));
                  }
                }}
              >
                <option value="">-- Select Driver --</option>
                {MOCK_DRIVERS.map(d => {
                  const maskedSin = d.ssn ? `***-**-${d.ssn.slice(-4)}` : '';
                  const plate = d.licenseNumber || '';
                  return (
                    <option key={d.id} value={d.id}>{d.firstName} {d.lastName}{plate ? ` | ${plate}` : ''}{maskedSin ? ` | SIN: ${maskedSin}` : ''}</option>
                  );
                })}
              </select>
            </div>
            {/* Hidden Name + SIN Inputs (populated by select) */}
            <div className="hidden">
                 <Inp l="Name" s="driver" f="name" />
                 <Inp l="SIN" s="driver" f="sinNumber" />
            </div>

            {/* Auto-populated fields - hidden from form, shown in table columns */}
            <div className="hidden">
              <Inp l="Driver Type" s="driver" f="driverType" />
              <Inp l="Email" s="driver" f="email" />
              <Inp l="Phone" s="driver" f="phone" />
              <Inp l="License" s="driver" f="license" />
              <Inp l="License State" s="driver" f="licenseState" />
              <Inp l="Driving Experience" s="driver" f="drivingExperience" />
            </div>
            {/* Length of Employment - auto-populated, hidden */}
            <Inp
              l="Hrs Driving at Crash"
              s="driver"
              f="hrsDriving"
              type="number"
            />
            <Inp
              l="Hrs On Duty at Crash"
              s="driver"
              f="hrsOnDuty"
              type="number"
            />
          </div>
        </Sect>
        <Sect title="Vehicles Involved">
          <div className="space-y-4">
            {((form.vehicles && form.vehicles.length > 0) ? form.vehicles : [{ assetId: "", vin: "", licenseNumber: "", licenseStateOrProvince: "", vehicleType: "", make: "", model: "", year: "", commodityType: "" }]).map((veh: any, vi: number) => (
              <div key={vi} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Vehicle {vi + 1}</span>
                  {vi > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm((p: any) => ({ ...p, vehicles: (p.vehicles || []).filter((_: any, i: number) => i !== vi) }))}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                      title="Remove vehicle"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Select Asset (Unit #)</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      value={INITIAL_ASSETS.find((a: any) => a.unitNumber === veh.assetId)?.id || ""}
                      onChange={(e) => {
                        const a = INITIAL_ASSETS.find((x: any) => x.id === e.target.value);
                        if (a) {
                          setForm((p: any) => {
                            const vehicles = [...(p.vehicles && p.vehicles.length > 0 ? p.vehicles : [{}])];
                            vehicles[vi] = { ...vehicles[vi], assetId: a.unitNumber, vehicleType: a.vehicleType || a.assetType, make: a.make, model: a.model, year: a.year, vin: a.vin, licenseNumber: a.plateNumber };
                            return { ...p, vehicles };
                          });
                        }
                      }}
                    >
                      <option value="">-- Select Asset --</option>
                      {INITIAL_ASSETS.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.unitNumber} - {a.make} {a.model}</option>
                      ))}
                    </select>
                  </div>
                  {/* Auto-populated vehicle fields - hidden from form, shown in table */}
                  <div className="hidden">
                    <input type="hidden" value={veh.vehicleType ?? ""} />
                    <input type="hidden" value={veh.make ?? ""} />
                    <input type="hidden" value={veh.model ?? ""} />
                    <input type="hidden" value={veh.vin ?? ""} />
                    <input type="hidden" value={veh.licenseNumber ?? ""} />
                    <input type="hidden" value={veh.year ?? ""} />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm((p: any) => ({ ...p, vehicles: [...(p.vehicles && p.vehicles.length > 0 ? p.vehicles : [{}]), { assetId: "", vin: "", licenseNumber: "", licenseStateOrProvince: "", vehicleType: "", make: "", model: "", year: "" }] }))}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 rounded-lg px-4 py-2 transition"
            >
              <Plus size={14} />
              Add Vehicle
            </button>
          </div>
        </Sect>
        <Sect title="Commodity">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Commodity Type</label>
              <select
                value={form.commodityType ?? form.vehicles?.[0]?.commodityType ?? ""}
                onChange={(e) => setForm((p: any) => ({ ...p, commodityType: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">Select...</option>
                {["Household Move","General Dry Freight","Auto Parts","Dry Food Products","Electronics","Temperature Controlled","General Flatbed Cargo"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-3">
                <Toggle
                  checked={!!form.commodityLoss}
                  onCheckedChange={(val) => setForm((p: any) => ({ ...p, commodityLoss: val }))}
                />
                <span className="text-sm text-gray-700 font-medium">Commodity Loss</span>
              </div>
            </div>
          </div>
        </Sect>
        <Sect title="Severity">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Inp l="Number of Fatalities" s="severity" f="fatalities" type="number" />
            <Inp
              l="Number of Injuries"
              s="severity"
              f="injuriesNonFatal"
              type="number"
            />
            <Inp
              l="Number of Vehicles Towed"
              s="severity"
              f="vehiclesTowed"
              type="number"
            />
            <div />
            <Chk l="Tow Away" s="severity" f="towAway" />
            <Chk l="HAZMAT Spilled/Released" s="severity" f="hazmatReleased" />
            {form.severity?.hazmatReleased && (
              <Inp
                l="Hazardous Commodity"
                s="severity"
                f="hazardousCommodity"
                full
              />
            )}
          </div>
        </Sect>
        <Sect title="Cost Analysis">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Sel
              l="Currency"
              s="costs"
              f="currency"
              opts={[
                { v: "USD", l: "USD ($)" },
                { v: "CAD", l: "CAD (C$)" },
              ]}
            />
            <div />
            <Inp
              l="Company Costs From Dollar One"
              s="costs"
              f="companyCostsFromDollarOne"
              type="number"
            />
            <Inp
              l="Insurance Costs (Paid)"
              s="costs"
              f="insuranceCostsPaid"
              type="number"
            />
            <Inp
              l="Insurance Reserves"
              s="costs"
              f="insuranceReserves"
              type="number"
            />
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Total Accident Costs
              </label>
              <div className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800">
                {form.costs?.currency === "CAD" ? "C$ " : "$ "}
                {(form.costs?.totalAccidentCosts || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </Sect>
        <Sect title="Admin & Follow Up">
          <div className="grid grid-cols-1 gap-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Driver Follow-Up Training/Action
              </label>
              <textarea
                rows={2}
                value={form.followUp?.action ?? ""}
                onChange={(e) => u("followUp", "action", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Additional Comments
              </label>
              <textarea
                rows={2}
                value={form.followUp?.comments ?? ""}
                onChange={(e) => u("followUp", "comments", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </Sect>
        <Sect title="Video Evidence">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer mb-3"
            onClick={() => document.getElementById('video-upload')?.click()}
          >
            <input
              id="video-upload"
              type="file"
              multiple
              accept=".mp4,.mov,.avi,.webm"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  setForm((p: any) => ({
                    ...p,
                    videoEvidence: [
                      ...(p.videoEvidence || []),
                      ...files.map((f) => ({ name: f.name, size: `${(f.size / 1024).toFixed(1)} KB`, type: f.type })),
                    ],
                  }));
                }
                e.target.value = '';
              }}
            />
            <Video className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-blue-600">Click to upload</span> or drag & drop video files
            </p>
            <p className="text-[10px] text-gray-400 mt-1">MP4, MOV, AVI, WEBM</p>
          </div>
          {(form.videoEvidence || []).length > 0 && (
            <div className="space-y-2">
              {(form.videoEvidence || []).map((v: any, vi: number) => (
                <div key={vi} className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Video size={13} className="text-violet-500 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-800 line-clamp-1">{v.name}</p>
                      <p className="text-[10px] text-gray-400">{v.size}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setForm((p: any) => ({ ...p, videoEvidence: (p.videoEvidence || []).filter((_: any, i: number) => i !== vi) }))}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove video"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Sect>
        <Sect title="Accident Documents">
          <p className="text-xs text-gray-400 mb-4">
            Each document type is part of this accident record and cannot be removed. You can upload one or more files per type.
          </p>
          <div className="space-y-4">
            {accidentDocTypes.map((docTypeItem: any) => {
              const uploaded: any[] = (form.accidentDocuments || {})[docTypeItem.id] || [];
              const inputId = `acc-doc-${docTypeItem.id}`;
              const isRequired = docTypeItem.requirementLevel === 'required';
              return (
                <div key={docTypeItem.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText size={13} />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{docTypeItem.name}</span>
                    {isRequired ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">Required</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">Optional</span>
                    )}
                  </div>

                  {/* Drag & Drop Upload Box */}
                  <div
                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer mb-3"
                    onClick={() => document.getElementById(inputId)?.click()}
                  >
                    <input
                      id={inputId}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.docx"
                      className="hidden"
                      onChange={(e) => handleAccidentDocUpload(docTypeItem.id, e)}
                    />
                    <UploadCloud className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">Click to upload or drag &amp; drop</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX, JPG, PNG up to 10MB</p>
                  </div>

                  {/* Uploaded Files List */}
                  {uploaded.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Files ({uploaded.length})</p>
                      {uploaded.map((f: any, fi: number) => (
                        <div key={fi} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                          <div className="flex items-center gap-2">
                            <FileText size={13} className="text-blue-500 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-gray-800 line-clamp-1">{f.name}</p>
                              <p className="text-[10px] text-gray-400">{f.size}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeAccidentDoc(docTypeItem.id, fi)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            title="Remove this file"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Sect>
      </div>
      {/* Fixed footer */}
      <div
        style={{
          padding: "12px 24px",
          borderTop: "1px solid #e5e7eb",
          flexShrink: 0,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          background: "#fff",
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: "10px 22px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "#4b5563",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onSave(form);
            onClose();
          }}
          style={{
            padding: "10px 22px",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: "#2563eb",
            cursor: "pointer",
          }}
        >
          Save Changes
        </button>
      </div>
    </Modal>
  );
};

// --- MAIN PAGE ---


const ALL_COLS = [
  { id: "date", label: "Date of Loss", checked: true },
  { id: "claimNumber", label: "Insurance Claim #", checked: true },
  { id: "driverName", label: "Driver Name", checked: true },
  { id: "driverAge", label: "Driver Age", checked: true },
  { id: "driverType", label: "Driver Type", checked: true },
  { id: "drivingExperience", label: "Driving Experience", checked: true },
  { id: "sinNumber", label: "SIN Number", checked: false },
  { id: "city", label: "City (Closest)", checked: true },
  { id: "state", label: "Prov/State", checked: true },
  { id: "locationType", label: "Location Type", checked: true },
  { id: "roadType", label: "Road Type", checked: true },
  { id: "speedLimit", label: "Speed Limit (KM/H)", checked: true },
  { id: "terrain", label: "Terrain", checked: true },
  { id: "weather", label: "Weather", checked: true },
  { id: "roadConditions", label: "Road Conditions", checked: true },
  { id: "accidentType", label: "Accident Type", checked: true },
  { id: "primaryCause", label: "Primary Cause", checked: true },
  { id: "fmcsaType", label: "FMCSR 390.15", checked: true },
  { id: "status", label: "Status", checked: true },
  { id: "injuries", label: "Number of Injuries", checked: true },
  { id: "fatalities", label: "Number of Fatalities", checked: true },
  { id: "hazmat", label: "Hazmat Spilled", checked: true },
  { id: "tow", label: "Vehicles Towed", checked: true },
  { id: "cost", label: "Total Accident Costs", checked: true },
  { id: "companyCost", label: "Company Costs", checked: true },
  { id: "insurancePaid", label: "Insurance Paid", checked: true },
  { id: "vehicleType", label: "Vehicle Type", checked: true },
  { id: "vehicle", label: "Vehicle", checked: true },
  { id: "vin", label: "VIN", checked: true },
  { id: "commodityType", label: "Commodity Type", checked: true },
  { id: "commodityLoss", label: "Commodity Loss", checked: true },
  { id: "source", label: "Sources", checked: true },
  { id: "docs", label: "Docs", checked: true },
];

export function AccidentsPage() {
  const [data, setData] = useState(INCIDENTS);
  const [q, setQ] = useState("");

  const [selected, setSelected] = useState<string[]>([]);
  const [cols, setCols] = useState(ALL_COLS);
  const [colMenu, setColMenu] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);

  // Filters
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [driverFilter, setDriverFilter] = useState("All");
  const [driverMenu, setDriverMenu] = useState(false);


  const [activeTab, setActiveTab] = useState("all");
  const driverOptions = useMemo(
    () => ["All", ...Array.from(new Set(data.map((item) => item.driver.name))).sort()],
    [data]
  );

  const filtered = useMemo(() => {
    return data.filter((item) => {
      // 1. Text Search
      if (q) {
        const s = q.toLowerCase();
        const m = (v: any) => v?.toLowerCase().includes(s);
        const match =
          m(item.incidentId) ||
          m(item.driver.name) ||
          m(item.location.city) ||
          m(item.vehicles?.[0]?.assetId);
        if (!match) return false;
      }
      
      // 2. Tab Filter
      if (activeTab === "hazmat" && !item.severity.hazmatReleased) return false;
      if (activeTab === "tow" && !item.severity.towAway) return false;
      if (activeTab === "injuries" && item.severity.injuriesNonFatal === 0) return false;
      if (activeTab === "fatalities" && item.severity.fatalities === 0) return false;

      // 3. Date Period Filter
      const occurred = new Date(item.occurredDate);
      if (dateRange.start && occurred < new Date(`${dateRange.start}T00:00:00`)) return false;
      if (dateRange.end && occurred > new Date(`${dateRange.end}T23:59:59`)) return false;

      // 4. Driver Filter
      if (driverFilter !== "All" && item.driver.name !== driverFilter) return false;

      return true;
    });
  }, [data, q, activeTab, dateRange, driverFilter]);

  // Sorting
  const [sortCol] = useState("date");
  const [sortDesc] = useState(true);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: any = a.occurredDate;
      let vb: any = b.occurredDate;

      if (sortCol === "cost") {
        va = a.costs.totalAccidentCosts;
        vb = b.costs.totalAccidentCosts;
      }
      // ... Add more sort logic if needed

      if (va < vb) return sortDesc ? 1 : -1;
      if (va > vb) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [filtered, sortCol, sortDesc]);

  // Stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const cost = filtered.reduce((s, x) => s + x.costs.totalAccidentCosts, 0);
    const inj = filtered.reduce((s, x) => s + x.severity.injuriesNonFatal, 0);
    const fat = filtered.reduce((s, x) => s + x.severity.fatalities, 0);
    const prev = filtered.filter(
      (x) => x.preventability.value === "preventable"
    ).length;
    return { total, cost, inj, fat, prev };
    return { total, cost, inj, fat, prev };
  }, [filtered]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, currentPage, rowsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filtered, rowsPerPage]);

  // Bulk Actions
  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((x) => x.incidentId));
  };
  const toggleOne = (id: string) => {
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );
  };

  const handleSave = (updated: any) => {
    setData((prev) => {
      const exists = prev.find((x) => x.incidentId === updated.incidentId);
      if (exists) {
        return prev.map((item) =>
          item.incidentId === updated.incidentId ? updated : item
        );
      }
      // Create new
      const newVal = {
         ...updated,
         incidentId: updated.incidentId || `INC-${new Date().getFullYear()}-${String(prev.length + 1).padStart(3, '0')}`,
         // Ensure required objects exist
         driver: updated.driver || {},
         vehicle: updated.vehicle || {},
         location: updated.location || {},
         roadway: updated.roadway || {},
         cause: updated.cause || {},
         classification: updated.classification || {},
         severity: updated.severity || { injuriesNonFatal: 0, fatalities: 0, vehiclesTowed: 0, hazmatReleased: false, towAway: false },
         costs: updated.costs || { totalAccidentCosts: 0, companyCostsFromDollarOne: 0, insuranceCostsPaid: 0, insuranceReserves: 0, currency: 'USD' },
         preventability: updated.preventability || { value: 'tbd', label: 'TBD' },
         status: updated.status || { value: 'open', label: 'Open' },
         sources: updated.sources || ['ui_accident_feed'],
         occurredAt: updated.occurredAt || new Date().toISOString(),
         occurredDate: updated.occurredDate || new Date().toISOString().split('T')[0]
      };
      return [newVal, ...prev];
    });
    if (detail?.incidentId === updated.incidentId) setDetail(updated);
  };
  
  const colVis = (id: string) => cols.find((c) => c.id === id)?.checked;

  const colRef = useRef<any>(null);
  const driverRef = useRef<any>(null);
  useEffect(() => {
    const h = (e: any) => {
      if (colRef.current && !colRef.current.contains(e.target))
        setColMenu(false);
      if (driverRef.current && !driverRef.current.contains(e.target))
        setDriverMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  });

  const resetFilters = () => {
    setDateRange({ start: "", end: "" });
    setDriverFilter("All");
    setQ("");
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accidents</h1>
          <p className="text-sm text-gray-500">
            Track and manage vehicle accidents and safety events.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <Upload size={16} /> Export
          </button>
          <button 
             onClick={() => setEditing({})}
             className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm shadow-blue-200">
            <Plus size={16} /> Log Accident
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard
          icon={AlertTriangle}
          label="Total Accidents"
          value={stats.total}
          sub="Filtered View"
          accent="bg-blue-500/10 text-blue-600"
        />
        <KpiCard
          icon={DollarSign}
          label="Total Cost"
          value={`$${(stats.cost / 1000).toFixed(1)}k`}
          sub="Est. Liability"
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <KpiCard
          icon={Shield}
          label="Preventable"
          value={stats.prev}
          sub={`${((stats.prev / (stats.total || 1)) * 100).toFixed(0)}% Rate`}
          accent="bg-amber-500/10 text-amber-600"
        />
        <KpiCard
          icon={Activity}
          label="Injuries"
          value={stats.inj}
          sub="Non-Fatal"
          accent="bg-rose-500/10 text-rose-600"
        />
        <KpiCard
          icon={UserX}
          label="Fatalities"
          value={stats.fat}
          sub="Critical Events"
          accent="bg-gray-900/10 text-gray-900"
        />
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {[
            { id: "all", l: "All Accidents" },
            { id: "hazmat", l: "Hazmat" },
            { id: "tow", l: "Tow Away" },
            { id: "injuries", l: "Injuries" },
            { id: "fatalities", l: "Fatalities" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap pb-3 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.l}
            </button>
          ))}
        </nav>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
              </div>
              <span className="text-gray-400">-</span>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
              </div>
            </div>

            <div className="relative z-20" ref={driverRef}>
              <button
                onClick={() => setDriverMenu(!driverMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-600 transition-all shadow-sm"
              >
                <User size={16} />
                <span>Driver</span>
                <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-gray-100 rounded text-gray-700 min-w-[20px] text-center">
                  {driverFilter === "All" ? "All" : "1"}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {driverMenu && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl py-1 max-h-60 overflow-y-auto">
                  {driverOptions.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setDriverFilter(name);
                        setDriverMenu(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 ${
                        driverFilter === name ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"
                      }`}
                    >
                      {name === "All" ? "All Drivers" : name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={colRef}>
              <button
                onClick={() => setColMenu(!colMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <SlidersHorizontal size={16} /> Columns <ChevronDown size={16} className="text-gray-400" />
              </button>
              {colMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2">
                  <p className="text-xs font-bold text-gray-500 px-2 py-1 uppercase tracking-wider">
                    Show Columns
                  </p>
                  {cols.map((c: any) => (
                    <label
                      key={c.id}
                      className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={c.checked}
                        onChange={() =>
                          setCols((p) =>
                            p.map((x) =>
                              x.id === c.id ? { ...x, checked: !x.checked } : x
                            )
                          )
                        }
                        className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block" />
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4">
          <div className="relative w-full md:w-[420px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search incident ID, driver, city, asset..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
            />
          </div>
          <div className="text-sm text-gray-500 whitespace-nowrap md:border-l md:border-gray-200 md:pl-4">
            <span className="font-semibold text-gray-900">{filtered.length}</span> Records Found
          </div>
        </div>
      </div>

      {/* Table List View */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  {colVis("date") && <th className="px-4 py-3">Date of Loss</th>}
                  {colVis("claimNumber") && <th className="px-4 py-3">Insurance Claim #</th>}
                  {colVis("driverName") && <th className="px-4 py-3">Driver Name</th>}
                  {colVis("driverAge") && <th className="px-4 py-3">Driver Age</th>}
                  {colVis("driverType") && <th className="px-4 py-3">Driver Type</th>}
                  {colVis("drivingExperience") && <th className="px-4 py-3">Driving Experience</th>}
                  {colVis("sinNumber") && <th className="px-4 py-3">SIN Number</th>}
                  {colVis("city") && <th className="px-4 py-3">City (Closest)</th>}
                  {colVis("state") && <th className="px-4 py-3">Prov/State</th>}
                  {colVis("locationType") && <th className="px-4 py-3">Location Type</th>}
                  {colVis("roadType") && <th className="px-4 py-3">Road Type</th>}
                  {colVis("speedLimit") && <th className="px-4 py-3">Speed Limit (KM/H)</th>}
                  {colVis("terrain") && <th className="px-4 py-3">Terrain</th>}
                  {colVis("weather") && <th className="px-4 py-3">Weather</th>}
                  {colVis("roadConditions") && <th className="px-4 py-3">Road Conditions</th>}
                  {colVis("accidentType") && <th className="px-4 py-3">Accident Type</th>}
                  {colVis("primaryCause") && <th className="px-4 py-3">Primary Cause</th>}
                  {colVis("fmcsaType") && <th className="px-4 py-3">FMCSR 390.15</th>}
                  {colVis("status") && <th className="px-4 py-3">Status</th>}
                  {colVis("injuries") && <th className="px-4 py-3 text-center">Injuries</th>}
                  {colVis("fatalities") && <th className="px-4 py-3 text-center">Fatalities</th>}
                  {colVis("hazmat") && <th className="px-4 py-3 text-center">Hazmat</th>}
                  {colVis("tow") && <th className="px-4 py-3 text-center">Vehicles Towed</th>}
                  {colVis("cost") && <th className="px-4 py-3 text-right">Total Costs</th>}
                  {colVis("companyCost") && <th className="px-4 py-3 text-right">Company Costs</th>}
                  {colVis("insurancePaid") && <th className="px-4 py-3 text-right">Insurance Paid</th>}
                  {colVis("vehicleType") && <th className="px-4 py-3">Vehicle Type</th>}
                  {colVis("vehicle") && <th className="px-4 py-3">Vehicle</th>}
                  {colVis("vin") && <th className="px-4 py-3">VIN</th>}
                  {colVis("commodityType") && <th className="px-4 py-3">Commodity Type</th>}
                  {colVis("commodityLoss") && <th className="px-4 py-3 text-center">Commodity Loss</th>}
                  {colVis("source") && <th className="px-4 py-3">Sources</th>}
                  {colVis("docs") && <th className="px-4 py-3 text-center">Docs</th>}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.length > 0 ? (
                  paginatedData.map((item) => (
                    <tr
                      key={item.incidentId}
                      onClick={() => setDetail(item)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.includes(item.incidentId)}
                          onChange={() => toggleOne(item.incidentId)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      {colVis("date") && (
                        <td className="px-4 py-3 text-gray-500">
                          {fmtDate(item.occurredDate)}
                        </td>
                      )}
                      {colVis("claimNumber") && (
                        <td className="px-4 py-3 text-gray-900 font-medium">
                          {item.insuranceClaimNumber || "—"}
                        </td>
                      )}
                      {colVis("driverName") && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                             <Avatar name={item.driver.name} />
                             <span className="font-medium text-gray-900">{item.driver.name}</span>
                          </div>
                        </td>
                      )}
                      {colVis("driverAge") && (
                        <td className="px-4 py-3 text-gray-500">
                          {item.driver.ageBand}
                        </td>
                      )}
                      {colVis("driverType") && (
                        <td className="px-4 py-3 text-gray-500">
                          {item.driver.driverType}
                        </td>
                      )}
                      {colVis("drivingExperience") && (
                        <td className="px-4 py-3 text-gray-500">
                          {item.driver.drivingExperience || "—"}
                        </td>
                      )}
                      {colVis("sinNumber") && (
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                          {(item.driver as any).sinNumber ? `***-**-${(item.driver as any).sinNumber?.slice(-4) || ''}` : "\u2014"}
                        </td>
                      )}
                      {colVis("city") && (
                        <td className="px-4 py-3 text-gray-900">
                          {item.location.city}
                        </td>
                      )}
                      {colVis("state") && (
                        <td className="px-4 py-3 text-gray-500">
                          {item.location.stateOrProvince}
                        </td>
                      )}
                      {colVis("locationType") && (
                        <td className="px-4 py-3 text-gray-500">
                          {item.location.locationType}
                        </td>
                      )}
                      {colVis("roadType") && (
                        <td className="px-4 py-3 text-gray-500">
                          {item.roadway.roadType}
                        </td>
                      )}
                      {colVis("speedLimit") && (
                        <td className="px-4 py-3 text-gray-500">
                          {item.roadway.postedSpeedLimitKmh} km/h
                        </td>
                      )}
                      {colVis("terrain") && (
                        <td className="px-4 py-3 text-gray-500">
                          {item.roadway.terrain}
                        </td>
                      )}
                      {colVis("weather") && (
                        <td className="px-4 py-3 text-gray-500">
                          {item.roadway.weatherConditions}
                        </td>
                      )}
                      {colVis("roadConditions") && (
                        <td className="px-4 py-3 text-gray-500">
                          {item.roadway.roadConditions}
                        </td>
                      )}
                      {colVis("accidentType") && (
                        <td className="px-4 py-3 text-gray-900 font-medium">
                          {item.cause?.incidentType || "—"}
                        </td>
                      )}
                      {colVis("primaryCause") && (
                        <td className="px-4 py-3 text-gray-500">
                          {item.cause?.primaryCause || "—"}
                        </td>
                      )}
                      {colVis("fmcsaType") && (
                         <td className="px-4 py-3 text-gray-500">
                           {(item.classification as any).fmcsr39015 || item.classification.accidentType || "—"}
                         </td>
                      )}
                      {colVis("status") && (
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {item.status.label}
                          </span>
                        </td>
                      )}
                      {colVis("injuries") && (
                        <td className="px-4 py-3 text-center font-medium">
                          {item.severity.injuriesNonFatal > 0 ? (
                            <span className="text-red-600">{item.severity.injuriesNonFatal}</span>
                          ) : (
                            <span className="text-gray-300">0</span>
                          )}
                        </td>
                      )}
                      {colVis("fatalities") && (
                        <td className="px-4 py-3 text-center font-medium">
                            {item.severity.fatalities > 0 ? (
                            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs">
                                {item.severity.fatalities}
                            </span>
                          ) : (
                            <span className="text-gray-300">0</span>
                          )}
                        </td>
                      )}
                      {colVis("hazmat") && (
                        <td className="px-4 py-3 text-center">
                          {boolCell(item.severity.hazmatReleased)}
                        </td>
                      )}
                      {colVis("tow") && (
                        <td className="px-4 py-3 text-center">
                           <span className="text-gray-700">{item.severity.vehiclesTowed}</span>
                        </td>
                      )}
                      {colVis("cost") && (
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {fmt(item.costs.totalAccidentCosts)}
                        </td>
                      )}
                      {colVis("companyCost") && (
                        <td className="px-4 py-3 text-right text-gray-500">
                          {fmt(item.costs.companyCostsFromDollarOne)}
                        </td>
                      )}
                      {colVis("insurancePaid") && (
                        <td className="px-4 py-3 text-right text-gray-500">
                          {fmt(item.costs.insuranceCostsPaid)}
                        </td>
                      )}
                      {colVis("vehicleType") && (
                        <td className="px-4 py-3 text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <span>{item.vehicles?.[0]?.vehicleType ?? "—"}</span>
                            {(item.vehicles?.length ?? 0) > 1 && (
                              <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 rounded-full px-1.5 py-0.5">+{item.vehicles.length - 1}</span>
                            )}
                          </div>
                        </td>
                      )}
                      {colVis("vehicle") && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-700">{item.vehicles?.[0]?.assetId ?? "—"}</span>
                            {(item.vehicles?.length ?? 0) > 1 && (
                              <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 rounded-full px-1.5 py-0.5" title={(item.vehicles.slice(1).map((v: any) => v.assetId)).join(", ")}>+{item.vehicles.length - 1}</span>
                            )}
                          </div>
                        </td>
                      )}
                      {colVis("vin") && (
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <span>{item.vehicles?.[0]?.vin ?? "—"}</span>
                            {(item.vehicles?.length ?? 0) > 1 && (
                              <span className="text-[10px] font-semibold font-sans bg-gray-100 text-gray-500 border border-gray-200 rounded-full px-1.5 py-0.5">+{item.vehicles.length - 1}</span>
                            )}
                          </div>
                        </td>
                      )}
                      {colVis("commodityType") && (
                        <td className="px-4 py-3 text-gray-500">
                          {(item as any).commodityType || item.vehicles?.[0]?.commodityType || "—"}
                        </td>
                      )}
                      {colVis("commodityLoss") && (
                        <td className="px-4 py-3 text-center">
                          {boolCell(!!(item as any).commodityLoss)}
                        </td>
                      )}
                      {colVis("source") && (
                        <td className="px-4 py-3">
                            <div className="flex -space-x-1">
                                {item.sources.map((x: string, i: number) => (
                                    <span key={i} title={x}>{sourceBadge(x)}</span>
                                ))}
                            </div>
                        </td>
                      )}
                      
                      {/* Document Icons Column */}
                      {colVis("docs") && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {[
                              { id: "policeReport", icon: Shield, color: "text-blue-500", title: "Police Report" },
                              { id: "insuranceClaim", icon: DollarSign, color: "text-emerald-500", title: "Insurance Claim" },
                              { id: "medicalReport", icon: Activity, color: "text-rose-500", title: "Medical Report" },
                              { id: "towReceipt", icon: Truck, color: "text-amber-500", title: "Tow Receipt" },
                              { id: "accidentPhoto", icon: Camera, color: "text-purple-500", title: "Photos" },
                              { id: "telemetry", icon: Wifi, color: "text-teal-500", title: "Telemetry" },
                            ].map((d) => {
                              const active = ((item.documents as string[]) || []).includes(d.id);
                              return (
                                <div key={d.id} title={active ? d.title : "Missing " + d.title}>
                                  <d.icon
                                    size={14}
                                    className={active ? d.color : "text-gray-200"}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      )}
                      
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setEditing(item)}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600"
                        >
                            <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={30} className="px-4 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={24} />
                        <p>No accidents found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        
          {/* Pagination Footer */}
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-700">
              <span className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{Math.min((currentPage - 1) * rowsPerPage + 1, sorted.length)}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * rowsPerPage, sorted.length)}</span> of <span className="font-semibold text-gray-900">{sorted.length}</span> results
              </span>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-gray-600">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {[5, 10, 20, 30, 40, 50].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 px-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 bg-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Logic to show a window of pages centering around current page if many pages
                // For now, simple logic or show all as requested strictly
                // The image shows [1] [2], so just listing them is fine for small N.
                // Assuming N is small or user wants simple list for now.
                // I'll show all pages if <= 7, otherwise window.
                let p = i + 1;
                if (totalPages > 7) {
                   // complex pagination logic not requested strictly yet, user has 2 pages.
                   // I will simply map all for now as user has 17 records -> 2 pages.
                   return null; 
                }
                return p;
              }).filter(Boolean).length === 0 ? (
                 // Fallback to simple map if totalPages is small
                 Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 flex items-center justify-center border rounded text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-blue-50 border-blue-500 text-blue-600 z-10"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                 ))
              ) : (
                 // This branch is unreachable with above logic structure, refactoring to simple map
                 Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 flex items-center justify-center border rounded text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-blue-50 border-blue-500 text-blue-600 z-10"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                 ))
              )}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 px-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 bg-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      <DetailPopup
        inc={detail}
        onClose={() => setDetail(null)}
        onEdit={(i: any) => {
          setDetail(null);
          setEditing(i);
        }}
      />
      
      {/* Edit Modal */}
      <EditPopup 
        inc={editing} 
        onClose={() => setEditing(null)} 
        onSave={handleSave}
      />
    </div>
  );
}
