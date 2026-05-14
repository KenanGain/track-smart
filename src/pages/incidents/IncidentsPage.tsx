
import React, { useState, useMemo, useRef, useEffect } from "react";
import { MOCK_DRIVERS } from "@/data/mock-app-data";
import { INITIAL_ASSETS } from "../assets/assets.data";
import { Toggle } from "@/components/ui/toggle";
import { INCIDENTS } from "./incidents.data";
import { CARRIER_INCIDENTS_ALL, getAccidentsForCarrier } from "./carrier-accidents.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import {
  EXTERNAL_ACCIDENT_FEEDS_ALL,
  generateLiveAccidentBatch,
  getExternalAccidentsForCarrier,
  matchInternalToExternal,
  SOURCE_TONE,
  SOURCE_META,
  type ExternalAccidentRecord,
  type ExternalFeedSource,
} from "./external-feeds.data";
import { useAppData } from "@/context/AppDataContext";
import {
  ACCIDENT_TYPES,
  ACCIDENT_GROUPS,
  type AccidentTypeDef,
  type AccidentGroup,
} from "@/data/accident-types.data";
import {
  AlertTriangle,
  Shield,
  DollarSign,

  Activity,
  X,
  Search,
  Calendar,
  Edit,
  Trash2,
  AlertOctagon,
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
  RefreshCw,
  ChevronUp,
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
            {(inc.location?.unit || inc.location?.streetAddress || inc.location?.zip) && (
              <Fld
                l="Street / Unit / Zip"
                full
                v={[inc.location?.unit, inc.location?.streetAddress, inc.location?.zip].filter(Boolean).join(" · ")}
              />
            )}
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
            <Fld l="Police Report Obtained?" v={inc.classification?.policeReport ? "Yes" : "No"} />
            <Fld l="Status" v={inc.status?.label ?? inc.status?.value} />
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
              {inc.driver?.hrsDriving != null && inc.driver.hrsDriving !== "" &&
                <Fld l="Hrs Driving at Crash" v={`${inc.driver.hrsDriving} hr`} />}
              {inc.driver?.hrsOnDuty != null && inc.driver.hrsOnDuty !== "" &&
                <Fld l="Hrs On Duty at Crash" v={`${inc.driver.hrsOnDuty} hr`} />}
            </div>
          </Sect>
        </div>
        <Sect title="Severity & Costs">
          <div className="grid grid-cols-5 gap-2 mb-3">
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
                l: "Vehicles Towed",
                v: inc.severity.vehiclesTowed ?? 0,
                bad: (inc.severity.vehiclesTowed ?? 0) > 0,
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
            <Fld l="Currency" v={inc.costs?.currency ?? "USD"} />
            <div />
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
            <Fld l="Traffic Control Device" v={inc.roadway.trafficControl} />
            <Fld l="Weather" v={inc.roadway.weatherConditions} />
            <Fld l="Road Conditions" v={inc.roadway.roadConditions} />
            <Fld l="Terrain" v={inc.roadway.terrain} />
            <Fld l="Light" v={inc.roadway.light} />
          </div>
        </Sect>
        {/* References & Identifiers (mirrors the form section) */}
        {(() => {
          const r = inc.references ?? {};
          const hasAny = !!(
            r.microfilmNumber || r.policeReportNumber || r.policeAgency ||
            r.investigatingOfficer || r.officerBadge || r.citationNumber ||
            r.usdotNumber || r.cvorNumber || r.nscNumber || r.mcNumber ||
            r.firstNoticeOfLoss || r.reportingSource
          );
          if (!hasAny) return null;
          return (
            <Sect title="References & Identifiers">
              <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                {r.microfilmNumber      && <Fld l="Microfilm Number"      v={r.microfilmNumber} />}
                {r.policeReportNumber   && <Fld l="Police Report #"        v={r.policeReportNumber} />}
                {r.policeAgency         && <Fld l="Police Agency"          v={r.policeAgency} full />}
                {r.investigatingOfficer && <Fld l="Investigating Officer"  v={r.investigatingOfficer} />}
                {r.officerBadge         && <Fld l="Officer Badge #"        v={r.officerBadge} />}
                {r.citationNumber       && <Fld l="Citation / Ticket #"    v={r.citationNumber} />}
                {r.usdotNumber          && <Fld l="USDOT #"                v={r.usdotNumber} />}
                {r.cvorNumber           && <Fld l="CVOR # (Ontario)"       v={r.cvorNumber} />}
                {r.nscNumber            && <Fld l="NSC # (Canada)"         v={r.nscNumber} />}
                {r.mcNumber             && <Fld l="MC #"                   v={r.mcNumber} />}
                {r.firstNoticeOfLoss    && <Fld l="First Notice of Loss"   v={fmtDateTime(r.firstNoticeOfLoss)} />}
                {r.reportingSource      && <Fld l="Reporting Source"       v={r.reportingSource} />}
              </div>
            </Sect>
          );
        })()}

        {/* Trailer & Trip Details */}
        {(() => {
          const e = inc.equipment ?? {};
          const hasAny = !!(
            e.trailer1UnitNumber || e.trailer1Plate || e.trailer1Vin ||
            e.trailer2UnitNumber || e.trailer2Plate || e.trailer2Vin ||
            e.odometer || e.gvw || e.axles || e.tripStatus ||
            e.originCity || e.originState || e.destinationCity || e.destinationState ||
            e.lastDutyStatus || e.lastDvirStatus
          );
          if (!hasAny) return null;
          return (
            <Sect title="Trailer & Trip Details">
              <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                {e.trailer1UnitNumber && <Fld l="Trailer 1 Unit #" v={e.trailer1UnitNumber} />}
                {e.trailer1Plate      && <Fld l="Trailer 1 Plate"  v={e.trailer1Plate} />}
                {e.trailer1Vin        && <Fld l="Trailer 1 VIN"    v={e.trailer1Vin} full />}
                {e.trailer2UnitNumber && <Fld l="Trailer 2 Unit #" v={e.trailer2UnitNumber} />}
                {e.trailer2Plate      && <Fld l="Trailer 2 Plate"  v={e.trailer2Plate} />}
                {e.trailer2Vin        && <Fld l="Trailer 2 VIN"    v={e.trailer2Vin} full />}
                {e.odometer != null   && <Fld l="Odometer"          v={`${Number(e.odometer).toLocaleString()} ${inc.location?.country === "Canada" ? "km" : "mi"}`} />}
                {e.gvw != null        && <Fld l="GVW"               v={`${Number(e.gvw).toLocaleString()} lbs`} />}
                {e.axles != null      && <Fld l="Axles"             v={e.axles} />}
                {e.tripStatus         && <Fld l="Trip Status"       v={e.tripStatus} />}
                {(e.originCity || e.originState) &&
                  <Fld l="Trip Origin"      v={[e.originCity, e.originState].filter(Boolean).join(", ")} />}
                {(e.destinationCity || e.destinationState) &&
                  <Fld l="Trip Destination" v={[e.destinationCity, e.destinationState].filter(Boolean).join(", ")} />}
                {e.lastDutyStatus     && <Fld l="Last Duty Status"  v={e.lastDutyStatus} />}
                {e.lastDvirStatus     && <Fld l="Last DVIR"         v={e.lastDvirStatus} />}
              </div>
            </Sect>
          );
        })()}

        {/* HazMat detail — extends Severity when applicable */}
        {inc.severity?.hazmatReleased && (() => {
          const s = inc.severity;
          const hasDetail = !!(s.hazardousCommodity || s.hazmatClass || s.hazmatUnNumber || s.hazmatQuantityReleased || s.hazmatPlacarded != null);
          if (!hasDetail) return null;
          return (
            <Sect title="HazMat Detail">
              <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                {s.hazardousCommodity     && <Fld l="Hazardous Commodity" v={s.hazardousCommodity} full />}
                {s.hazmatClass            && <Fld l="HazMat Class"        v={s.hazmatClass} />}
                {s.hazmatUnNumber         && <Fld l="UN / NA Number"      v={s.hazmatUnNumber} />}
                {s.hazmatQuantityReleased && <Fld l="Quantity Released"   v={s.hazmatQuantityReleased} />}
                <Fld l="Placarded?" v={s.hazmatPlacarded ? "Yes" : "No"} />
              </div>
            </Sect>
          );
        })()}

        {/* Insurance, Tow & Repair */}
        {(() => {
          const ins = inc.insurance ?? {};
          const hasAny = !!(
            ins.carrierName || ins.policyNumber || ins.adjusterName || ins.adjusterPhone ||
            ins.tpaName || ins.towCompany || ins.towBill || ins.repairVendor ||
            ins.repairStatus || ins.totalLoss != null || ins.subrogationPending != null
          );
          if (!hasAny) return null;
          return (
            <Sect title="Insurance, Tow & Repair">
              <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                {ins.carrierName    && <Fld l="Insurance Carrier" v={ins.carrierName} />}
                {ins.policyNumber   && <Fld l="Policy Number"     v={ins.policyNumber} />}
                {ins.adjusterName   && <Fld l="Adjuster Name"     v={ins.adjusterName} />}
                {ins.adjusterPhone  && <Fld l="Adjuster Phone"    v={ins.adjusterPhone} blue />}
                {ins.tpaName        && <Fld l="TPA / 3rd-Party Admin" v={ins.tpaName} full />}
                {ins.towCompany     && <Fld l="Tow Company"       v={ins.towCompany} />}
                {ins.towBill != null && <Fld l="Tow Bill"          v={fmt(ins.towBill)} />}
                {ins.repairVendor   && <Fld l="Repair Vendor"     v={ins.repairVendor} />}
                {ins.repairStatus   && <Fld l="Repair Status"     v={ins.repairStatus} />}
                <Fld l="Total Loss?"          v={ins.totalLoss ? "Yes" : "No"} />
                <Fld l="Subrogation Pending?" v={ins.subrogationPending ? "Yes" : "No"} />
              </div>
            </Sect>
          );
        })()}

        {/* Other Party */}
        {(() => {
          const op = inc.otherParty ?? {};
          const hasAny = !!(
            op.driverName || op.driverPhone || op.driverLicense || op.driverLicenseState ||
            op.vehicleMake || op.vehicleModel || op.vehicleYear || op.vehiclePlate ||
            op.insuranceCarrier || op.insurancePolicy || op.atFault != null || op.citationIssued != null
          );
          if (!hasAny) return null;
          const veh = [op.vehicleYear, op.vehicleMake, op.vehicleModel].filter(Boolean).join(" ");
          return (
            <Sect title="Other Party (3rd Party)">
              <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                {op.driverName     && <Fld l="Other Driver"  v={op.driverName} />}
                {op.driverPhone    && <Fld l="Phone"          v={op.driverPhone} blue />}
                {op.driverLicense  && <Fld l="License #"      v={op.driverLicense} />}
                {op.driverLicenseState && <Fld l="License State" v={op.driverLicenseState} />}
                {veh               && <Fld l="Vehicle"         v={veh} full />}
                {op.vehiclePlate   && <Fld l="Plate"           v={op.vehiclePlate} />}
                {op.insuranceCarrier && <Fld l="Insurance Carrier" v={op.insuranceCarrier} />}
                {op.insurancePolicy  && <Fld l="Insurance Policy"  v={op.insurancePolicy} />}
                <Fld l="At Fault?"        v={op.atFault ? "Yes" : "No"} />
                <Fld l="Citation Issued?" v={op.citationIssued ? "Yes" : "No"} />
              </div>
            </Sect>
          );
        })()}

        {/* Admin & Follow-Up */}
        {(() => {
          const fu = inc.followUp ?? {};
          if (!fu.action && !fu.comments) return null;
          return (
            <Sect title="Admin & Follow Up">
              <div className="space-y-3">
                {fu.action && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Driver Follow-Up Training / Action</p>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{fu.action}</p>
                  </div>
                )}
                {fu.comments && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Additional Comments</p>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{fu.comments}</p>
                  </div>
                )}
              </div>
            </Sect>
          );
        })()}

        {/* Video Evidence */}
        {Array.isArray((inc as any).videoEvidence) && (inc as any).videoEvidence.length > 0 && (
          <Sect title="Video Evidence">
            <div className="space-y-2">
              {(inc as any).videoEvidence.map((v: any, vi: number) => (
                <div key={vi} className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Video size={13} className="text-violet-500 shrink-0" />
                    <span className="text-xs font-medium text-gray-800 truncate">{v.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{v.size}</span>
                </div>
              ))}
            </div>
          </Sect>
        )}

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


// ── Accident-type catalogue helpers ──────────────────────────────────────
// Pulls the master accident-type list (built-in + admin-edited overrides +
// admin-created custom rows) from the same localStorage keys used by
// Settings → Accidents, so this form always shows the latest catalogue.

const _ACCIDENT_OVERRIDES_KEY = "tracksmart_accident_type_overrides_v2"; void _ACCIDENT_OVERRIDES_KEY;
const ACCIDENT_CUSTOM_KEY    = "tracksmart_accident_type_custom_v2";

function loadAccidentTypeCatalogue(): AccidentTypeDef[] {
  let custom: AccidentTypeDef[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(ACCIDENT_CUSTOM_KEY);
      if (raw) custom = JSON.parse(raw) as AccidentTypeDef[];
    } catch { /* ignore */ }
  }
  return [...ACCIDENT_TYPES, ...custom];
}

