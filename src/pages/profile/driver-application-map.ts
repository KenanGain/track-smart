import type { ApplicationData } from "@/pages/hiring-process/ApplicationSettingsPage";

// Maps a carrier "domain" Driver record ↔ the shared ApplicationData object so
// EVERY driver — seeded or added through the Add Driver form — carries the same
// data file. Type-only import above means no runtime dependency on the hiring
// page (safe to use inside data modules loaded at startup).

type DateVal = { m: string; d: string; y: string };
type DateMY = { m: string; y: string };

const EMPTY_DMY: DateVal = { m: "", d: "", y: "" };
const EMPTY_MY: DateMY = { m: "", y: "" };

// "yyyy-mm-dd" → { m, d, y }
function toDateVal(s?: string): DateVal {
    if (!s) return { ...EMPTY_DMY };
    const [y = "", m = "", d = ""] = String(s).split("-");
    return { m: m.replace(/^0/, ""), d: d.replace(/^0/, ""), y };
}
// "yyyy-mm-dd" or "yyyy-mm" → { m, y }
function toDateMY(s?: string): DateMY {
    if (!s) return { ...EMPTY_MY };
    const [y = "", m = ""] = String(s).split("-");
    return { m: m.replace(/^0/, ""), y };
}

const TYPE_FOR_COUNTRY = (country?: string) => (country === "Canada" ? "canada" : "us");
const TYPE_NAME: Record<string, string> = {
    us: "US Only Driver",
    canada: "Canada Only Driver",
    "cross-border": "Canada (Cross Border)",
};

/** A fully-formed, empty ApplicationData for the given driver/region type. */
export function emptyApplication(typeId = "us"): ApplicationData {
    const country = typeId === "us" ? "United States" : "Canada";
    return {
        type: typeId,
        typeName: TYPE_NAME[typeId] ?? "US Only Driver",
        firstName: "", middleName: "", lastName: "", suffix: "",
        email: "", phone: "", cellPhone: "",
        dob: "", ssn: "", legalRightUS: false, legalRightCA: false,
        position: "", operatesInUS: typeId === "canada" ? "No" : "Yes",
        address: { addr1: "", unit: "", addr2: "", country, city: "", state: "", zip: "" },
        resided3yr: "", residenceRows: [],
        preferredContact: "Primary Phone", bestTime: "Any",
        licenses: [], drivingExp: [],
        mvr: {},
        hadAccidents: "", accidents: [],
        hadViolations: "", incidents: [],
        employedRecently: "", employers: [],
        wasUnemployed: "", unemployment: [],
        attendedSchool: "", education: [],
        militaryEver: "", military: { country: "", branch: "", start: { ...EMPTY_MY }, end: { ...EMPTY_MY }, rank: "", dd214: "", dd214Doc: "" },
        passport: { number: "", country, expiry: { ...EMPTY_DMY }, doc: "" },
        visa: { has: "", number: "", type: "", expiry: { ...EMPTY_DMY }, doc: "", monitor: true, reminderDays: [90, 60, 30] },
        workPermit: { has: "", number: "", type: "", expiry: { ...EMPTY_DMY }, doc: "", monitor: true, reminderDays: [90, 60, 30] },
        signedDoc: "",
    };
}

