// Per-carrier Fleet Data — Barrel re-export.
//
// The refined driver and asset databases live in dedicated files:
//   - carrier-drivers.data.ts  → CARRIER_DRIVERS, getDriversForAccount, getDriverById
//   - carrier-assets.data.ts   → CARRIER_ASSETS,  getAssetsForAccount,  getAssetById
//
// This module re-exports them and adds a combined fleet-count helper that
// includes both the vehicle breakdown (from assets) and the driver count.

import { getDriversForAccount } from './carrier-drivers.data';
import { getFleetCountsForAccount as getVehicleCountsForAccount } from './carrier-assets.data';

export { CARRIER_DRIVERS, getDriversForAccount, getDriverById } from './carrier-drivers.data';
export {
    CARRIER_ASSETS,
    getAssetsForAccount,
    getAssetById,
    type CarrierAsset,
} from './carrier-assets.data';

// Combined fleet counts — vehicle breakdown + driver count for the same carrier.
export function getFleetCountsForAccount(accountId: string) {
    return {
        ...getVehicleCountsForAccount(accountId),
        drivers: getDriversForAccount(accountId).length,
    };
}
