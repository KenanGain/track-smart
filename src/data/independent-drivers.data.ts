// ─────────────────────────────────────────────────────────────────────────────
// Drivers who belong to no carrier.
//
// Every driver login in this prototype is generated from a carrier's roster, so every
// driver seat is somebody's employee. That is not the only way a driver exists: one between
// jobs, one who has applied but not been hired, and an owner-operator who has not signed
// with anybody yet all hold the same licence and the same documents, and all of them need
// to be able to sign in and look at their own file.
//
// They are kept here rather than under a carrier key in CARRIER_DRIVERS, because a roster
// is a list of the people a carrier employs and putting an unaffiliated driver in one would
// make them that carrier's driver — which is the exact thing they are not.
// ─────────────────────────────────────────────────────────────────────────────

import type { Driver } from "@/data/mock-app-data";

export const INDEPENDENT_DRIVERS: Driver[] = [
    {
        id: "DRV-IND-001",
        name: "Noah Whitfield",
        firstName: "Noah",
        lastName: "Whitfield",
        status: "Active",
        avatarInitials: "NW",
        phone: "(206) 555-0142",
        email: "noah.whitfield@driver.example.com",
        // No hire date, because nobody has hired him. The DQ file and the annual review
        // both count from that date, so inventing one would date a file that has not started.
        hiredDate: "",
        dateAdded: "2026-09-18",
        terminal: "—",
        carrierCode: "",
        driverType: "Owner-Operator",
        dob: "1988-07-22",
        gender: "Male",
        ssn: "000-00-0142",
        citizenship: "USA",
        authorizedToWork: true,
        address: "88 Harbor View Rd",
        unit: "",
        city: "Tacoma",
        state: "WA",
        zip: "98402",
        country: "USA",
        licenseNumber: "WHI88142207",
        licenseState: "WA",
        licenseExpiry: "2029-03-14",
        emergencyContacts: [
            { name: "Dana Whitfield", relation: "Sister", phone: "(206) 555-0177", email: "dana.whitfield@example.com" },
        ],
        previousResidences: [],
        licenses: [
            {
                id: 1, type: "CDL", licenseNumber: "WHI88142207", province: "WA", country: "USA",
                class: "Class A", issueDate: "2024-03-14", expiryDate: "2029-03-14", status: "Valid",
                conditions: "", endorsements: ["T - Double/Triple Trailers"], restrictions: [],
                isPrimary: true, suspended: false, uploadType: "images",
            },
        ],
        travelDocuments: [
            { id: "TD-IND-001", type: "Passport", number: "P884412207", country: "USA", expiryDate: "2031-08-02", uploadType: "images" },
        ],
        employmentHistory: [],
    } as Driver,
];

/** The driver behind an unaffiliated login, if there is one. */
export const findIndependentDriver = (id: string | undefined): Driver | undefined =>
    id ? INDEPENDENT_DRIVERS.find((d) => d.id === id) : undefined;
