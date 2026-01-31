
// Vendor type definition
export interface Vendor {
    id: string;
    companyName: string;
    address: {
        country: string;
        unit: string;
        street: string;
        city: string;
        stateProvince: string;
        postalCode: string;
    };
    email: string;
    phone: string;
    contacts: {
        id: string;
        firstName: string;
        lastName: string;
    }[];
}

// Initial mock vendors
export const INITIAL_VENDORS: Vendor[] = [
    {
        id: "v1",
        companyName: "Fleet Maintenance Pro",
        address: {
            country: "USA",
            unit: "Suite 100",
            street: "123 Industrial Blvd",
            city: "Houston",
            stateProvince: "Texas",
            postalCode: "77001"
        },
        email: "service@fleetmaintpro.com",
        phone: "(713) 555-0101",
        contacts: [
            { id: "c1", firstName: "John", lastName: "Smith" },
            { id: "c2", firstName: "Sarah", lastName: "Johnson" }
        ]
    },
    {
        id: "v2",
        companyName: "TruckCare Solutions",
        address: {
            country: "USA",
            unit: "",
            street: "456 Service Road",
            city: "Dallas",
            stateProvince: "Texas",
            postalCode: "75201"
        },
        email: "info@truckcare.com",
        phone: "(214) 555-0202",
        contacts: [
            { id: "c3", firstName: "Mike", lastName: "Williams" }
        ]
    }
];
