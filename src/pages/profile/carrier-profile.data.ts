// Carrier Dashboard Data Constants

export const DIRECTOR_UI = {
    viewModal: {
        title: "Director Details",
        subtitle: "View and manage director information",
        sections: [
            {
                key: "contact",
                label: "CONTACT INFORMATION",
                fields: [
                    { key: "email", label: "Email Address", icon: "Mail" },
                    { key: "phone", label: "Phone Number", icon: "Phone" },
                    { key: "office", label: "Office Location", icon: "MapPin", fullWidth: true }
                ]
            },
            {
                key: "role",
                label: "ROLE & COMPLIANCE",
                fields: [
                    { key: "dateAppointed", label: "Date of Appointment", icon: "Calendar" },
                    { key: "dateResigned", label: "Date of Resignation", icon: "CalendarX" },
                    { key: "responsibility", label: "Primary Responsibility", icon: "Shield" }
                ]
            }
        ]
    },
    editModal: {
        title: "Edit Director",
        subtitle: "Update director profile, contact, and compliance responsibilities.",
        saveLabel: "Save Changes",
        fields: [
            { key: "name", label: "Full Name", type: "text", required: true },
            { key: "role", label: "Role Title", type: "text", required: false },
            { key: "email", label: "Email Address", type: "email", required: true },
            { key: "phone", label: "Phone Number", type: "tel", required: true },
            { key: "stockClass", label: "Stock Class", type: "text", required: false },
            { key: "ownershipPct", label: "Ownership %", type: "number", required: true },
            { key: "dateAppointed", label: "Date of Appointment", type: "date", required: false },
            { key: "dateResigned", label: "Date of Resignation", type: "date", required: false },
            { key: "responsibility", label: "Primary Responsibility", type: "textarea", required: false, placeholder: "Describe this director's primary areas of responsibility and oversight...", rows: 4 }
        ],
        layout: [
            ["name", "role"],
            ["email", "phone"],
            ["stockClass", "ownershipPct"],
            ["dateAppointed", "dateResigned"],
            ["responsibility"]
        ]
    },
    directors: {
        "Johnathan Doe": {
            name: "Johnathan Doe",
            role: "Director of Operations",
            initials: "JD",
            since: "Jan 2019",
            isPrimary: true,
            stockClass: "Class A Common Stock",
            ownershipPct: 65,
            email: "j.doe@acmetrucking.com",
            phone: "+1 (555) 123-4567",
            office: "1200 North Dupont Hwy, Wilmington, DE",
            dateAppointed: "2019-01-15",
            dateResigned: "",
            responsibility: "Operations"
        },
        "Sarah Smith": {
            name: "Sarah Smith",
            role: "VP of Operations",
            initials: "SS",
            since: "Mar 2020",
            isPrimary: false,
            stockClass: "Class B Common Stock",
            ownershipPct: 35,
            email: "s.smith@acmetrucking.com",
            phone: "+1 (555) 987-6543",
            office: "1200 North Dupont Hwy, Wilmington, DE",
            dateAppointed: "2020-03-10",
            dateResigned: "",
            responsibility: "Compliance"
        }
    }
};

