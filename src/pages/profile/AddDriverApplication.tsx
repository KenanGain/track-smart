import { useState } from "react";
import {
    ApplicationFormView,
    APPLICATION_FORMS,
    type ApplicationData,
} from "@/pages/hiring-process/ApplicationSettingsPage";
import { applicationFromDriver } from "./driver-application-map";

// "Add New Driver" — the SAME fields the hiring-process Application collects,
// rendered as one big scrolling page (ApplicationFormView in "page" mode) instead
// of the step wizard. On save it maps the ApplicationData object onto the carrier
// driver record (and keeps the full object on `application` so the driver carries
// the exact same data whether they were hired through the process or added here).

type DateVal = { m: string; d: string; y: string };
type DateMY = { m: string; y: string };

const pad = (n: string) => (n ? n.padStart(2, "0") : "");
// yyyy-mm-dd (falls back to the 1st when only month/year are known)
const fmtDMY = (v?: DateVal) => (v && v.m && v.y ? `${v.y}-${pad(v.m)}-${pad(v.d) || "01"}` : "");
const fmtMY = (v?: DateMY) => (v && v.m && v.y ? `${v.y}-${pad(v.m)}` : "");
const toCountry = (c: string) => (c === "Canada" ? "Canada" : "USA");

function toDomain(d: ApplicationData) {
    const licenses = d.licenses
        .filter((l) => l.number || l.authority)
        .map((l, i) => ({
            id: `lic-${i}`,
            type: l.commercial === "Yes" ? "CDL" : "Driver License",
            licenseNumber: l.number,
            province: l.authority,
            country: toCountry(l.country),
            class: l.licenseClass,
            issueDate: "",
            expiryDate: fmtDMY(l.exp),
            status: "Valid",
            conditions: "",
            endorsements: l.endorsements,
            restrictions: [] as string[],
            isPrimary: i === 0,
            suspended: false,
            uploadType: "images",
        }));
    const primary = licenses[0];

    const employmentHistory = d.employers.map((e) => ({
        employerName: e.company,
        address: { address: e.addr1, unit: e.addr2, city: e.city, state: e.state, zip: e.zip, country: e.country },
        startDate: fmtMY(e.start),
        endDate: fmtMY(e.end),
        operatingZone: "",
        terminationStatus: e.terminated === "Yes" ? "Terminated" : "Voluntary",
        employerContact: { name: "", phone: e.telephone, email: "", fax: "" },
    }));

    const previousResidences = d.residenceRows.map((r) => ({
        country: toCountry(r.country),
        address: r.address,
        unit: r.unit,
        city: r.city,
        state: r.state,
        zip: r.zip,
        startDate: fmtDMY(r.start),
        endDate: fmtDMY(r.end),
    }));

    const travelDocuments = [
        ...(d.passport.number || d.passport.doc
            ? [{ id: "passport", type: "Passport", number: d.passport.number, country: d.passport.country, expiryDate: fmtDMY(d.passport.expiry), uploadType: "images" }]
            : []),
        ...(d.visa.has === "Yes" && (d.visa.number || d.visa.doc)
            ? [{ id: "visa", type: "Visa", number: d.visa.number, country: "", expiryDate: fmtDMY(d.visa.expiry), uploadType: "images" }]
            : []),
    ];

    const first = d.firstName.trim();
    const last = d.lastName.trim();

    return {
        driverType: d.position || "Company Driver",
        firstName: first,
        middleName: d.middleName,
        lastName: last,
        name: `${first} ${last}`.trim(),
        avatarInitials: `${first.charAt(0)}${last.charAt(0)}`.toUpperCase(),
        dob: d.dob,
        gender: "Prefer not to say",
        ssn: d.ssn,
        citizenship: toCountry(d.address.country),
        authorizedToWork: d.legalRightUS || d.legalRightCA,
        phone: d.phone,
        email: d.email,
        address: d.address.addr1,
        unit: d.address.unit,
        city: d.address.city,
        state: d.address.state,
        zip: d.address.zip,
        country: toCountry(d.address.country),
        licenseNumber: primary?.licenseNumber ?? "",
        licenseState: primary?.province ?? "",
        licenseExpiry: primary?.expiryDate ?? "",
        licenses,
        employmentHistory,
        emergencyContacts: [] as any[],
        previousResidences,
        travelDocuments,
        documents: d.signedDoc
            ? [{ id: "signed-application", label: "Signed Application", file: d.signedDoc, category: "Application" }]
            : [],
        // The full application object — the same data captured across the app.
        application: d,
    };
}

export function AddDriverApplication({ onSave, onCancel, defaultType = "us", initialDriver }: {
    onSave: (domain: any) => void;
    onCancel: () => void;
    defaultType?: string;
    // When editing an existing driver, its record — pre-fills the form and is
    // preserved (id / status / dates) on save.
    initialDriver?: any;
}) {
    const isEditing = !!initialDriver;
    // Edit: pre-fill from the driver's stored application (or derive one).
    const initialData: ApplicationData | undefined = isEditing
        ? (initialDriver.application ?? applicationFromDriver(initialDriver))
        : undefined;

    const [configId, setConfigId] = useState(initialData?.type ?? defaultType);
    const config = APPLICATION_FORMS.find((f) => f.id === configId) ?? APPLICATION_FORMS[0];

    return (
        <ApplicationFormView
            config={config}
            mode="page"
            headerTitle={isEditing ? "Edit Driver" : "Add New Driver"}
            saveLabel={isEditing ? "Save Changes" : "Save Driver"}
            initialData={initialData}
            onConfigChange={setConfigId}
            onSaveDriver={(d) => onSave(isEditing ? { ...initialDriver, ...toDomain(d), id: initialDriver.id } : toDomain(d))}
            onBack={onCancel}
        />
    );
}
