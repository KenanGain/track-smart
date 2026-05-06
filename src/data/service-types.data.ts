// Single source of truth for service types is `maintenance.data.ts` so the
// Create Schedule form (which imports from this file) and the Create Task
// Order modal (which imports from `maintenance.data.ts` directly) render
// the same 87 entries grouped into the same 7 categories — Engine, Brakes,
// Tires & Wheels, Suspension & Steering, Body & Coupling, Lamps & Electrical,
// Inspections.

export { INITIAL_SERVICE_TYPES } from "@/pages/assets/maintenance.data";