/** Derive an ApplicationData object from a domain Driver record. */
export function applicationFromDriver(driver: any): ApplicationData {
    const d = driver ?? {};
    const country: string = d.country === "Canada" || d.citizenship === "Canada" ? "Canada" : "United States";
    const typeId = TYPE_FOR_COUNTRY(d.country ?? d.citizenship);
    const base = emptyApplication(typeId);

    const licenses = Array.isArray(d.licenses)
        ? d.licenses.map((l: any) => ({
              number: l.licenseNumber ?? l.number ?? "",
              country: l.country === "Canada" ? "Canada" : "United States",
              authority: l.province ?? l.issuingRegion ?? "",
              exp: toDateVal(l.expiryDate),
              medicalExp: { ...EMPTY_DMY },
              current: l.isPrimary ? "Yes" : "",
              commercial: /cdl|class a|class b|az/i.test(`${l.type ?? ""} ${l.class ?? ""}`) ? "Yes" : "No",
              licenseClass: l.class ?? "",
              endorsements: Array.isArray(l.endorsements) ? l.endorsements : [],
              frontImage: "", backImage: "",
          }))
        : [];

    const employers = Array.isArray(d.employmentHistory)
        ? d.employmentHistory.map((e: any) => {
              const addr = typeof e.address === "object" && e.address ? e.address : { address: e.address ?? "" };
              return {
                  company: e.employerName ?? "",
                  start: toDateMY(e.startDate),
                  end: toDateMY(e.endDate),
                  addr1: addr.address ?? "", addr2: addr.unit ?? "",
                  country: addr.country ?? country,
                  city: addr.city ?? "", state: addr.state ?? "", zip: addr.zip ?? "",
                  telephone: e.employerContact?.phone ?? "",
                  position: "", reasonLeaving: "",
                  terminated: e.terminationStatus === "Terminated" ? "Yes" : "No",
                  current: "No", mayContact: "Yes", operatedCMV: "Yes",
                  subjectFMCSR: "", safetySensitive: "",
                  docs: { experience: "upload", insurance: "upload" },
              };
          })
        : [];

    const residenceRows = Array.isArray(d.previousResidences)
        ? d.previousResidences.map((r: any) => ({
              address: r.address ?? "", unit: r.unit ?? "",
              country: r.country === "Canada" ? "Canada" : "United States",
              city: r.city ?? "", state: r.state ?? "", zip: r.zip ?? "",
              start: toDateVal(r.startDate), end: toDateVal(r.endDate),
          }))
        : [];

    const travel: any[] = Array.isArray(d.travelDocuments) ? d.travelDocuments : [];
    const pp = travel.find((t) => /passport/i.test(t.type ?? ""));
    const vs = travel.find((t) => /visa/i.test(t.type ?? ""));
    const wp = travel.find((t) => /work\s*permit/i.test(t.type ?? ""));

    return {
        ...base,
        firstName: d.firstName ?? "",
        middleName: d.middleName ?? "",
        lastName: d.lastName ?? "",
        email: d.email ?? "",
        phone: d.phone ?? "",
        cellPhone: d.phone ?? "",
        dob: d.dob ?? "",
        ssn: d.ssn ?? "",
        legalRightUS: country !== "Canada" ? !!d.authorizedToWork : false,
        legalRightCA: country === "Canada" ? !!d.authorizedToWork : false,
        position: d.driverType ?? "",
        address: {
            addr1: d.address ?? "", unit: d.unit ?? "", addr2: "",
            country, city: d.city ?? "", state: d.state ?? "", zip: d.zip ?? "",
        },
        resided3yr: residenceRows.length ? "No" : "Yes",
        residenceRows,
        licenses,
        employedRecently: employers.length ? "Yes" : "No",
        employers,
        passport: pp
            ? { number: pp.number ?? "", country: pp.country ?? country, expiry: toDateVal(pp.expiryDate), doc: pp.number ? "passport.pdf" : "" }
            : base.passport,
        visa: vs
            ? { has: "Yes", number: vs.number ?? "", type: vs.visaType ?? "", expiry: toDateVal(vs.expiryDate), doc: vs.number ? "visa.pdf" : "", monitor: vs.monitor ?? true, reminderDays: vs.reminderDays ?? [90, 60, 30] }
            : { ...base.visa, has: "No" },
        workPermit: wp
            ? { has: "Yes", number: wp.number ?? "", type: wp.visaType ?? wp.permitType ?? "", expiry: toDateVal(wp.expiryDate), doc: wp.number ? "work-permit.pdf" : "", monitor: wp.monitor ?? true, reminderDays: wp.reminderDays ?? [90, 60, 30] }
            : { ...base.workPermit, has: "No" },
    };
}
