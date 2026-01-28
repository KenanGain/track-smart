import type { MasterNumberType } from "@/types/key-numbers.types";

export const MASTER_NUMBER_TYPES: MasterNumberType[] = [
    // Regulatory and Safety Numbers
    {
        id: "dot-number",
        name: "DOT Number",
        description: "Department of Transportation identification number",
        defaultCategory: "Regulatory and Safety Numbers",
    },
    {
        id: "mc-number",
        name: "MC Number",
        description: "Motor Carrier operating authority number",
        defaultCategory: "Regulatory and Safety Numbers",
    },
    {
        id: "scac-code",
        name: "SCAC Code",
        description: "Standard Carrier Alpha Code for freight identification",
        defaultCategory: "Regulatory and Safety Numbers",
    },
    {
        id: "ca-number",
        name: "CA Number",
        description: "Contract Authority number for contract carriers",
        defaultCategory: "Regulatory and Safety Numbers",
    },
    {
        id: "ff-number",
        name: "FF Number",
        description: "Freight Forwarder registration number",
        defaultCategory: "Regulatory and Safety Numbers",
    },

    // Tax and Business Identification Numbers
    {
        id: "ein",
        name: "EIN",
        description: "Employer Identification Number for tax purposes",
        defaultCategory: "Tax and Business Identification Numbers",
    },
    {
        id: "duns-number",
        name: "DUNS Number",
        description: "Data Universal Numbering System business identifier",
        defaultCategory: "Tax and Business Identification Numbers",
    },
    {
        id: "state-tax-id",
        name: "State Tax ID",
        description: "State-level tax identification number",
        defaultCategory: "Tax and Business Identification Numbers",
    },

    // Carrier & Industry Codes
    {
        id: "pin-number",
        name: "PIN Number",
        description: "Personal Identification Number for FMCSA portal access",
        defaultCategory: "Carrier & Industry Codes",
    },
    {
        id: "nmfta-code",
        name: "NMFTA Code",
        description: "National Motor Freight Traffic Association member code",
        defaultCategory: "Carrier & Industry Codes",
    },
    {
        id: "icc-number",
        name: "ICC Number",
        description: "Interstate Commerce Commission legacy number",
        defaultCategory: "Carrier & Industry Codes",
    },

    // Bond and Registration Numbers
    {
        id: "ucr-number",
        name: "UCR Number",
        description: "Unified Carrier Registration identification",
        defaultCategory: "Bond and Registration Numbers",
    },
    {
        id: "bond-number",
        name: "Bond Number",
        description: "Surety bond policy number for operating authority",
        defaultCategory: "Bond and Registration Numbers",
    },
    {
        id: "irp-account",
        name: "IRP Account Number",
        description: "International Registration Plan apportioned license account",
        defaultCategory: "Bond and Registration Numbers",
    },
    {
        id: "ifta-account",
        name: "IFTA Account Number",
        description: "International Fuel Tax Agreement license number",
        defaultCategory: "Bond and Registration Numbers",
    },

    // Other
    {
        id: "carb-number",
        name: "CARB Number",
        description: "California Air Resources Board compliance identifier",
        defaultCategory: "Other",
    },
    {
        id: "hazmat-permit",
        name: "Hazmat Permit Number",
        description: "Hazardous materials transportation permit",
        defaultCategory: "Other",
    },
    {
        id: "twic-number",
        name: "TWIC Number",
        description: "Transportation Worker Identification Credential",
        defaultCategory: "Other",
    },
];