export const UI_DATA = {
    editModals: {
        corporateIdentity: {
            id: "editCorporateIdentity",
            title: "Edit Corporate Identity",
            subtitle: "Update your company's official registration details.",
            icon: "Building2",
            saveLabel: "Save Changes",
            fields: [
                { key: "dotNumber",  label: "DOT Number",  type: "dotLookup", required: false, placeholder: "1234567",   helperText: "US Federal Motor Carrier Safety Administration (FMCSA) USDOT #. Click Lookup to pull SAFER record." },
                { key: "cvorNumber", label: "CVOR Number", type: "text",      required: false, placeholder: "CVOR-00123", helperText: "Ontario Commercial Vehicle Operator's Registration number." },
                { key: "nscNumber",  label: "NSC Number",  type: "text",      required: false, placeholder: "AB-12345",   helperText: "Canadian National Safety Code carrier identifier issued by the home province." },
                { key: "rinNumber",  label: "RIN",         type: "text",      required: false, placeholder: "RIN-0099",   helperText: "Registered Importer / Registration Identification Number." },
                { key: "legalName",  label: "Legal Name",  type: "text",      required: true,  placeholder: "Acme Trucking Inc." },
                { key: "dbaName",    label: "DBA Name",    type: "text",      required: false, placeholder: "Acme Logistics" },
                { key: "businessType",    label: "Business Type",    type: "select", required: true,  options: ["Corporation", "LLC", "Sole Proprietor", "Partnership"] },
                { key: "stateOfInc",      label: "State of Inc.",    type: "select", required: true,  options: ["Delaware", "California", "Texas", "Florida", "New York"] },
                { key: "extraProvincial", label: "Extra-Provincial", type: "select", required: false, options: ["Yes", "No"], helperText: "Operates commercial vehicles across provincial or federal borders." },
                { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive", "Suspended", "Pending"], helperText: "Current operating status of the carrier record." }
            ],
            layout: [["dotNumber", "cvorNumber"], ["nscNumber", "rinNumber"], ["legalName", "dbaName"], ["businessType", "stateOfInc"], ["extraProvincial"]],
            values: { dotNumber: "3421765", cvorNumber: "CVOR-00123", nscNumber: "AB-12345", rinNumber: "RIN-0099", legalName: "Acme Trucking Inc.", dbaName: "Acme Logistics", businessType: "Corporation", stateOfInc: "Delaware", extraProvincial: "Yes", status: "Active" }
        },
        legalMainAddress: {
            id: "editLegalMainAddress",
            title: "Edit Legal / Main Address",
            subtitle: "Update your primary business location.",
            icon: "MapPin",
            saveLabel: "Save Changes",
            fields: [
                { key: "country", label: "Country", type: "select", required: false, options: ["United States", "Canada"] },
                { key: "street", label: "Street Address", type: "text", required: false, placeholder: "1200 North Dupont Highway" },
                { key: "apt", label: "Apartment, suite, etc.", type: "text", required: false, placeholder: "(Optional)" },
                { key: "city", label: "City", type: "text", required: false, placeholder: "Wilmington" },
                { key: "state", label: "State", type: "select", required: false, options: ["DE", "NY", "CA", "TX"] },
                { key: "zip", label: "ZIP Code", type: "text", required: false, placeholder: "19801" }
            ],
            layout: [["country"], ["street"], ["apt"], ["city", "state"], ["zip"]],
            values: { country: "United States", street: "1200 North Dupont Highway", apt: "", city: "Wilmington", state: "DE", zip: "19801" }
        },
        fleetDriverOverview: {
            id: "editFleetDriverOverview",
            title: "Edit Fleet & Driver Overview",
            subtitle: "Update your fleet statistics below.",
            icon: "Truck",
            saveLabel: "Save Changes",
            fields: [
                { key: "powerUnits", label: "Power Units", type: "number", required: true, info: true },
                { key: "drivers", label: "Drivers", type: "number", required: true, info: true },
                { key: "nonCmv", label: "Non-CMV Vehicles", type: "number", required: false, info: true, helperText: "Vehicles under 10,001 lbs." }
            ],
            layout: [["powerUnits", "drivers"], ["nonCmv"]],
            values: { powerUnits: 80, drivers: 120, nonCmv: 0 }
        },
        mailingAddress: {
            id: "editMailingAddress",
            title: "Edit Mailing Address",
            subtitle: "",
            icon: "Mail",
            saveLabel: "Save Changes",
            fields: [
                { key: "streetOrPo", label: "Street Address or PO Box", type: "text", required: true, placeholder: "PO Box 8890" },
                { key: "city", label: "City", type: "text", required: true, placeholder: "Wilmington" },
                { key: "state", label: "State", type: "select", required: true, options: ["DE", "NY", "CA", "TX"] },
                { key: "zip", label: "ZIP Code", type: "text", required: true, placeholder: "19899" },
                { key: "country", label: "Country", type: "select", required: true, options: ["United States", "Canada"] }
            ],
            layout: [["streetOrPo"], ["city", "state"], ["zip", "country"]],
            values: { streetOrPo: "PO Box 8890", city: "Wilmington", state: "DE", zip: "19899", country: "United States" }
        },
        operationsAuthority: {
            id: "editOperationsAuthority",
            title: "Operations & Authority",
            subtitle: "Edit your company's operational details.",
            icon: "ShieldCheck",
            saveLabel: "Save Changes",
            fields: [
                { key: "operationClassification", label: "Operation Classification", type: "select", required: false, options: ["Authorized for Hire", "Private Carrier", "Exempt For Hire"] },
                { key: "carrierOperation", label: "Carrier Operation", type: "radioCards", required: false, options: [{ value: "Interstate" }, { value: "Intrastate Only (Hazmat)" }, { value: "Intrastate Only (Non-Hazmat)" }] },
                { key: "fmcsaAuthorityType", label: "FMCSA Operating Authority Types", type: "radioList", required: false, options: ["Motor Carrier of Property", "Motor Carrier of Household Goods", "Broker of Property"] }
            ],
            layout: [["operationClassification"], ["carrierOperation"], ["fmcsaAuthorityType"]],
            values: { operationClassification: "Authorized for Hire", carrierOperation: "Intrastate Only (Non-Hazmat)", fmcsaAuthorityType: "Motor Carrier of Property" }
        },
        addOfficeLocation: {
            id: "addOfficeLocation",
            title: "Add Office Location",
            subtitle: "Enter the details for the new corporate office.",
            icon: "MapPin",
            saveLabel: "Add Location",
            fields: [
                { key: "label", label: "Location Label", type: "text", required: true, placeholder: "e.g. Phoenix Branch" },
                { key: "address", label: "Full Address", type: "text", required: true, placeholder: "123 Main St, Phoenix, AZ 85001" },
                { key: "contact", label: "Contact Person", type: "text", required: true, placeholder: "Manager Name" },
                { key: "phone", label: "Phone Number", type: "tel", required: true, placeholder: "+1 (555) 000-0000" }
            ],
            layout: [["label"], ["address"], ["contact", "phone"]],
            values: { label: "", address: "", contact: "", phone: "" }
        }
    },
    cargoEditor: {
        searchPlaceholder: "Search cargo type...",
        selectedLabel: "Selected",
        selectCommonLabel: "Select Common Types",
        clearAllLabel: "Clear All",
        commonTypes: ["General Freight", "Building Materials", "Fresh Produce", "Refrigerated Food", "Beverages", "Paper Products"],
        sections: [
            {
                key: "generalFreight",
                label: "GENERAL FREIGHT & HOUSEHOLD",
                items: [
                    "General Freight",
                    "Household Goods",
                    "Furniture",
                    "Paper Products",
                    "Utility",
                    "U.S. Mail",
                    "Mobile Homes",
                    "Motor Vehicles",
                    "Passengers",
                    "Electronics",
                    "Pharmaceutical Products",
                    "Garments",
                    "Office Supplies",
                    "Grocery Items",
                    "Plastic Products",
                    "Auto Parts",
                    "Appliances"
                ]
            },
            {
                key: "foodTemp",
                label: "FOOD & TEMPERATURE CONTROLLED",
                items: [
                    "Fresh Produce",
                    "Meat",
                    "Refrigerated Food",
                    "Beverages",
                    "Livestock",
                    "Grain, Feed, Hay",
                    "Farm Supplies",
                    "Beer",
                    "Liquor",
                    "Sea Food",
                    "Packaged Meat",
                    "Frozen Food/Cooled Produce",
                    "Milk Products",
                    "Bakery Products"
                ]
            },
            {
                key: "constructionIndustrial",
                label: "CONSTRUCTION & INDUSTRIAL",
                items: [
                    // Building / raw materials
                    "Building Materials",
                    "Construction",
                    "Logs, Poles, Beams, Lumber",

                    // Metals
                    "Metal: sheets, coils, rolls",
                    "Steel",
                    "Copper",
                    "Aluminum",

                    // Machinery
                    "Machinery, Large Objects",
                    "Machinery (NO VEHICLES/AUTOS)",
                    "Oilfield Equipment",

                    // Chemicals / liquids / gases
                    "Chemicals",
                    "Household Use Chemicals",
                    "Glue",
                    "Liquids, Gases",

                    // Bulk
                    "Commodities Dry Bulk",
                    "Coal, Coke",

                    // Containers / misc
                    "Intermodal Containers",
                    "Water Well",
                    "Garbage/Refuse"
                ]
            },
            {
                key: "other",
                label: "OTHER",
                items: [
                    "Driveway, Towaway",
                    "Paint",
                    "Batteries",
                    "Air Bags",
                    "Other"
                ]
            }
        ],
        hazmat: { label: "HAZARDOUS MATERIALS", items: ["Explosives", "Gases", "Flammable Liquids", "Radioactive", "Corrosives"] },
        values: { selected: ["General Freight", "Household Goods", "Building Materials", "Fresh Produce", "Refrigerated Food", "Beverages"] }
    },
    addComplianceNumberModal: {
        id: "addComplianceNumber",
        title: "Add New Compliance Number",
        footer: { cancelLabel: "Cancel", saveLabel: "Save Number" }
    },
    keyNumberCatalog: {
        categories: [
            { key: "regulatorySafety", label: "REGULATORY AND SAFETY NUMBER", types: ["DOT Number", "MC Number", "Safety Status", "CVOR"] },
            { key: "taxBusiness", label: "TAX AND BUSINESS IDENTIFICATION NUMBERS", types: ["EIN Number", "Tax ID", "IFTA", "UCR Number"] },
            { key: "carrierIndustry", label: "CARRIER & INDUSTRY CODES", types: ["SCAC Code", "Carrier Code Number"] },
            { key: "bondRegistration", label: "BOND AND REGISTRATION NUMBERS", types: ["Fleet Bond Number", "Surety Bond Number"] },
            { key: "other", label: "OTHER", types: ["Company Registration #", "Incorporation #"] }
        ]
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cargo Family Mapping
//
// The Edit Cargo Carried modal surfaces friendly commodity names (General
// Freight, Paint, Beer, Copper, etc.) grouped into 4 UI categories. Each
// friendly label resolves to a canonical cargo-family tag for backend
// storage / API submission via this lookup. The 6 FMCSA-style families are
// Dry Van, Reefer, Flatbed, Tank, Hopper, Other.
// ─────────────────────────────────────────────────────────────────────────────

export interface CargoFamilyMapEntry {
    family: "Dry Van Cargo Family" | "Reefer Cargo Family" | "Flatbed Cargo Family"
          | "Tank Cargo Family"   | "Hopper Cargo Family" | "Other Cargo Family";
    value:  string;
}

export const CARGO_FAMILY_MAPPING: Record<string, CargoFamilyMapEntry> = {
    // ─── GENERAL FREIGHT & HOUSEHOLD ─────────────────────────────────────────
    "General Freight":          { family: "Dry Van Cargo Family", value: "Dry Van - General Freight"  },
    "Household Goods":          { family: "Dry Van Cargo Family", value: "Dry Van - Household Goods"  },
    "Furniture":                { family: "Dry Van Cargo Family", value: "Dry Van - Household Goods"  },
    "Paper Products":           { family: "Dry Van Cargo Family", value: "Dry Van - Paper Products"   },
    "Utility":                  { family: "Other Cargo Family",   value: "Other - Utility"            },
    "U.S. Mail":                { family: "Dry Van Cargo Family", value: "Dry Van - U.S. Mail"        },
    "Mobile Homes":             { family: "Other Cargo Family",   value: "Other - Mobile Homes"       },
    "Motor Vehicles":           { family: "Other Cargo Family",   value: "Other - Motor Vehicles"     },
    "Passengers":               { family: "Other Cargo Family",   value: "Other - Passengers"         },
    "Electronics":              { family: "Dry Van Cargo Family", value: "Dry Van - General Freight"  },
    "Pharmaceutical Products":  { family: "Dry Van Cargo Family", value: "Dry Van - General Freight"  },
    "Garments":                 { family: "Dry Van Cargo Family", value: "Dry Van - Household Goods"  },
    "Office Supplies":          { family: "Dry Van Cargo Family", value: "Dry Van - General Freight"  },
    "Grocery Items":            { family: "Dry Van Cargo Family", value: "Dry Van - General Freight"  },
    "Plastic Products":         { family: "Dry Van Cargo Family", value: "Dry Van - General Freight"  },
    "Auto Parts":               { family: "Dry Van Cargo Family", value: "Dry Van - General Freight"  },
    "Appliances":               { family: "Dry Van Cargo Family", value: "Dry Van - Household Goods"  },

    // ─── FOOD & TEMPERATURE CONTROLLED ───────────────────────────────────────
    "Fresh Produce":            { family: "Reefer Cargo Family",  value: "Reefer - Fresh Produce"     },
    "Meat":                     { family: "Reefer Cargo Family",  value: "Reefer - Meat"              },
    "Refrigerated Food":        { family: "Reefer Cargo Family",  value: "Reefer - Refrigerated Food" },
    "Beverages":                { family: "Dry Van Cargo Family", value: "Dry Van - Beverages"        },
    "Livestock":                { family: "Other Cargo Family",   value: "Other - Livestock"          },
    "Grain, Feed, Hay":         { family: "Hopper Cargo Family",  value: "Hopper - Grain, Feed, Hay"  },
    "Farm Supplies":            { family: "Other Cargo Family",   value: "Other - Farm Supplies"      },
    "Beer":                     { family: "Dry Van Cargo Family", value: "Dry Van - Beverages"        },
    "Liquor":                   { family: "Dry Van Cargo Family", value: "Dry Van - Beverages"        },
    "Sea Food":                 { family: "Reefer Cargo Family",  value: "Reefer - Refrigerated Food" },
    "Packaged Meat":            { family: "Reefer Cargo Family",  value: "Reefer - Meat"              },
    "Frozen Food/Cooled Produce":{ family: "Reefer Cargo Family", value: "Reefer - Refrigerated Food" },
    "Milk Products":            { family: "Reefer Cargo Family",  value: "Reefer - Refrigerated Food" },
    "Bakery Products":          { family: "Dry Van Cargo Family", value: "Dry Van - General Freight"  },

    // ─── CONSTRUCTION & INDUSTRIAL ───────────────────────────────────────────
    "Building Materials":           { family: "Flatbed Cargo Family", value: "Flatbed - Building Materials"        },
    "Metal: sheets, coils, rolls":  { family: "Flatbed Cargo Family", value: "Flatbed - Metal (Sheet, Coils, Rolls)" },
    "Logs, Poles, Beams, Lumber":   { family: "Flatbed Cargo Family", value: "Flatbed - Logs, Poles, Beams, Lumber" },
    "Machinery, Large Objects":     { family: "Flatbed Cargo Family", value: "Flatbed - Machinery, Large Objects"   },
    "Machinery (NO VEHICLES/AUTOS)":{ family: "Flatbed Cargo Family", value: "Flatbed - Machinery, Large Objects"   },
    "Oilfield Equipment":           { family: "Flatbed Cargo Family", value: "Flatbed - Oilfield Equipment"         },
    "Chemicals":                    { family: "Tank Cargo Family",    value: "Tank - Chemicals"                     },
    "Household Use Chemicals":      { family: "Tank Cargo Family",    value: "Tank - Chemicals"                     },
    "Commodities Dry Bulk":         { family: "Tank Cargo Family",    value: "Tank - Commodities Dry Bulk"          },
    "Liquids, Gases":               { family: "Tank Cargo Family",    value: "Tank - Liquids, Gases"                },
    "Coal, Coke":                   { family: "Hopper Cargo Family",  value: "Hopper - Coal, Coke"                  },
    "Intermodal Containers":        { family: "Other Cargo Family",   value: "Other - Intermodal Containers"        },
    "Water Well":                   { family: "Other Cargo Family",   value: "Other - Water Well"                   },
    "Construction":                 { family: "Other Cargo Family",   value: "Other - Construction"                 },
    "Garbage/Refuse":               { family: "Other Cargo Family",   value: "Other - Garbage, Refuse, Trash"       },
    "Copper":                       { family: "Flatbed Cargo Family", value: "Flatbed - Metal (Sheet, Coils, Rolls)" },
    "Aluminum":                     { family: "Flatbed Cargo Family", value: "Flatbed - Metal (Sheet, Coils, Rolls)" },
    "Steel":                        { family: "Flatbed Cargo Family", value: "Flatbed - Metal (Sheet, Coils, Rolls)" },
    "Glue":                         { family: "Tank Cargo Family",    value: "Tank - Chemicals"                     },

    // ─── OTHER ───────────────────────────────────────────────────────────────
    "Driveway, Towaway":            { family: "Other Cargo Family",   value: "Other - Driveway, Towaway"            },
    "Paint":                        { family: "Other Cargo Family",   value: "Other - Other"                        },
    "Batteries":                    { family: "Other Cargo Family",   value: "Other - Other"                        },
    "Air Bags":                     { family: "Other Cargo Family",   value: "Other - Other"                        },
    "Other":                        { family: "Other Cargo Family",   value: "Other - Other"                        }
};

/**
 * Resolve a list of friendly commodity labels to their canonical
 * { family, value } pairs — the shape the backend / API expects.
 * Unknown labels fall back to `Other Cargo Family / Other - Other`.
 */
export function resolveCargoFamilies(selected: string[]): CargoFamilyMapEntry[] {
    return selected.map(label =>
        CARGO_FAMILY_MAPPING[label] ?? { family: "Other Cargo Family", value: "Other - Other" }
    );
}

export const INITIAL_VIEW_DATA = {
    app: {
        brand: { name: "Tracksmart fleet solution", logoLetter: "T" },
        user: { initials: "JD" },
        search: { placeholder: "Search carriers, DOT..." }
    },
    page: {
        breadcrumb: ["Account", "Carrier Profile"],
        carrierHeader: {
            name: "Acme Trucking Inc.",
            statusBadge: { text: "Active", tone: "success" },
            meta: [
                { label: "DOT:", badge: { text: "Active", tone: "success" } },
                { label: "CVOR/RIN/NSC:", badge: { text: "Valid", tone: "success" } },
                { label: "Location:", text: "Wilmington, DE" }
            ],
            actions: [{ key: "exportPdf", label: "Export PDF", icon: "FileDown" }]
        },
        cards: {
            keyNumbers: {
                title: "Key Numbers",
                icon: "FileKey",
                groups: [
                    {
                        key: "regulatorySafety", label: "REGULATORY AND SAFETY NUMBER", collapsed: false, canAdd: true, items: [
                            { type: "DOT Number", value: "1234567", status: { text: "Active", tone: "success" }, expiryDate: null },
                            { type: "Safety Status", value: "Satisfactory", status: { text: "Verified", tone: "success" }, expiryDate: "2024-12-01" }
                        ]
                    },
                    {
                        key: "taxBusiness", label: "TAX AND BUSINESS IDENTIFICATION NUMBERS", collapsed: false, canAdd: true, items: [
                            { type: "IFTA", value: "IFTA-DE-990", status: { text: "Active", tone: "success" }, expiryDate: "2024-12-31" }
                        ]
                    },
                    { key: "carrierIndustry", label: "CARRIER & INDUSTRY CODES", collapsed: true, canAdd: true, items: [] },
                    { key: "bondRegistration", label: "BOND AND REGISTRATION NUMBERS", collapsed: true, canAdd: true, items: [] },
                    { key: "other", label: "OTHER", collapsed: false, canAdd: true, items: [{ type: "DTOPS Number", value: "DT-556677", status: { text: "Active", tone: "success" }, expiryDate: null }] }
                ]
            },
            directorsOfficers: {
                title: "Directors & Officers",
                icon: "Users",
                addButton: { label: "Add Director" },
                rows: [
                    { name: "Johnathan Doe", title: "President / CEO", ownershipPct: 65, actionLabel: "View More" },
                    { name: "Sarah Smith", title: "VP of Operations", ownershipPct: 35, actionLabel: "View More" }
                ]
            }
        }
    }
};

// --- COMPLIANCE NUMBERS DATA STRUCTURE ---
export const COMPLIANCE_NUMBERS = {
    groups: [
        {
            key: "regulatory",
            label: "REGULATORY AND SAFETY NUMBERS",
            items: [
                { type: "USDOT Number", value: "3920192", status: "Active", expiry: "-", docStatus: "Uploaded" },
                { type: "MC Number", value: "Not entered", status: "Missing", expiry: "-", docStatus: "N/A" },
                { type: "USDOT Legal Name", value: "Acme Trucking Inc.", status: "Active", expiry: "-", docStatus: "Uploaded" },
                { type: "Safety Fitness Rating", value: "Satisfactory", status: "Active", expiry: "2024-12-01", docStatus: "Uploaded" },
                { type: "CVOR Level", value: "Not entered", status: "Missing", expiry: "Not set", docStatus: "N/A" },
            ]
        },
        {
            key: "tax",
            label: "TAX AND BUSINESS IDENTIFICATION NUMBERS",
            items: [
                { type: "EIN", value: "88-1234567", status: "Incomplete", expiry: "-", docStatus: "Missing" },
                { type: "DUNS Number", value: "Not entered", status: "Missing", expiry: "-", docStatus: "N/A" },
                { type: "IFTA License", value: "IFTA-9902", status: "Expiring Soon", expiry: "2024-02-28", docStatus: "Uploaded" },
                { type: "State Tax ID", value: "Not entered", status: "Missing", expiry: "-", docStatus: "N/A" },
            ]
        },
        {
            key: "carrier",
            label: "CARRIER & INDUSTRY CODES",
            items: [
                { type: "SCAC Code", value: "ACME", status: "Active", expiry: "2026-06-30", docStatus: "Uploaded" },
                { type: "Carrier Code", value: "Not entered", status: "Missing", expiry: "-", docStatus: "N/A" },
            ]
        },
        {
            key: "bond",
            label: "BOND AND REGISTRATION NUMBERS",
            items: [
                { type: "Surety Bond", value: "SB-998877", status: "Expired", expiry: "2023-12-31", docStatus: "Uploaded" },
                { type: "Cargo Insurance", value: "POL-555", status: "Incomplete", expiry: "-", docStatus: "Missing" },
            ]
        },
        {
            key: "other",
            label: "OTHER",
            items: [
                { type: "Company Registration", value: "Not entered", status: "Missing", expiry: "-", docStatus: "N/A" },
            ]
        }
    ]
};

// --- OFFICE LOCATIONS DATA ---
export const OFFICE_LOCATIONS = [
    {
        id: "LOC-2001",
        label: "Corporate HQ - Wilmington",
        address: "1200 North Dupont Hwy, Wilmington, DE 19801",
        contact: "Head Office",
        phone: "+1 (555) 123-4567",
        operatingHours: [
            { day: "Mon - Fri", hours: "08:00 - 18:00" },
            { day: "Sat", hours: "10:00 - 14:00" },
            { day: "Sun", hours: "Closed" }
        ]
    },
    {
        id: "LOC-2002",
        label: "Denver Regional Office",
        address: "101 Broadway, Denver, CO 80203",
        contact: "Regional Manager",
        phone: "+1 (303) 555-0199",
        operatingHours: [
            { day: "Mon - Fri", hours: "09:00 - 17:00" },
            { day: "Sat", hours: "Closed" },
            { day: "Sun", hours: "Closed" }
        ]
    }
];

// --- DRIVER TYPES ---
export const DRIVER_TYPES = [
    { id: 1, code: 'LONG_HAUL_DRIVER', name: 'Long Haul Driver', description: 'Driver operating long distance routes across states or regions', active: true },
    { id: 2, code: 'LOCAL_DRIVER', name: 'Local Driver', description: 'Driver operating within a local or regional area', active: true },
    { id: 3, code: 'OWNER_OPERATOR', name: 'Owner Operator', description: 'Independent driver who owns and operates their own truck', active: true },
    { id: 4, code: 'OWNER_OPERATOR_DRIVER', name: 'Owner Operator Driver', description: 'Driver working under an owner operator', active: true },
    { id: 5, code: 'DRIVER_SERVICE_LEASE', name: 'Driver Service/Lease', description: 'Driver provided through a leasing or driver service agreement', active: true },
    { id: 6, code: 'OTHER_COMPANY_EMPLOYEE', name: 'Other Company Employee', description: 'Employee from another company operating vehicle', active: true },
    { id: 7, code: 'UNAUTHORIZED_DRIVER', name: 'Unauthorized Driver', description: 'Driver not authorized under company policy', active: true },
    { id: 8, code: 'OTHER', name: 'Other', description: 'Any driver type not categorized above', active: true }
];

// Re-export Driver Data from Central Source
export { MOCK_DRIVERS, MOCK_DRIVER_DETAILED_TEMPLATE } from '@/data/mock-app-data';
export type { Driver } from '@/data/mock-app-data';
