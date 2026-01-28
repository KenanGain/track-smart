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
            { key: "role", label: "Role Title", type: "text", required: true },
            { key: "email", label: "Email Address", type: "email", required: true },
            { key: "phone", label: "Phone Number", type: "tel", required: true },
            { key: "stockClass", label: "Stock Class", type: "text", required: true },
            { key: "ownershipPct", label: "Ownership %", type: "number", required: true },
            { key: "office", label: "Office Location", type: "text", required: true },
            { key: "dateAppointed", label: "Date of Appointment", type: "date", required: true },
            { key: "dateResigned", label: "Date of Resignation", type: "date", required: false },
            { key: "responsibility", label: "Primary Responsibility", type: "select", options: ["Operations", "Finance", "Legal", "Compliance"], required: true }
        ],
        layout: [
            ["name", "role"],
            ["email", "phone"],
            ["stockClass", "ownershipPct"],
            ["office"],
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
                { key: "legalName", label: "Legal Name", type: "text", required: true, placeholder: "Acme Trucking Inc." },
                { key: "dbaName", label: "DBA Name", type: "text", required: false, placeholder: "Acme Logistics" },
                { key: "businessType", label: "Business Type", type: "select", required: true, options: ["Corporation", "LLC", "Sole Proprietor", "Partnership"] },
                { key: "stateOfInc", label: "State of Inc.", type: "select", required: true, options: ["Delaware", "California", "Texas", "Florida", "New York"] }
            ],
            layout: [["legalName"], ["dbaName"], ["businessType", "stateOfInc"]],
            values: { legalName: "Acme Trucking Inc.", dbaName: "Acme Logistics", businessType: "Corporation", stateOfInc: "Delaware" }
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
        }
    },
    cargoEditor: {
        searchPlaceholder: "Search cargo type...",
        selectedLabel: "Selected",
        selectCommonLabel: "Select Common Types",
        clearAllLabel: "Clear All",
        commonTypes: ["General Freight", "Building Materials", "Fresh Produce", "Refrigerated Food", "Beverages", "Paper Products"],
        sections: [
            { key: "generalFreight", label: "GENERAL FREIGHT & HOUSEHOLD", items: ["General Freight", "Household Goods", "Furniture", "Paper Products", "Utility"] },
            { key: "foodTemp", label: "FOOD & TEMPERATURE CONTROLLED", items: ["Fresh Produce", "Meat", "Refrigerated Food", "Beverages"] },
            { key: "constructionIndustrial", label: "CONSTRUCTION & INDUSTRIAL", items: ["Building Materials", "Metal: sheets, coils, rolls", "Logs, Poles, Beams, Lumber", "Garbage/Refuse", "Construction"] }
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