interface AccidentTypeGroupedOption {
  group: AccidentGroup;
  options: { v: string; l: string }[];
}

function buildAccidentTypeOptions(catalogue: AccidentTypeDef[]): AccidentTypeGroupedOption[] {
  const byGroup = new Map<AccidentGroup, { v: string; l: string }[]>();
  for (const g of ACCIDENT_GROUPS) byGroup.set(g, []);
  for (const t of catalogue) {
    const arr = byGroup.get(t.group) ?? [];
    arr.push({ v: t.displayName, l: t.displayName });
    byGroup.set(t.group, arr);
  }
  const out: AccidentTypeGroupedOption[] = [];
  for (const g of ACCIDENT_GROUPS) {
    const opts = byGroup.get(g) ?? [];
    if (opts.length > 0) out.push({ group: g, options: opts.sort((a, b) => a.l.localeCompare(b.l)) });
  }
  return out;
}

const EditPopup = ({ inc, onClose, onSave, accountId: scopedAccountId, presentation = 'modal' }: any) => {
  if (!inc) return null;
  const isPage = presentation === 'page';
  const [form, setForm] = useState(JSON.parse(JSON.stringify(inc)));

  // Carrier-scoped asset list. When the form is opened inside a specific
  // carrier scope (or when seeded from an external feed which carries an
  // accountId), pull that carrier's fleet from CARRIER_ASSETS. Otherwise fall
  // back to the demo INITIAL_ASSETS so the legacy Acme view still works.
  const effectiveAccountId: string | undefined = scopedAccountId ?? inc?.accountId;
  const assetOptions = useMemo<any[]>(() => {
    if (effectiveAccountId && CARRIER_ASSETS[effectiveAccountId]?.length) {
      return CARRIER_ASSETS[effectiveAccountId];
    }
    return INITIAL_ASSETS as any[];
  }, [effectiveAccountId]);

  /**
   * Trailers are Non-CMV assets in CARRIER_ASSETS — surface them as a
   * dropdown so the user picks an existing trailer rather than retyping
   * Unit # / Plate / VIN. Match by assetType (the structural classification)
   * — assetCategory is always Non-CMV for trailers since a trailer on its
   * own isn't a CMV. If a carrier has no trailers on file the picker
   * shows an empty-state message instead of silently falling back to power
   * units.
   */
  const trailerOptions = useMemo<any[]>(() => {
    return assetOptions.filter((a: any) =>
      String(a.assetType ?? a.vehicleType ?? '').toLowerCase().includes('trailer'),
    );
  }, [assetOptions]);

  // Accident document types from AppDataContext
  const { documents: allDocs } = useAppData();
  const accidentDocTypes = allDocs.filter((d: any) => d.isAccidentDoc);

  // Live accident-type catalogue (from Settings → Accidents).
  // Refreshes when the window regains focus or another tab updates storage.
  const [accidentCatalogue, setAccidentCatalogue] = useState<AccidentTypeDef[]>(() => loadAccidentTypeCatalogue());
  useEffect(() => {
    const refresh = () => setAccidentCatalogue(loadAccidentTypeCatalogue());
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const accidentTypeGroups = useMemo(() => buildAccidentTypeOptions(accidentCatalogue), [accidentCatalogue]);
  const currentIncidentType: string | undefined = form?.cause?.incidentType;
  const isLegacyType = !!currentIncidentType && !accidentCatalogue.some((t) => t.displayName === currentIncidentType);

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

  /**
   * Trailer picker — replaces the legacy 3-field free-text Unit / Plate /
   * VIN block. Picks an existing trailer from the carrier's asset roster
   * and auto-populates the persisted form fields via `onPick`. Spans both
   * grid columns since one row carries the picker + read-only preview of
   * the resolved Plate / VIN.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _TrailerPicker = ({
    index, options, unitNumber, plate, vin, onPick,
  }: {
    index: number;
    options: any[];
    unitNumber: string;
    plate: string;
    vin: string;
    onPick: (trailer: any | null) => void;
  }) => {
    // Resolve which option is currently picked. Prefer VIN (most reliable),
    // then Unit, then Plate — same pattern as the Vehicles Involved picker.
    const resolved =
      (vin && options.find((a: any) => (a.vin ?? '') === vin)) ||
      (unitNumber && options.find((a: any) => (a.unitNumber ?? a.id) === unitNumber)) ||
      (plate && options.find((a: any) =>
        (a.plateNumber ?? a.licensePlate ?? '') === plate,
      )) ||
      null;
    return (
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Trailer {index}
          {effectiveAccountId && (
            <span className="ml-1.5 text-[10px] font-semibold text-blue-600 normal-case">
              · {options.length} trailer{options.length === 1 ? '' : 's'} for this carrier
            </span>
          )}
        </label>
        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          value={resolved?.id ?? ''}
          onChange={(e) => {
            if (!e.target.value) {
              onPick(null);
              return;
            }
            const t = options.find((a: any) => a.id === e.target.value);
            if (t) onPick(t);
          }}
        >
          <option value="">
            {options.length === 0 ? '-- No trailers on file --' : '-- Select Trailer --'}
          </option>
          {options.map((a: any) => {
            const unit = a.unitNumber ?? a.id;
            const make = a.make ?? '';
            const model = a.model ?? '';
            const year = a.year ? ` (${a.year})` : '';
            return (
              <option key={a.id} value={a.id}>
                {unit} — {make} {model}{year}
              </option>
            );
          })}
        </select>
        {resolved && (
          <p className="mt-1 text-[10px] text-slate-500 truncate">
            {[resolved.year, resolved.make, resolved.model].filter(Boolean).join(' ')}
            {plate && <span className="font-mono ml-1">· {plate}</span>}
            {vin && <span className="font-mono ml-1 text-slate-400">· VIN {vin}</span>}
          </p>
        )}
        {!resolved && (unitNumber || plate || vin) && (
          // Legacy data — show what's stored even though it isn't in the
          // current trailer list, so the user can verify before overwriting.
          <p className="mt-1 text-[10px] text-amber-600 truncate">
            On file: {[unitNumber, plate, vin].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    );
  };
  void _TrailerPicker;

  const strOpts = (arr: string[]) => arr.map((x) => ({ v: x, l: x }));

  // Page-mode container — same form content rendered as a dedicated page
  // with a header containing a Back button. Modal mode keeps the original
  // overlay behaviour.
  const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto">
      <div
        className="bg-white border border-slate-200 rounded-xl shadow-sm w-full max-w-3xl mx-auto flex flex-col"
        style={{ maxHeight: 'calc(100vh - 8rem)' }}
      >
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <h2 className="text-sm font-bold text-slate-800">
            {inc?.incidentId ? 'Edit Accident' : 'Add Accident'}
          </h2>
          {inc?.incidentId && (
            <span className="text-[11px] text-slate-500 font-mono">{inc.incidentId}</span>
          )}
        </div>
        {children}
      </div>
    </div>
  );

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => isPage
    ? <PageWrapper>{children}</PageWrapper>
    : <Modal open={!!inc} onClose={onClose} width={720}>{children}</Modal>;

  return (
    <Wrapper>
      {/* In page mode the wrapper above already shows a header with Back —
          the original Modal header is still rendered for modal mode. */}
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
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Accident Type
                <span className="ml-1.5 text-[10px] font-semibold text-blue-600 normal-case">
                  · from Settings &rsaquo; Accidents
                </span>
              </label>
              <select
                value={currentIncidentType ?? ""}
                onChange={(e) => u("cause", "incidentType", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="" disabled>Select…</option>
                {isLegacyType && (
                  <optgroup label="Legacy / not in catalogue">
                    <option value={currentIncidentType}>{currentIncidentType} (legacy)</option>
                  </optgroup>
                )}
                {accidentTypeGroups.map((grp) => (
                  <optgroup key={grp.group} label={grp.group}>
                    {grp.options.map((o) => (
                      <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {accidentTypeGroups.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-600">
                  No accident types configured. Add some in Settings &rsaquo; Accidents.
                </p>
              )}
            </div>
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

        {/* ── References & Identifiers (NEW) ─────────────────────────────── */}
        <Sect title="References & Identifiers">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Inp l="Microfilm Number"          s="references" f="microfilmNumber" />
            <Inp l="Police Report #"            s="references" f="policeReportNumber" />
            <Inp l="Police Agency / Department" s="references" f="policeAgency" />
            <Inp l="Investigating Officer"      s="references" f="investigatingOfficer" />
            <Inp l="Officer Badge #"            s="references" f="officerBadge" />
            <Inp l="Citation / Ticket #"        s="references" f="citationNumber" />
            <Inp l="USDOT #"                    s="references" f="usdotNumber" />
            <Inp l="CVOR # (Ontario)"           s="references" f="cvorNumber" />
            <Inp l="NSC # (Canada)"             s="references" f="nscNumber" />
            <Inp l="MC #"                       s="references" f="mcNumber" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">First Notice of Loss</label>
              <input
                type="datetime-local"
                value={form.references?.firstNoticeOfLoss?.slice(0, 16) ?? ""}
                onChange={(e) => u("references", "firstNoticeOfLoss", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <Sel
              l="Reporting Source"
              s="references"
              f="reportingSource"
              opts={strOpts(["Driver", "Dispatcher", "Police", "Insurance", "Other Party", "Telematics", "Other"])}
            />
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
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Select Asset (Unit #)
                      {effectiveAccountId && (
                        <span className="ml-1.5 text-[10px] font-semibold text-blue-600 normal-case">
                          · {assetOptions.length} asset{assetOptions.length === 1 ? "" : "s"} for this carrier
                        </span>
                      )}
                    </label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      value={(() => {
                        // Prefer matching by VIN (most reliable), then by unit/plate.
                        const byVin   = veh.vin ? assetOptions.find((a: any) => (a.vin ?? "") === veh.vin) : null;
                        const byUnit  = veh.assetId ? assetOptions.find((a: any) => (a.unitNumber ?? a.id) === veh.assetId) : null;
                        const byPlate = veh.licenseNumber ? assetOptions.find((a: any) => (a.plateNumber ?? a.licensePlate) === veh.licenseNumber) : null;
                        return (byVin ?? byUnit ?? byPlate)?.id ?? "";
                      })()}
                      onChange={(e) => {
                        const a = assetOptions.find((x: any) => x.id === e.target.value);
                        if (a) {
                          setForm((p: any) => {
                            const vehicles = [...(p.vehicles && p.vehicles.length > 0 ? p.vehicles : [{}])];
                            vehicles[vi] = {
                              ...vehicles[vi],
                              assetId:               a.unitNumber ?? a.id,
                              vehicleType:           a.vehicleType ?? a.assetType ?? "",
                              make:                  a.make ?? "",
                              model:                 a.model ?? "",
                              year:                  a.year ?? "",
                              vin:                   a.vin ?? "",
                              licenseNumber:         a.plateNumber ?? a.licensePlate ?? "",
                              licenseStateOrProvince: a.licenseStateOrProvince ?? a.plateStateOrProvince ?? vehicles[vi]?.licenseStateOrProvince ?? "",
                              commodityType:         a.commodityType ?? vehicles[vi]?.commodityType ?? "",
                              assetCategory:         a.assetCategory ?? "CMV",
                            };
                            return { ...p, vehicles };
                          });
                        }
                      }}
                    >
                      <option value="">-- Select Asset --</option>
                      {assetOptions.map((a: any) => {
                        const unit = a.unitNumber ?? a.id;
                        const make = a.make ?? "";
                        const model = a.model ?? "";
                        const year = a.year ? ` (${a.year})` : "";
                        return (
                          <option key={a.id} value={a.id}>
                            {unit} — {make} {model}{year}
                          </option>
                        );
                      })}
                    </select>
                    {assetOptions.length === 0 && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        No assets found for this carrier.
                      </p>
                    )}
                    {/* Quick visual confirmation of the currently-selected asset */}
                    {(veh.vin || veh.licenseNumber || veh.make) && (
                      <p className="mt-1 text-[10px] text-slate-500 truncate">
                        {[veh.year, veh.make, veh.model].filter(Boolean).join(" ")}
                        {veh.licenseNumber && <span className="font-mono ml-1">· {veh.licenseNumber}</span>}
                        {veh.vin && <span className="font-mono ml-1 text-slate-400">· VIN {veh.vin}</span>}
                      </p>
                    )}
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

        {/* ── Trailer & Trip Details ─────────────────────────────────────
            Trailers mirror the Vehicles Involved pattern exactly: each
            trailer sits in its own card with a remove control, and an
            "+ Add Trailer" button appends another. Picking a trailer fills
            Unit # / Plate / VIN from the carrier's roster. */}
        <Sect title="Trailer & Trip Details">
          <div className="space-y-4 mb-5">
            {(() => {
              // Resolve the trailer list from the array, or migrate from the
              // legacy flat trailer1*/trailer2* fields if it doesn't exist
              // yet. Always provide at least one empty row so the picker
              // shows up even on a brand-new accident.
              const eq = form.equipment ?? {};
              let list: Array<{ unitNumber: string; plate: string; vin: string }> =
                Array.isArray(eq.trailers) ? eq.trailers : [];
              if (list.length === 0) {
                if (eq.trailer1UnitNumber || eq.trailer1Plate || eq.trailer1Vin
                    || eq.trailer2UnitNumber || eq.trailer2Plate || eq.trailer2Vin) {
                  list = [
                    { unitNumber: eq.trailer1UnitNumber ?? '', plate: eq.trailer1Plate ?? '', vin: eq.trailer1Vin ?? '' },
                    { unitNumber: eq.trailer2UnitNumber ?? '', plate: eq.trailer2Plate ?? '', vin: eq.trailer2Vin ?? '' },
                  ].filter(t => t.unitNumber || t.plate || t.vin);
                }
                if (list.length === 0) list = [{ unitNumber: '', plate: '', vin: '' }];
              }

              // Sync helper: write the array AND the flat trailer1/trailer2
              // fields back to the form so legacy display code (Fld rows in
              // the detail view) keeps working.
              const writeTrailers = (next: typeof list) => {
                setForm((p: any) => ({
                  ...p,
                  equipment: {
                    ...p.equipment,
                    trailers: next,
                    trailer1UnitNumber: next[0]?.unitNumber ?? '',
                    trailer1Plate:      next[0]?.plate ?? '',
                    trailer1Vin:        next[0]?.vin ?? '',
                    trailer2UnitNumber: next[1]?.unitNumber ?? '',
                    trailer2Plate:      next[1]?.plate ?? '',
                    trailer2Vin:        next[1]?.vin ?? '',
                  },
                }));
              };

              return (
                <>
                  {list.map((tr, ti) => {
                    // Resolve the picked asset for the preview line / value.
                    const resolved =
                      (tr.vin && trailerOptions.find((a: any) => (a.vin ?? '') === tr.vin)) ||
                      (tr.unitNumber && trailerOptions.find((a: any) => (a.unitNumber ?? a.id) === tr.unitNumber)) ||
                      (tr.plate && trailerOptions.find((a: any) =>
                        (a.plateNumber ?? a.licensePlate ?? '') === tr.plate,
                      )) ||
                      null;
                    return (
                      <div key={ti} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-700">Trailer {ti + 1}</span>
                          {ti > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = list.filter((_, i) => i !== ti);
                                writeTrailers(next.length > 0 ? next : [{ unitNumber: '', plate: '', vin: '' }]);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                              title="Remove trailer"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Select Trailer (Unit #)
                              {effectiveAccountId && (
                                <span className="ml-1.5 text-[10px] font-semibold text-blue-600 normal-case">
                                  · {trailerOptions.length} trailer{trailerOptions.length === 1 ? '' : 's'} for this carrier
                                </span>
                              )}
                            </label>
                            <select
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                              value={resolved?.id ?? ''}
                              onChange={(e) => {
                                const next = [...list];
                                if (!e.target.value) {
                                  next[ti] = { unitNumber: '', plate: '', vin: '' };
                                } else {
                                  const a = trailerOptions.find((x: any) => x.id === e.target.value);
                                  if (a) {
                                    next[ti] = {
                                      unitNumber: a.unitNumber ?? '',
                                      plate:      a.plateNumber ?? a.licensePlate ?? '',
                                      vin:        a.vin ?? '',
                                    };
                                  }
                                }
                                writeTrailers(next);
                              }}
                            >
                              <option value="">
                                {trailerOptions.length === 0 ? '-- No trailers on file --' : '-- Select Trailer --'}
                              </option>
                              {trailerOptions.map((a: any) => {
                                const unit = a.unitNumber ?? a.id;
                                const make = a.make ?? '';
                                const model = a.model ?? '';
                                const year = a.year ? ` (${a.year})` : '';
                                return (
                                  <option key={a.id} value={a.id}>
                                    {unit} — {make} {model}{year}
                                  </option>
                                );
                              })}
                            </select>
                            {trailerOptions.length === 0 && (
                              <p className="mt-1 text-[11px] text-amber-600">
                                No trailers found for this carrier.
                              </p>
                            )}
                            {resolved && (
                              <p className="mt-1 text-[10px] text-slate-500 truncate">
                                {[resolved.year, resolved.make, resolved.model].filter(Boolean).join(' ')}
                                {tr.plate && <span className="font-mono ml-1">· {tr.plate}</span>}
                                {tr.vin && <span className="font-mono ml-1 text-slate-400">· VIN {tr.vin}</span>}
                              </p>
                            )}
                            {!resolved && (tr.unitNumber || tr.plate || tr.vin) && (
                              <p className="mt-1 text-[10px] text-amber-600 truncate">
                                On file: {[tr.unitNumber, tr.plate, tr.vin].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => writeTrailers([...list, { unitNumber: '', plate: '', vin: '' }])}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 rounded-lg px-4 py-2 transition"
                  >
                    <Plus size={14} />
                    Add Trailer
                  </button>
                </>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Inp l="Odometer at Crash" s="equipment" f="odometer" type="number" />
            <Inp l="GVW (lbs)"         s="equipment" f="gvw" type="number" />
            <Inp l="Number of Axles"   s="equipment" f="axles" type="number" />
            <Sel
              l="Trip Status"
              s="equipment"
              f="tripStatus"
              opts={strOpts(["Loaded", "Empty", "Bobtail", "Deadhead", "Mixed"])}
            />
            <Inp l="Trip Origin (City)"            s="equipment" f="originCity" />
            <Inp l="Trip Origin (State/Prov)"      s="equipment" f="originState" />
            <Inp l="Trip Destination (City)"       s="equipment" f="destinationCity" />
            <Inp l="Trip Destination (State/Prov)" s="equipment" f="destinationState" />
            <Sel
              l="Last Duty Status"
              s="equipment"
              f="lastDutyStatus"
              opts={strOpts(["Driving", "On-Duty (not driving)", "Off-Duty", "Sleeper Berth"])}
            />
            <Sel
              l="Last DVIR Status"
              s="equipment"
              f="lastDvirStatus"
              opts={strOpts(["Pre-Trip Pass", "Pre-Trip Fail", "Post-Trip Pass", "Post-Trip Fail", "Not Performed"])}
            />
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
              <>
                <Inp l="Hazardous Commodity" s="severity" f="hazardousCommodity" full />
                <Sel
                  l="HazMat Class"
                  s="severity"
                  f="hazmatClass"
                  opts={strOpts([
                    "1 — Explosives",
                    "2 — Gases",
                    "3 — Flammable Liquids",
                    "4 — Flammable Solids",
                    "5 — Oxidisers / Organic Peroxides",
                    "6 — Toxic / Infectious",
                    "7 — Radioactive",
                    "8 — Corrosive",
                    "9 — Miscellaneous",
                  ])}
                />
                <Inp l="UN / NA Number"        s="severity" f="hazmatUnNumber" />
                <Inp l="Quantity Released"     s="severity" f="hazmatQuantityReleased" />
                <Chk l="Placarded?"            s="severity" f="hazmatPlacarded" />
              </>
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
        {/* ── Insurance, Tow & Repair (NEW) ─────────────────────────────── */}
        <Sect title="Insurance, Tow & Repair">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Inp l="Insurance Carrier"   s="insurance" f="carrierName" />
            <Inp l="Policy Number"       s="insurance" f="policyNumber" />
            <Inp l="Adjuster Name"       s="insurance" f="adjusterName" />
            <Inp l="Adjuster Phone"      s="insurance" f="adjusterPhone" />
            <Inp l="TPA / Third-Party Admin" s="insurance" f="tpaName" full />
            <Inp l="Tow Company"         s="insurance" f="towCompany" />
            <Inp l="Tow Bill (amount)"   s="insurance" f="towBill" type="number" />
            <Inp l="Repair Vendor"       s="insurance" f="repairVendor" />
            <Sel
              l="Repair Status"
              s="insurance"
              f="repairStatus"
              opts={strOpts(["Pending", "In Progress", "Completed", "Total Loss", "Awaiting Parts"])}
            />
            <Chk l="Total Loss?"         s="insurance" f="totalLoss" />
            <Chk l="Subrogation Pending?" s="insurance" f="subrogationPending" />
          </div>
        </Sect>

        {/* ── Other Party (NEW) ──────────────────────────────────────────── */}
        <Sect title="Other Party (3rd Party Vehicle)">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Inp l="Other Driver Name"   s="otherParty" f="driverName" />
            <Inp l="Other Driver Phone"  s="otherParty" f="driverPhone" />
            <Inp l="Other Driver License #" s="otherParty" f="driverLicense" />
            <Inp l="Other Driver License State/Prov" s="otherParty" f="driverLicenseState" />
            <Inp l="Other Vehicle Make"  s="otherParty" f="vehicleMake" />
            <Inp l="Other Vehicle Model" s="otherParty" f="vehicleModel" />
            <Inp l="Other Vehicle Year"  s="otherParty" f="vehicleYear" type="number" />
            <Inp l="Other Vehicle Plate" s="otherParty" f="vehiclePlate" />
            <Inp l="Other Insurance Carrier" s="otherParty" f="insuranceCarrier" />
            <Inp l="Other Insurance Policy #" s="otherParty" f="insurancePolicy" />
            <Chk l="At Fault?"           s="otherParty" f="atFault" />
            <Chk l="Citation Issued to Other?" s="otherParty" f="citationIssued" />
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
    </Wrapper>
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

// ── Compliance reconciliation helpers ────────────────────────────────────

/**
 * Seed an EditPopup form from an external feed record. Pre-populates every
 * field we can infer from the feed so the admin only needs to confirm and
 * fill in the carrier-private fields (insurance, follow-up, etc.).
 */
function externalRecordToFormSeed(rec: ExternalAccidentRecord) {
  const meta = SOURCE_META[rec.source];
  const refField = meta.refField; // 'usdotNumber' | 'cvorNumber' | 'nscNumber'
  const reportableTone = rec.fatalities > 0 || rec.injuries > 0 || rec.towAway;

  // Build references with the source-specific identifier slotted in correctly.
  const references: Record<string, any> = {
    microfilmNumber:      rec.source !== "FMCSA" ? rec.externalId : "",
    policeReportNumber:   rec.policeReportNumber ?? (rec.source === "FMCSA" ? rec.externalId : ""),
    policeAgency:         rec.reportedBy,
    investigatingOfficer: rec.investigatingOfficer ?? "",
    officerBadge:         "",
    citationNumber:       "",
    usdotNumber:          "",
    cvorNumber:           "",
    nscNumber:            "",
    mcNumber:             "",
    firstNoticeOfLoss:    rec.occurredAt,
    reportingSource:      rec.source === "FMCSA" ? "Police"
                          : rec.source === "CVOR" ? "Police"
                          : "Police",
  };
  references[refField] = rec.externalId;
  // Tag every per-source match-id so audit trails know which feed seeded this.
  references[`${rec.source.replace(/-/g, "_").toLowerCase()}MatchId`] = rec.externalId;

  return {
    incidentId: "",
    insuranceClaimNumber: "",
    occurredAt: rec.occurredAt,
    occurredDate: rec.occurredDate,
    incidentKind: ["crash_report"],
    accountId: rec.accountId,
    driver: {
      name:           rec.driverName ?? "",
      license:        rec.driverLicense ?? "",
      licenseState:   rec.driverLicenseState ?? rec.stateOrProvince,
      driverType:     "Long Haul Driver",
      ageBand:        "",
      drivingExperience: "",
      lengthOfEmployment: "",
      hrsDriving:     "",
      hrsOnDuty:      "",
      email:          "",
      phone:          "",
    },
    location: {
      unit:            "",
      streetAddress:   "",
      city:            rec.city,
      stateOrProvince: rec.stateOrProvince,
      country:         rec.country,
      zip:             "",
      full:            `${rec.city}, ${rec.stateOrProvince}, ${rec.country}`,
      geo:             { lat: 0, lng: 0 },
      locationType:    "Highway",
    },
    vehicles: [
      {
        assetId: "",
        vin: rec.vehicleVin ?? "",
        licenseNumber: rec.vehiclePlate ?? "",
        licenseStateOrProvince: rec.stateOrProvince,
        vehicleType: "Power Unit",
        make: rec.vehicleMakeModel?.split(" ")[0] ?? "",
        model: rec.vehicleMakeModel?.split(" ").slice(1).join(" ") ?? "",
        year: "",
        commodityType: "",
        assetCategory: "CMV",
      },
    ],
    severity: {
      fatalities: rec.fatalities,
      injuriesNonFatal: rec.injuries,
      towAway: rec.towAway,
      vehiclesTowed: rec.towAway ? 1 : 0,
      hazmatReleased: false,
      hazardousCommodity: "",
    },
    roadway: {
      postedSpeedLimitKmh: "",
      roadType: "Highway",
      trafficControl: "None",
      weatherConditions: "",
      roadConditions: "",
      light: "",
      terrain: "",
    },
    references,
    equipment: {
      trailer1UnitNumber: "",
      trailer1Plate: "",
      trailer1Vin: "",
      trailer2UnitNumber: "",
      trailer2Plate: "",
      trailer2Vin: "",
      odometer: "",
      gvw: "",
      axles: "",
      tripStatus: "",
      originCity: "",
      originState: "",
      destinationCity: rec.city,
      destinationState: rec.stateOrProvince,
      lastDutyStatus: "Driving",
      lastDvirStatus: "",
    },
    insurance: {
      carrierName: "",
      policyNumber: "",
      adjusterName: "",
      adjusterPhone: "",
      tpaName: "",
      towCompany: "",
      towBill: "",
      repairVendor: "",
      repairStatus: "Pending",
      totalLoss: false,
      subrogationPending: false,
    },
    otherParty: {},
    cause: { primaryCause: "Unknown", incidentType: "" },
    classification: {
      fmcsaReportable: reportableTone,
      fmcsr39015: reportableTone ? "Yes" : "Not Applicable",
      accidentType: rec.towAway ? "Tow Away" : (rec.injuries > 0 ? "Injury" : "Property Damage Only"),
      policeReport: true,
    },
    preventability: { value: "tbd", isPreventable: null, notes: "" },
    sources: [rec.source.toLowerCase().replace(/-/g, "_") + "_feed", "external_match_seed"],
    status: { value: "open", label: "Open — pending review" },
    documents: [] as string[],
    costs: {
      currency: rec.country === "Canada" ? "CAD" : "USD",
      companyCostsFromDollarOne: 0,
      insuranceCostsPaid: 0,
      insuranceReserves: 0,
      totalAccidentCosts: 0,
    },
    followUp: {
      action: `Imported from ${meta.label} feed (${rec.externalId}); pending carrier review.`,
      comments: rec.rawDescription,
    },
    /** Internal flag so the form header can show a "from external feed" badge. */
    _seededFromFeed: { source: rec.source, externalId: rec.externalId, agency: rec.reportedBy },
  } as any;
}

function ComplianceReconciliationBanner({
  verifiedCount, missing, showMissing, onToggle, onLog, onDismiss, onSyncFeeds, lastSyncedAt,
}: {
  verifiedCount: number;
  missing: ExternalAccidentRecord[];
  showMissing: boolean;
  onToggle: () => void;
  onLog: (rec: ExternalAccidentRecord) => void;
  onDismiss: (externalId: string) => void;
  onSyncFeeds?: () => void;
  lastSyncedAt?: number | null;
}) {
  const bySource = useMemo(() => {
    const m = new Map<ExternalFeedSource, number>();
    for (const r of missing) m.set(r.source, (m.get(r.source) ?? 0) + 1);
    return m;
  }, [missing]);

  // Sources actually present in the active scope — drives the dynamic
  // wording in the header description so we never mention sources the
  // carrier doesn't have data for.
  const presentSources = useMemo(() => Array.from(bySource.keys()), [bySource]);

  // Row selection + pagination state for the missing list when expanded.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Keep the banner mounted even with zero records when a sync handler is
  // wired up, so the user can always click "Sync feeds" to pull a fresh
  // batch from the regulator. Hide it entirely otherwise (legacy behaviour).
  if (missing.length === 0 && verifiedCount === 0 && !onSyncFeeds) return null;

  const hasMissing = missing.length > 0;
  const expanded = hasMissing && showMissing;

  const totalPages = Math.max(1, Math.ceil(missing.length / perPage));
  const safePage   = Math.min(page, totalPages);
  const startIdx   = (safePage - 1) * perPage;
  const pageSlice  = missing.slice(startIdx, startIdx + perPage);
  const pageIds    = pageSlice.map(r => r.externalId);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const someOnPageSelected = pageIds.some(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };
  const logAllSelected = () => {
    const selected = missing.filter(r => selectedIds.has(r.externalId));
    selected.forEach(r => onLog(r));
    setSelectedIds(new Set());
  };
  const dismissAllSelected = () => {
    const selected = [...selectedIds];
    selected.forEach(id => onDismiss(id));
    setSelectedIds(new Set());
  };

  // Neutral white card with a thin amber/emerald accent strip — same
  // shape used on Tickets + Violations, so the missing-records banner
  // reads consistently across all three pages.
  return (
    <div className="mb-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex overflow-hidden">
        <div className={`w-1.5 shrink-0 ${hasMissing ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="px-4 py-3 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${hasMissing ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <AlertTriangle size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {hasMissing
                    ? `${missing.length} external record${missing.length === 1 ? "" : "s"} missing`
                    : verifiedCount > 0
                      ? "Accident log reconciled with external feeds"
                      : "No external feed entries received yet"}
                </h3>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {verifiedCount > 0 && (
                    <>
                      <span className="font-semibold text-slate-700 tabular-nums">{verifiedCount}</span> verified by external feeds
                    </>
                  )}
                  {hasMissing && (
                    <>
                      {verifiedCount > 0 && <span className="mx-1.5 text-slate-300">·</span>}
                      Found in{' '}
                      {Array.from(bySource.entries()).map(([s, n], i) => (
                        <React.Fragment key={s}>
                          {i > 0 && <span className="text-slate-300">, </span>}
                          <span className="text-slate-700">{s}</span>
                          <span className="text-slate-400 tabular-nums"> ({n})</span>
                        </React.Fragment>
                      ))}
                    </>
                  )}
                  {!hasMissing && verifiedCount === 0 && (
                    <span className="italic text-slate-400">
                      Click Sync feeds to pull a fresh batch from FMCSA / CVOR / NSC.
                    </span>
                  )}
                  {presentSources.length > 0 && !hasMissing && (
                    <>
                      <span className="mx-1.5 text-slate-300">·</span>
                      Sources:{' '}
                      {presentSources.map((s, i) => (
                        <React.Fragment key={s}>
                          {i > 0 && <span className="text-slate-300">, </span>}
                          <span className="text-slate-700">{s}</span>
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                {onSyncFeeds && (
                  <button
                    type="button"
                    onClick={onSyncFeeds}
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
                    title="Pull a fresh batch of regulator-feed entries (FMCSA / CVOR / NSC)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sync feeds
                  </button>
                )}
                {hasMissing && (
                  <button
                    type="button"
                    onClick={onToggle}
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                  >
                    {showMissing ? 'Hide' : 'Show'} missing
                    {showMissing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              {lastSyncedAt && (
                <span className="text-[10px] text-slate-400 tabular-nums">
                  Last synced {new Date(lastSyncedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

        {/* Table — flush with the banner above, sharing the outer border. */}
        {expanded && (
          <div className="bg-white">
          {/* Bulk action bar */}
          {selectedCount > 0 && (
            <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-blue-800">
                {selectedCount} record{selectedCount === 1 ? "" : "s"} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs font-medium text-blue-700 hover:text-blue-900"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={dismissAllSelected}
                  className="inline-flex items-center gap-1 px-2.5 h-7 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                >
                  <X size={12} /> Dismiss {selectedCount}
                </button>
                <button
                  type="button"
                  onClick={logAllSelected}
                  className="inline-flex items-center gap-1 px-3 h-7 text-xs font-bold rounded-md bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
                >
                  <Plus size={12} /> Add {selectedCount} accident{selectedCount === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          )}

          {/* Compact 5-column table — only renders fields each source
              actually carries. Vehicle + severity + reportedBy live inside
              the Reference cell so the row stays narrow regardless of
              whether the feed produced them. */}
          <table className="w-full text-sm">
            <thead className="bg-amber-50/60 border-b border-amber-200 text-[10px] uppercase font-bold tracking-wider text-amber-800">
              <tr>
                <th className="w-8 px-2 py-2">
                  <input
                    type="checkbox"
                    className="rounded border-amber-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                    checked={allOnPageSelected}
                    ref={el => { if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected; }}
                    onChange={toggleAllOnPage}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Select all on page"
                  />
                </th>
                <th className="px-3 py-2 text-left w-[140px]">Source / Date</th>
                <th className="px-3 py-2 text-left">Driver</th>
                <th className="px-3 py-2 text-left">Severity</th>
                <th className="px-3 py-2 text-left">Reference</th>
                <th className="px-3 py-2 text-right w-[140px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {pageSlice.map((rec) => {
                const checked = selectedIds.has(rec.externalId);
                return (
                <tr
                  key={rec.externalId}
                  role="button"
                  tabIndex={0}
                  onClick={() => onLog(rec)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onLog(rec); } }}
                  title="Click to log this accident with pre-filled details"
                  className={`group/row hover:bg-amber-50/50 cursor-pointer transition-colors ${checked ? "bg-blue-50/40" : ""}`}
                >
                  <td className="w-8 px-2 py-2.5 align-top" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="rounded border-amber-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                      checked={checked}
                      onChange={() => toggleOne(rec.externalId)}
                      aria-label={`Select ${rec.externalId}`}
                    />
                  </td>
                  {/* Source + Date */}
                  <td className="px-3 py-2.5 align-top whitespace-nowrap">
                    <div className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${SOURCE_TONE[rec.source]}`}>
                      {SOURCE_META[rec.source].short}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">{new Date(rec.occurredAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400 tabular-nums">
                      {new Date(rec.occurredAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  {/* Driver — name + licence (only when carried) */}
                  <td className="px-3 py-2.5 align-top max-w-[160px]">
                    {rec.driverName ? (
                      <p className="text-slate-700 truncate" title={rec.driverName}>{rec.driverName}</p>
                    ) : (
                      <span className="text-slate-300 text-[11px]">No driver info</span>
                    )}
                    {rec.driverLicense && (
                      <p className="text-slate-400 font-mono text-[10px] truncate" title={rec.driverLicense}>DL {rec.driverLicense}</p>
                    )}
                  </td>
                  {/* Severity + reporting agency */}
                  <td className="px-3 py-2.5 align-top max-w-[200px]">
                    <p className="text-[12px] font-semibold text-slate-900 capitalize">{rec.severitySummary}</p>
                    <p className="text-[10px] text-slate-400 truncate" title={rec.reportedBy}>{rec.reportedBy}</p>
                  </td>
                  {/* Reference — externalId + vehicle + location, all
                      conditional on the source actually carrying them. */}
                  <td className="px-3 py-2.5 align-top whitespace-nowrap">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{SOURCE_META[rec.source].short} ID</p>
                    <p className="font-mono text-[11px] text-slate-800 truncate max-w-[180px]" title={rec.externalId}>{rec.externalId}</p>
                    {(rec.city || rec.stateOrProvince) && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        {[rec.city, rec.stateOrProvince].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {rec.vehiclePlate && (
                      <p className="text-[10px] text-slate-500">
                        Plate <span className="font-mono text-slate-700">{rec.vehiclePlate}</span>
                      </p>
                    )}
                    {rec.vehicleMakeModel && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{rec.vehicleMakeModel}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600 group-hover/row:bg-blue-700 text-white text-[11px] font-bold transition-colors">
                      <Plus size={11} /> Add
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDismiss(rec.externalId); }}
                      aria-label="Dismiss"
                      title="Dismiss this missing record"
                      className="ml-1 p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>

          {/* Pagination footer */}
          <div className="border-t border-amber-200 px-3 py-2 flex items-center justify-between gap-3 flex-wrap bg-amber-50/40">
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <span>Rows per page:</span>
              <select
                className="h-6 px-1.5 border border-slate-200 rounded bg-white text-[11px] focus:outline-none"
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              >
                {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="ml-2 text-slate-400">
                {startIdx + 1}-{Math.min(startIdx + perPage, missing.length)} of {missing.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-[11px] text-slate-600 tabular-nums">
                {safePage} / {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

interface AccidentsPageProps {
  /** When provided, the table is scoped to that carrier's accidents only. */
  accountId?: string;
}

export function AccidentsPage({ accountId }: AccidentsPageProps = {}) {
  const initialAccidents = useMemo(() => {
    return accountId ? getAccidentsForCarrier(accountId) : CARRIER_INCIDENTS_ALL;
  }, [accountId]);

  const [data, setData] = useState<any[]>(initialAccidents);

  // Live (runtime-synced) feed entries pulled by the Sync button.
  const [liveAccidentFeeds, setLiveAccidentFeeds] = useState<ExternalAccidentRecord[]>([]);
  const [lastAccidentSyncedAt, setLastAccidentSyncedAt] = useState<number | null>(null);

  // External regulatory feeds (FMCSA / CVOR / NSC) for the active scope —
  // baseline static feeds plus any runtime-synced batches.
  const externalFeed = useMemo<ExternalAccidentRecord[]>(
    () => [
      ...(accountId ? getExternalAccidentsForCarrier(accountId) : EXTERNAL_ACCIDENT_FEEDS_ALL),
      ...liveAccidentFeeds,
    ],
    [accountId, liveAccidentFeeds],
  );

  const handleSyncAccidentFeeds = () => {
    const id = accountId ?? "acct-001";
    const batch = generateLiveAccidentBatch(id);
    if (batch.length === 0) return;
    setLiveAccidentFeeds(prev => [...batch, ...prev]);
    setLastAccidentSyncedAt(Date.now());
    setShowMissing(true);
  };

  // Match internal accidents to external feed records by date + city + ±60min.
  const matchResult = useMemo(
    () => matchInternalToExternal(data, externalFeed),
    [data, externalFeed],
  );

  // Locally-dismissed missing records (admin clicked "Dismiss"). Persists per
  // window for the session — not localStorage — so dismissals don't leak
  // across users.
  const [dismissedMissing, setDismissedMissing] = useState<Set<string>>(new Set());
  const visibleMissing = useMemo(
    () => matchResult.missing.filter((m) => !dismissedMissing.has(m.externalId)),
    [matchResult.missing, dismissedMissing],
  );

  const [showMissing, setShowMissing] = useState(false);

  // When the selected carrier changes, swap the dataset.
  useEffect(() => {
    setData(accountId ? getAccidentsForCarrier(accountId) : CARRIER_INCIDENTS_ALL);
    setDismissedMissing(new Set());
    setShowMissing(false);
    setLiveAccidentFeeds([]);
    setLastAccidentSyncedAt(null);
  }, [accountId]);

  // Suppress unused-symbol error for INCIDENTS — it's still re-exported via
  // `carrier-accidents.data` for the demo carrier and the page no longer
  // imports it directly into state. Keeping the import compiled helps the
  // bundler tree-shake.
  void INCIDENTS;
  const [q, setQ] = useState("");

  const [selected, setSelected] = useState<string[]>([]);
  const [cols, setCols] = useState(ALL_COLS);
  const [colMenu, setColMenu] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  // Accident pending a Remove confirmation. Null when the dialog is closed.
  const [removeCandidate, setRemoveCandidate] = useState<any>(null);
  // Locally-removed incident ids — overlay the source data so removed
  // accidents drop off the list (CARRIER_INCIDENTS_ALL is read-only).
  const [removedIncidentIds, setRemovedIncidentIds] = useState<Set<string>>(new Set());

  // Filters
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [driverFilter, setDriverFilter] = useState("All");
  const [driverMenu, setDriverMenu] = useState(false);
  // Source filter — derived from the accident's jurisdiction
  // (US → SMS / FMCSA, ON → CVOR, other CA → NSC). Same routing the
  // regulator feeds use.
  const [sourceFilter, setSourceFilter] = useState<'All Sources' | 'SMS' | 'CVOR' | 'NSC'>('All Sources');

  const [activeTab, setActiveTab] = useState("all");
  const driverOptions = useMemo(
    () => ["All", ...Array.from(new Set(data.map((item) => item.driver.name))).sort()],
    [data]
  );

  const filtered = useMemo(() => {
    return data.filter((item) => {
      // 0. Drop locally-removed accidents
      if (removedIncidentIds.has(item.incidentId)) return false;
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

      // 5. Source / jurisdiction filter — same routing as the regulator
      //    feeds: US state → SMS, ON → CVOR, other CA → NSC.
      if (sourceFilter !== "All Sources") {
        const state = (item.location?.stateOrProvince ?? "").toUpperCase();
        const country = item.location?.country ?? "";
        const sourceForItem = country === "Canada"
          ? (state === "ON" ? "CVOR" : "NSC")
          : "SMS";
        if (sourceForItem !== sourceFilter) return false;
      }

      return true;
    });
  }, [data, q, activeTab, dateRange, driverFilter, sourceFilter, removedIncidentIds]);

  // Sorting
  const [sortCol] = useState("date");
  const [sortDesc] = useState(true);

  // Sub-category breakdown for the active tab — drives the mini KPI strip.
  // Declared BEFORE `sorted` because `sorted` reads from `subFiltered`.
  const [subTypeFilter, setSubTypeFilter] = useState<string | null>(null);
  useEffect(() => { setSubTypeFilter(null); }, [activeTab]);
  const subTypeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of filtered) {
      const t = (item.cause?.incidentType ?? "").trim() || "(Unspecified)";
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [filtered]);

  // Apply sub-type filter to the rows that go into the table.
  const subFiltered = useMemo(() => {
    if (!subTypeFilter) return filtered;
    return filtered.filter((it) => {
      const t = (it.cause?.incidentType ?? "").trim() || "(Unspecified)";
      return t === subTypeFilter;
    });
  }, [filtered, subTypeFilter]);

  const sorted = useMemo(() => {
    return [...subFiltered].sort((a, b) => {
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
  }, [subFiltered, sortCol, sortDesc]);

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
  }, [filtered]);

  // Per-tab count is computed against the date / driver / search filtered set
  // (i.e. ignoring the tab itself). This way each tab's badge shows how many
  // records would land there under the current top-level filters.
  const tabCounts = useMemo(() => {
    const base = data.filter((item) => {
      if (q) {
        const s = q.toLowerCase();
        const m = (v: any) => v?.toLowerCase().includes(s);
        const match = m(item.incidentId) || m(item.driver?.name) || m(item.location?.city) || m(item.vehicles?.[0]?.assetId);
        if (!match) return false;
      }
      const occurred = new Date(item.occurredDate);
      if (dateRange.start && occurred < new Date(`${dateRange.start}T00:00:00`)) return false;
      if (dateRange.end && occurred > new Date(`${dateRange.end}T23:59:59`)) return false;
      if (driverFilter !== "All" && item.driver?.name !== driverFilter) return false;
      return true;
    });
    return {
      all:        base.length,
      hazmat:     base.filter((x) => x.severity?.hazmatReleased).length,
      tow:        base.filter((x) => x.severity?.towAway).length,
      injuries:   base.filter((x) => (x.severity?.injuriesNonFatal ?? 0) > 0).length,
      fatalities: base.filter((x) => (x.severity?.fatalities ?? 0) > 0).length,
    };
  }, [data, q, dateRange, driverFilter]);

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
    setSourceFilter("All Sources");
    setQ("");
  };

  // ── Dedicated Add/Edit page mode ───────────────────────────────────────
  // When `editing` is set the form takes over the entire page area instead
  // of opening as a modal overlay. The Back button restores the list.
  if (editing) {
    return (
      <EditPopup
        inc={editing}
        accountId={accountId}
        presentation="page"
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    );
  }

  // Carrier metadata for the breadcrumb subtitle — mirrors the Tickets +
  // Violations page header so all three Safety surfaces share one shape.
  const carrier = accountId ? ACCOUNTS_DB.find(a => a.id === accountId) : null;

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header — full-width white shell with bottom border, matching the
          Tickets + Violations pages so the three Safety surfaces share one
          consistent chrome. */}
      <header className="bg-white border-b border-slate-200">
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <nav className="flex items-center gap-2 mb-1 text-sm font-medium text-slate-500" aria-label="Breadcrumb">
              <span>Safety</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900">Accidents</span>
            </nav>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Accidents</h1>
            <p className="mt-1 text-xs text-slate-500">
              {carrier ? <><span className="font-semibold text-slate-700">{carrier.legalName}</span> · </> : null}
              {data.length.toLocaleString()} records · Vehicle accidents &amp; safety events
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
            >
              <Upload size={16} /> Export
            </button>
            <button
              onClick={() => setEditing({})}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all"
            >
              <Plus size={16} /> Log Accident
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable content area — same padding rhythm as before. */}
      <div className="p-6 max-w-[1600px] mx-auto">

      {/* KPI Cards — moved above the reconciliation banner so the
          page leads with the at-a-glance accident metrics. */}
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

      {/* ── Compliance reconciliation banner ───────────────────────────── */}
      <ComplianceReconciliationBanner
        verifiedCount={matchResult.verifiedByIncidentId.size}
        missing={visibleMissing}
        showMissing={showMissing}
        onToggle={() => setShowMissing((v) => !v)}
        onLog={(rec) => setEditing(externalRecordToFormSeed(rec))}
        onDismiss={(externalId) => setDismissedMissing((prev) => {
          const next = new Set(prev); next.add(externalId); return next;
        })}
        onSyncFeeds={handleSyncAccidentFeeds}
        lastSyncedAt={lastAccidentSyncedAt}
      />

      {/* ── Continuous block: Tabs + Sub-category KPIs + Controls + Table ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {[
            { id: "all",        l: "All Accidents", count: tabCounts.all,        tone: "blue",   icon: AlertTriangle },
            { id: "hazmat",     l: "Hazmat",        count: tabCounts.hazmat,     tone: "orange", icon: Activity },
            { id: "tow",        l: "Tow Away",      count: tabCounts.tow,        tone: "amber",  icon: Truck },
            { id: "injuries",   l: "Injuries",      count: tabCounts.injuries,   tone: "rose",   icon: User },
            { id: "fatalities", l: "Fatalities",    count: tabCounts.fatalities, tone: "red",    icon: UserX },
          ].map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            const activeCls =
              tab.tone === "blue"   ? "border-blue-600 text-blue-700 bg-blue-50/40"
              : tab.tone === "orange" ? "border-orange-600 text-orange-700 bg-orange-50/40"
              : tab.tone === "amber"  ? "border-amber-600 text-amber-700 bg-amber-50/40"
              : tab.tone === "rose"   ? "border-rose-600 text-rose-700 bg-rose-50/40"
              :                         "border-red-600 text-red-700 bg-red-50/40";
            const badgeCls =
              tab.tone === "blue"   ? "bg-blue-100 text-blue-700"
              : tab.tone === "orange" ? "bg-orange-100 text-orange-700"
              : tab.tone === "amber"  ? "bg-amber-100 text-amber-700"
              : tab.tone === "rose"   ? "bg-rose-100 text-rose-700"
              :                         "bg-red-100 text-red-700";
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center gap-2 px-5 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  active ? activeCls : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon size={14} className={active ? "" : "opacity-70 group-hover:opacity-100"} />
                <span className="text-sm font-semibold">{tab.l}</span>
                <span className={`inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums ${active ? badgeCls : "bg-slate-100 text-slate-500"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Mini KPI strip — sub-category breakdown for the active tab ── */}
        {(() => {
          const activeTone = activeTab === "all" ? "blue"
            : activeTab === "hazmat" ? "orange"
            : activeTab === "tow" ? "amber"
            : activeTab === "injuries" ? "rose"
            : "red";
          const stripBg =
            activeTone === "blue"   ? "bg-blue-50/40"
            : activeTone === "orange" ? "bg-orange-50/40"
            : activeTone === "amber"  ? "bg-amber-50/40"
            : activeTone === "rose"   ? "bg-rose-50/40"
            :                           "bg-red-50/40";
          const accentBar =
            activeTone === "blue"   ? "bg-blue-500"
            : activeTone === "orange" ? "bg-orange-500"
            : activeTone === "amber"  ? "bg-amber-500"
            : activeTone === "rose"   ? "bg-rose-500"
            :                           "bg-red-500";
          const countTone =
            activeTone === "blue"   ? "text-blue-700"
            : activeTone === "orange" ? "text-orange-700"
            : activeTone === "amber"  ? "text-amber-700"
            : activeTone === "rose"   ? "text-rose-700"
            :                           "text-red-700";
          const selectedRing =
            activeTone === "blue"   ? "border-blue-600 ring-2 ring-blue-300/40"
            : activeTone === "orange" ? "border-orange-600 ring-2 ring-orange-300/40"
            : activeTone === "amber"  ? "border-amber-600 ring-2 ring-amber-300/40"
            : activeTone === "rose"   ? "border-rose-600 ring-2 ring-rose-300/40"
            :                           "border-red-600 ring-2 ring-red-300/40";

          if (subTypeBreakdown.length === 0) {
            return (
              <div className="px-4 py-6 text-center text-[12px] text-slate-400 italic border-b border-slate-200 bg-slate-50/50">
                No accidents in this category for the current filters.
              </div>
            );
          }
          return (
            <div className={`px-4 py-3 border-b border-slate-200 ${stripBg}`}>
              <div className="flex items-center justify-between mb-2 gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Sub-categories — accident types in this view
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Click a card to narrow the table to that accident type
                  </div>
                </div>
                {subTypeFilter && (
                  <button
                    type="button"
                    onClick={() => setSubTypeFilter(null)}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${countTone} hover:opacity-80`}
                  >
                    Clear sub-filter <X size={11} />
                  </button>
                )}
              </div>
              {(() => {
                /**
                 * Each card gets a coordinated colour palette cycled by index
                 * (8 tones drawn from Tailwind's saturated family). The palette
                 * is muted at rest (50-tint background, 500 accent bar, 700
                 * text) so cards don't compete with the page chrome, but they
                 * stay distinct enough to scan at a glance. The selected card
                 * still adopts the parent-tab tone via the existing `accentBar`
                 * / `countTone` / `selectedRing` variables.
                 */
                const palette = [
                  { bar: "bg-sky-500",     bg: "bg-sky-50/60",     count: "text-sky-700",     chip: "bg-sky-50 text-sky-700 ring-sky-200",         barBg: "bg-sky-100",     barFill: "bg-sky-500" },
                  { bar: "bg-violet-500",  bg: "bg-violet-50/60",  count: "text-violet-700",  chip: "bg-violet-50 text-violet-700 ring-violet-200", barBg: "bg-violet-100",  barFill: "bg-violet-500" },
                  { bar: "bg-emerald-500", bg: "bg-emerald-50/60", count: "text-emerald-700", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", barBg: "bg-emerald-100", barFill: "bg-emerald-500" },
                  { bar: "bg-amber-500",   bg: "bg-amber-50/60",   count: "text-amber-700",   chip: "bg-amber-50 text-amber-700 ring-amber-200",   barBg: "bg-amber-100",   barFill: "bg-amber-500" },
                  { bar: "bg-rose-500",    bg: "bg-rose-50/60",    count: "text-rose-700",    chip: "bg-rose-50 text-rose-700 ring-rose-200",      barBg: "bg-rose-100",    barFill: "bg-rose-500" },
                  { bar: "bg-indigo-500",  bg: "bg-indigo-50/60",  count: "text-indigo-700",  chip: "bg-indigo-50 text-indigo-700 ring-indigo-200", barBg: "bg-indigo-100",  barFill: "bg-indigo-500" },
                  { bar: "bg-teal-500",    bg: "bg-teal-50/60",    count: "text-teal-700",    chip: "bg-teal-50 text-teal-700 ring-teal-200",      barBg: "bg-teal-100",    barFill: "bg-teal-500" },
                  { bar: "bg-fuchsia-500", bg: "bg-fuchsia-50/60", count: "text-fuchsia-700", chip: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200", barBg: "bg-fuchsia-100", barFill: "bg-fuchsia-500" },
                ];
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {subTypeBreakdown.map(([type, count], i) => {
                      const selected = subTypeFilter === type;
                      const sharePct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                      const c = palette[i % palette.length];
                      return (
                        <button
                          type="button"
                          key={type}
                          onClick={() => setSubTypeFilter(selected ? null : type)}
                          title={`${type} — ${count} accident${count === 1 ? "" : "s"}`}
                          className={`group text-left rounded-lg border overflow-hidden shadow-sm transition-all flex flex-col h-full ${
                            selected
                              ? `${selectedRing} bg-white`
                              : `border-slate-200 hover:border-slate-300 hover:shadow-md ${c.bg}`
                          }`}
                        >
                          <div className={`h-1 w-full ${selected ? accentBar : c.bar}`} />
                          <div className="px-3 py-2.5 flex-1 flex flex-col">
                            <div
                              className="text-[11px] font-semibold text-slate-700 leading-snug line-clamp-2 min-h-[2.6em]"
                              title={type}
                            >
                              {type}
                            </div>
                            <div className="flex items-end justify-between gap-2 mt-2">
                              <span
                                className={`text-[22px] font-bold tabular-nums leading-none ${
                                  selected ? countTone : c.count
                                }`}
                              >
                                {count}
                              </span>
                              <span
                                className={`text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded-md ring-1 ${
                                  selected
                                    ? `${countTone} ring-current/30 bg-white`
                                    : c.chip
                                }`}
                              >
                                {sharePct.toFixed(0)}%
                              </span>
                            </div>
                            <div className={`mt-2 h-1 rounded-full overflow-hidden ${selected ? "bg-slate-100" : c.barBg}`}>
                              <div
                                className={`h-full rounded-full transition-all ${
                                  selected ? accentBar : c.barFill
                                }`}
                                style={{ width: `${Math.min(100, sharePct)}%` }}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Controls — search / filters / column picker / counts */}
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

            {/* Source / regulator-jurisdiction filter — SMS / CVOR / NSC.
                Matches the Tickets + Violations pages so safety/compliance
                can scope all three surfaces by feed origin. */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
              className="h-[38px] px-3 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-gray-700"
              title="Filter by regulator source"
            >
              <option value="All Sources">All Sources</option>
              <option value="SMS">SMS (FMCSA)</option>
              <option value="CVOR">CVOR (Ontario)</option>
              <option value="NSC">NSC (Canada)</option>
            </select>

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

        {/* Table List View — within the same continuous block */}
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
                            <div className="flex flex-col gap-1">
                                <div className="flex -space-x-1">
                                    {item.sources.map((x: string, i: number) => (
                                        <span key={i} title={x}>{sourceBadge(x)}</span>
                                    ))}
                                </div>
                                {(() => {
                                    const verified = matchResult.verifiedByIncidentId.get(item.incidentId) ?? [];
                                    if (verified.length === 0) return null;
                                    return (
                                        <div className="flex items-center gap-1 flex-wrap" title="Verified by external regulator feeds (FMCSA / CVOR / NSC)">
                                            {verified.map((src: ExternalFeedSource) => (
                                                <span key={src} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${SOURCE_TONE[src]}`}>
                                                    <span aria-hidden="true">✓</span>{src}
                                                </span>
                                            ))}
                                        </div>
                                    );
                                })()}
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                              onClick={() => setEditing(item)}
                              className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600"
                              title="Edit accident"
                          >
                              <Edit size={16} />
                          </button>
                          <button
                              onClick={() => setRemoveCandidate(item)}
                              className="p-1.5 hover:bg-rose-50 rounded text-gray-500 hover:text-rose-600"
                              title="Remove accident"
                          >
                              <Trash2 size={16} />
                          </button>
                        </div>
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
      
      {/* Add/Edit form is rendered as a dedicated page above (early return). */}

      {/* ── Remove confirmation dialog — asks the user to confirm before
          destructively removing an accident from the carrier ledger. */}
      {removeCandidate && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setRemoveCandidate(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900">Remove this accident?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-mono font-semibold">{removeCandidate.incidentId}</span>
                  {removeCandidate.driver?.name && (
                    <> (driver <span className="font-semibold">{removeCandidate.driver.name}</span>)</>
                  )} will be removed from your accident log. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveCandidate(null)}
                className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemovedIncidentIds(prev => {
                    const next = new Set(prev);
                    next.add(removeCandidate.incidentId);
                    return next;
                  });
                  setRemoveCandidate(null);
                  if (detail?.incidentId === removeCandidate.incidentId) setDetail(null);
                }}
                className="h-9 px-4 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500 shadow-sm inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Remove accident
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
