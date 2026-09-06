import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity, Search, Download, Filter, Columns, ChevronDown, ChevronUp, ChevronsUpDown, X,
  ShieldAlert, AlertOctagon, CircleAlert, Camera, Gauge, Truck, MapPin,
  Eye, Trash2, MoreVertical, Flag, CheckCircle2, GraduationCap, FileWarning, Ban, RotateCcw,
  ClipboardCheck, History, Share2, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/pages/ats/ats-ui';
import { KpiStatCard } from '@/components/ui/KpiStatCard';
import { ShareToChat, type ShareItem } from '@/components/share/ShareToChat';
import { setMessagesFocus, consumePendingRecord, sendWidgetToDriver, type RecordRef, type ChatWidget } from '@/pages/messages/messages-store';
import { loadTelematicsEventTypes } from '@/pages/safety-events/safety-event-types.data';
import {
  HOS_STATUS_META, HOS_DISPOSITIONS, HOS_DISPOSITION_BY_ID, HOS_TRAINING_TYPES,
  type HosVStatus, type HosDisposition,
} from '@/pages/hos/hos-violations.data';
import { ActivityTimeline } from '@/components/ui/ActivityTimeline';
import { ReviewResolutionTab, toActivityEntries } from '@/components/ui/ReviewResolution';
import { issueWarningLetter } from '@/pages/compliance/warning-letters';
import { ACTIVITY_BADGE_TONE } from '@/components/ui/activity-kinds';

// ===== RAW DATA =====
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SAFETY_EVENTS_RESULTS: any[] = [
  {
    "id": "sft_evt_01D8ZQFGHVJ858NBF2Q7DV9MNC",
    "sourceId": "123456789",
    "provider": "geotab",
    "type": "harsh_brake",
    "vehicle": "vcl_01D8ZQFGHVJ858NBF2Q7DV9MNC",
    "vehiclePlate": "P-7762",
    "startedAt": "2025-01-06T03:24:53.000Z",
    "metadata": { "addedAt": "2025-01-07T05:31:56Z", "modifiedAt": "2025-01-07T05:31:56Z" },
    "sourceType": "HARD_CORE_BRAKING_MESSAGE",
    "driver": "drv_01D8ZQFGHVJ858NBF2Q7DV9MNC",
    "driverName": "John Smith",
    "startLocation": { "longitude": -122.4194155, "latitude": 37.7749295 },
    "endedAt": "2025-01-06T03:24:53.000Z",
    "endLocation": { "longitude": -122.4194155, "latitude": 37.7749295 },
    "stats": { "maximumSpeed": 95.33, "averageSpeed": 95.33, "roadSpeedLimit": 95.33, "gForceForwardBackward": 1, "gForceSideToSide": 1, "heading": 25 },
    "cameraMedia": { "frontFacing": { "available": true, "sourceId": "12345" }, "rearFacing": { "available": true, "sourceId": "12345" } },
    "extensions": { "here": { "speedLimit": 95.33, "speedLimitSource": "posted", "truckSpeedLimit": 95.33, "roadName": "John St", "linkAttributes": { "countryCode": "US", "isUrban": "true", "isPaved": "true" }, "weather": { "temperature": 68, "humidity": 45, "visibility": 1000 } } },
    "severity": "high",
    "raw": []
  },
  {
    "id": "sft_evt_99X1ZQFGHVJ858NBF2Q7DV9ABC",
    "sourceId": "987654321",
    "provider": "samsara",
    "type": "over_speed",
    "vehicle": "vcl_99X1ZQFGHVJ858NBF2Q7DV9ABC",
    "vehiclePlate": "BIG-RIG7",
    "startedAt": "2025-05-14T14:12:10.000Z",
    "metadata": { "addedAt": "2025-05-15T05:35:00Z", "modifiedAt": "2025-05-15T05:35:00Z" },
    "sourceType": "SPEEDING_ALERT",
    "driver": "drv_44B2ZQFGHVJ858NBF2Q7DV9XYZ",
    "driverName": "Robert Chen",
    "startLocation": { "longitude": -74.0060, "latitude": 40.7128 },
    "endedAt": "2025-05-14T14:15:30.000Z",
    "endLocation": { "longitude": -74.0150, "latitude": 40.7200 },
    "stats": { "maximumSpeed": 112.5, "averageSpeed": 105.0, "roadSpeedLimit": 80.0, "gForceForwardBackward": 0.2, "gForceSideToSide": 0.1, "heading": 180 },
    "cameraMedia": { "frontFacing": { "available": true, "sourceId": "cam_888" }, "rearFacing": { "available": false, "sourceId": null } },
    "extensions": { "here": { "speedLimit": 80.0, "speedLimitSource": "posted", "truckSpeedLimit": 80.0, "roadName": "I-95 North", "linkAttributes": { "countryCode": "US", "isUrban": "false", "isDivided": "true" }, "weather": { "temperature": 75, "precipitationType": "rain", "visibility": 500 } } },
    "severity": "critical",
    "raw": []
  },
  {
    "id": "sft_evt_33P8ZQFGHVJ858NBF2Q7DV9QWE",
    "sourceId": "555666777",
    "provider": "motive",
    "type": "harsh_cornering",
    "vehicle": "vcl_11A2ZQFGHVJ858NBF2Q7DV9123",
    "vehiclePlate": "TANK-01",
    "startedAt": "2025-08-21T09:45:00.000Z",
    "metadata": { "addedAt": "2025-08-22T06:00:00Z", "modifiedAt": "2025-08-22T06:00:00Z" },
    "sourceType": "LATERAL_G_FORCE",
    "driver": "drv_77D4ZQFGHVJ858NBF2Q7DV9789",
    "driverName": "James Sullivan",
    "startLocation": { "longitude": -118.2437, "latitude": 34.0522 },
    "endedAt": "2025-08-21T09:45:05.000Z",
    "endLocation": { "longitude": -118.2440, "latitude": 34.0530 },
    "stats": { "maximumSpeed": 65.0, "averageSpeed": 60.0, "roadSpeedLimit": 50.0, "gForceForwardBackward": 0.1, "gForceSideToSide": 1.4, "heading": 90 },
    "cameraMedia": { "frontFacing": { "available": false, "sourceId": null }, "rearFacing": { "available": false, "sourceId": null } },
    "extensions": { "here": { "speedLimit": 50.0, "speedLimitSource": "inferred", "truckSpeedLimit": 50.0, "roadName": "Sunset Blvd", "linkAttributes": { "countryCode": "US", "isUrban": "true", "intersectionCategory": "roundabout" }, "weather": { "temperature": 85, "humidity": 20, "visibility": 2000 } } },
    "severity": "medium",
    "raw": []
  },
  {
    "id": "sft_evt_55L9ZQFGHVJ858NBF2Q7DV9LKJ",
    "sourceId": "111222333",
    "provider": "lytx",
    "type": "collision_warning",
    "vehicle": "vcl_88K2ZQFGHVJ858NBF2Q7DV9POU",
    "vehiclePlate": "FLT-209",
    "startedAt": "2025-11-01T18:30:15.000Z",
    "metadata": { "addedAt": "2025-11-02T08:15:22Z", "modifiedAt": "2025-11-02T08:15:22Z" },
    "sourceType": "ADAS_FCW",
    "driver": "drv_22M1ZQFGHVJ858NBF2Q7DV9BNM",
    "driverName": "Mike Pearson",
    "startLocation": { "longitude": -87.6298, "latitude": 41.8781 },
    "endedAt": "2025-11-01T18:30:17.000Z",
    "endLocation": { "longitude": -87.6290, "latitude": 41.8785 },
    "stats": { "maximumSpeed": 88.2, "averageSpeed": 85.0, "roadSpeedLimit": 90.0, "gForceForwardBackward": 0.8, "gForceSideToSide": 0.0, "heading": 45 },
    "cameraMedia": { "frontFacing": { "available": true, "sourceId": "lytx_cam_01" }, "rearFacing": { "available": true, "sourceId": "lytx_cam_02" } },
    "extensions": { "here": { "speedLimit": 90.0, "speedLimitSource": "posted", "truckSpeedLimit": 85.0, "roadName": "Lake Shore Dr", "linkAttributes": { "countryCode": "US", "isUrban": "true", "isDivided": "true" }, "weather": { "temperature": 40, "windSpeed": 25, "precipitationType": "snow" } } },
    "severity": "critical",
    "raw": []
  },
  // ── Additional events covering all telematics tag types ──
  { "id": "sft_evt_HARSH_ACCEL_01", "sourceId": "111000001", "provider": "geotab", "type": "harsh_acceleration", "vehicle": "vcl_TR1049", "vehiclePlate": "TX-1049", "startedAt": "2025-02-12T08:30:00.000Z", "metadata": { "addedAt": "2025-02-13T06:00:00Z", "modifiedAt": "2025-02-13T06:00:00Z" }, "sourceType": "ACCELERATION_EVENT", "driver": "drv_DRV2001", "driverName": "John Smith", "startLocation": { "longitude": -97.7431, "latitude": 30.2672 }, "endedAt": "2025-02-12T08:30:03.000Z", "endLocation": { "longitude": -97.7435, "latitude": 30.2680 }, "stats": { "maximumSpeed": 90.0, "averageSpeed": 80.0, "roadSpeedLimit": 120.0, "gForceForwardBackward": 0.9, "gForceSideToSide": 0.1, "heading": 90 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "geo_accel_01" }, "rearFacing": { "available": false, "sourceId": null } }, "extensions": { "here": { "speedLimit": 120.0, "speedLimitSource": "posted", "truckSpeedLimit": 110.0, "roadName": "I-35 North", "linkAttributes": { "countryCode": "US", "isUrban": "false", "isDivided": "true" }, "weather": { "temperature": 72, "humidity": 35, "visibility": 2000 } } }, "severity": "medium", "raw": [] },
  { "id": "sft_evt_HARSH_TURN_01", "sourceId": "111000002", "provider": "motive", "type": "harsh_turn", "vehicle": "vcl_TR2088", "vehiclePlate": "ON-2088", "startedAt": "2025-03-05T14:20:00.000Z", "metadata": { "addedAt": "2025-03-06T07:00:00Z", "modifiedAt": "2025-03-06T07:00:00Z" }, "sourceType": "LATERAL_G_FORCE", "driver": "drv_DRV1002", "driverName": "Maria Rodriguez", "startLocation": { "longitude": -79.3832, "latitude": 43.6532 }, "endedAt": "2025-03-05T14:20:04.000Z", "endLocation": { "longitude": -79.3840, "latitude": 43.6538 }, "stats": { "maximumSpeed": 55.0, "averageSpeed": 50.0, "roadSpeedLimit": 60.0, "gForceForwardBackward": 0.2, "gForceSideToSide": 1.2, "heading": 45 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "mot_turn_01" }, "rearFacing": { "available": true, "sourceId": "mot_turn_02" } }, "extensions": { "here": { "speedLimit": 60.0, "speedLimitSource": "posted", "truckSpeedLimit": 55.0, "roadName": "King St W", "linkAttributes": { "countryCode": "CA", "isUrban": "true", "isPaved": "true" }, "weather": { "temperature": 5, "humidity": 80, "visibility": 800 } } }, "severity": "medium", "raw": [] },
  { "id": "sft_evt_NEAR_CRASH_01", "sourceId": "111000003", "provider": "lytx", "type": "near_crash", "vehicle": "vcl_TR3321", "vehiclePlate": "NV-3321", "startedAt": "2025-04-18T17:45:00.000Z", "metadata": { "addedAt": "2025-04-19T08:00:00Z", "modifiedAt": "2025-04-19T08:00:00Z" }, "sourceType": "FORWARD_COLLISION_WARNING", "driver": "drv_DRV2003", "driverName": "Mike Johnson", "startLocation": { "longitude": -115.1728, "latitude": 36.1147 }, "endedAt": "2025-04-18T17:45:02.000Z", "endLocation": { "longitude": -115.1732, "latitude": 36.1150 }, "stats": { "maximumSpeed": 100.0, "averageSpeed": 95.0, "roadSpeedLimit": 105.0, "gForceForwardBackward": 1.1, "gForceSideToSide": 0.2, "heading": 180 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "lytx_ncr_01" }, "rearFacing": { "available": true, "sourceId": "lytx_ncr_02" } }, "extensions": { "here": { "speedLimit": 105.0, "speedLimitSource": "posted", "truckSpeedLimit": 100.0, "roadName": "US-95 South", "linkAttributes": { "countryCode": "US", "isUrban": "false", "isDivided": "true" }, "weather": { "temperature": 95, "humidity": 10, "visibility": 2000 } } }, "severity": "critical", "raw": [] },
  { "id": "sft_evt_TAILGATE_01", "sourceId": "111000004", "provider": "samsara", "type": "tailgating", "vehicle": "vcl_TR4456", "vehiclePlate": "OH-4456", "startedAt": "2025-05-22T09:10:00.000Z", "metadata": { "addedAt": "2025-05-23T06:30:00Z", "modifiedAt": "2025-05-23T06:30:00Z" }, "sourceType": "FOLLOWING_DISTANCE_ALERT", "driver": "drv_DRV1001", "driverName": "James Sullivan", "startLocation": { "longitude": -83.0458, "latitude": 42.3314 }, "endedAt": "2025-05-22T09:10:08.000Z", "endLocation": { "longitude": -83.0465, "latitude": 42.3320 }, "stats": { "maximumSpeed": 110.0, "averageSpeed": 105.0, "roadSpeedLimit": 120.0, "gForceForwardBackward": 0.3, "gForceSideToSide": 0.1, "heading": 270 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "sam_tail_01" }, "rearFacing": { "available": false, "sourceId": null } }, "extensions": { "here": { "speedLimit": 120.0, "speedLimitSource": "posted", "truckSpeedLimit": 110.0, "roadName": "I-75 North", "linkAttributes": { "countryCode": "US", "isUrban": "false", "isDivided": "true" }, "weather": { "temperature": 68, "humidity": 55, "visibility": 1500 } } }, "severity": "high", "raw": [] },
  { "id": "sft_evt_CELLPHONE_01", "sourceId": "111000005", "provider": "lytx", "type": "cell_phone", "vehicle": "vcl_TR5590", "vehiclePlate": "FL-5590", "startedAt": "2025-06-10T13:35:00.000Z", "metadata": { "addedAt": "2025-06-11T07:00:00Z", "modifiedAt": "2025-06-11T07:00:00Z" }, "sourceType": "CELL_PHONE_USE_DETECTED", "driver": "drv_DRV1004", "driverName": "Sarah Johnson", "startLocation": { "longitude": -80.1918, "latitude": 25.7617 }, "endedAt": "2025-06-10T13:35:12.000Z", "endLocation": { "longitude": -80.1925, "latitude": 25.7625 }, "stats": { "maximumSpeed": 75.0, "averageSpeed": 70.0, "roadSpeedLimit": 90.0, "gForceForwardBackward": 0.1, "gForceSideToSide": 0.0, "heading": 0 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "lytx_cp_01" }, "rearFacing": { "available": true, "sourceId": "lytx_cp_02" } }, "extensions": { "here": { "speedLimit": 90.0, "speedLimitSource": "posted", "truckSpeedLimit": 90.0, "roadName": "Florida Tpke", "linkAttributes": { "countryCode": "US", "isUrban": "false", "isPaved": "true" }, "weather": { "temperature": 85, "humidity": 75, "visibility": 1800 } } }, "severity": "critical", "raw": [] },
  { "id": "sft_evt_DISTRACT_01", "sourceId": "111000006", "provider": "geotab", "type": "distracted", "vehicle": "vcl_TR6623", "vehiclePlate": "TX-6623", "startedAt": "2025-06-25T10:50:00.000Z", "metadata": { "addedAt": "2025-06-26T08:00:00Z", "modifiedAt": "2025-06-26T08:00:00Z" }, "sourceType": "DISTRACTED_DRIVING_ALERT", "driver": "drv_DRV2004", "driverName": "Elena Rodriguez", "startLocation": { "longitude": -96.7970, "latitude": 32.7767 }, "endedAt": "2025-06-25T10:50:07.000Z", "endLocation": { "longitude": -96.7978, "latitude": 32.7775 }, "stats": { "maximumSpeed": 88.0, "averageSpeed": 82.0, "roadSpeedLimit": 105.0, "gForceForwardBackward": 0.0, "gForceSideToSide": 0.1, "heading": 135 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "geo_dis_01" }, "rearFacing": { "available": true, "sourceId": "geo_dis_02" } }, "extensions": { "here": { "speedLimit": 105.0, "speedLimitSource": "posted", "truckSpeedLimit": 100.0, "roadName": "I-20 East", "linkAttributes": { "countryCode": "US", "isUrban": "false", "isDivided": "true" }, "weather": { "temperature": 92, "humidity": 40, "visibility": 2000 } } }, "severity": "high", "raw": [] },
  { "id": "sft_evt_DROWSY_01", "sourceId": "111000007", "provider": "motive", "type": "drowsiness", "vehicle": "vcl_TR7044", "vehiclePlate": "ON-7044", "startedAt": "2025-07-08T03:20:00.000Z", "metadata": { "addedAt": "2025-07-09T06:00:00Z", "modifiedAt": "2025-07-09T06:00:00Z" }, "sourceType": "DRIVER_FATIGUE_DETECTION", "driver": "drv_DRV1005", "driverName": "Michael Brown", "startLocation": { "longitude": -79.5000, "latitude": 43.7000 }, "endedAt": "2025-07-08T03:20:05.000Z", "endLocation": { "longitude": -79.5010, "latitude": 43.7008 }, "stats": { "maximumSpeed": 95.0, "averageSpeed": 90.0, "roadSpeedLimit": 100.0, "gForceForwardBackward": 0.1, "gForceSideToSide": 0.1, "heading": 0 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "mot_drw_01" }, "rearFacing": { "available": false, "sourceId": null } }, "extensions": { "here": { "speedLimit": 100.0, "speedLimitSource": "posted", "truckSpeedLimit": 100.0, "roadName": "Hwy 400 North", "linkAttributes": { "countryCode": "CA", "isUrban": "false", "isDivided": "true" }, "weather": { "temperature": 15, "humidity": 60, "visibility": 1200 } } }, "severity": "critical", "raw": [] },
  { "id": "sft_evt_SMOKING_01", "sourceId": "111000008", "provider": "lytx", "type": "smoking", "vehicle": "vcl_TR1049B", "vehiclePlate": "TX-2200", "startedAt": "2025-07-22T15:40:00.000Z", "metadata": { "addedAt": "2025-07-23T07:30:00Z", "modifiedAt": "2025-07-23T07:30:00Z" }, "sourceType": "SMOKING_DETECTED", "driver": "drv_DRV2002", "driverName": "Sarah Miller", "startLocation": { "longitude": -95.3698, "latitude": 29.7604 }, "endedAt": "2025-07-22T15:40:15.000Z", "endLocation": { "longitude": -95.3710, "latitude": 29.7615 }, "stats": { "maximumSpeed": 70.0, "averageSpeed": 65.0, "roadSpeedLimit": 90.0, "gForceForwardBackward": 0.0, "gForceSideToSide": 0.0, "heading": 315 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "lytx_smk_01" }, "rearFacing": { "available": false, "sourceId": null } }, "extensions": { "here": { "speedLimit": 90.0, "speedLimitSource": "posted", "truckSpeedLimit": 90.0, "roadName": "I-610 West Loop", "linkAttributes": { "countryCode": "US", "isUrban": "true", "isDivided": "true" }, "weather": { "temperature": 88, "humidity": 65, "visibility": 1600 } } }, "severity": "medium", "raw": [] },
  { "id": "sft_evt_SEATBELT_01", "sourceId": "111000009", "provider": "samsara", "type": "seat_belt_violation", "vehicle": "vcl_TR3055", "vehiclePlate": "NV-3055", "startedAt": "2025-08-05T07:15:00.000Z", "metadata": { "addedAt": "2025-08-06T06:00:00Z", "modifiedAt": "2025-08-06T06:00:00Z" }, "sourceType": "SEAT_BELT_UNLATCHED", "driver": "drv_DRV2003B", "driverName": "Mike Johnson", "startLocation": { "longitude": -119.8138, "latitude": 39.5296 }, "endedAt": "2025-08-05T07:15:00.000Z", "endLocation": { "longitude": -119.8138, "latitude": 39.5296 }, "stats": { "maximumSpeed": 105.0, "averageSpeed": 100.0, "roadSpeedLimit": 120.0, "gForceForwardBackward": 0.0, "gForceSideToSide": 0.0, "heading": 90 }, "cameraMedia": { "frontFacing": { "available": false, "sourceId": null }, "rearFacing": { "available": false, "sourceId": null } }, "extensions": { "here": { "speedLimit": 120.0, "speedLimitSource": "posted", "truckSpeedLimit": 110.0, "roadName": "I-80 East", "linkAttributes": { "countryCode": "US", "isUrban": "false", "isDivided": "true" }, "weather": { "temperature": 80, "humidity": 20, "visibility": 2000 } } }, "severity": "high", "raw": [] },
  { "id": "sft_evt_STOPSIGN_01", "sourceId": "111000010", "provider": "geotab", "type": "stop_sign_violation", "vehicle": "vcl_TR5200", "vehiclePlate": "CA-5200", "startedAt": "2025-08-19T11:05:00.000Z", "metadata": { "addedAt": "2025-08-20T07:00:00Z", "modifiedAt": "2025-08-20T07:00:00Z" }, "sourceType": "STOP_SIGN_RUN_DETECTED", "driver": "drv_DRV1003", "driverName": "Robert Chen", "startLocation": { "longitude": -118.2437, "latitude": 34.0522 }, "endedAt": "2025-08-19T11:05:01.000Z", "endLocation": { "longitude": -118.2440, "latitude": 34.0525 }, "stats": { "maximumSpeed": 25.0, "averageSpeed": 20.0, "roadSpeedLimit": 50.0, "gForceForwardBackward": 0.2, "gForceSideToSide": 0.1, "heading": 0 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "geo_ss_01" }, "rearFacing": { "available": true, "sourceId": "geo_ss_02" } }, "extensions": { "here": { "speedLimit": 50.0, "speedLimitSource": "posted", "truckSpeedLimit": 50.0, "roadName": "Central Ave", "linkAttributes": { "countryCode": "US", "isUrban": "true", "intersectionCategory": "stop_controlled" }, "weather": { "temperature": 78, "humidity": 30, "visibility": 2000 } } }, "severity": "high", "raw": [] },
  { "id": "sft_evt_REDLIGHT_01", "sourceId": "111000011", "provider": "lytx", "type": "red_light_violation", "vehicle": "vcl_TR6001", "vehiclePlate": "FL-6001", "startedAt": "2025-09-03T16:25:00.000Z", "metadata": { "addedAt": "2025-09-04T08:00:00Z", "modifiedAt": "2025-09-04T08:00:00Z" }, "sourceType": "RED_LIGHT_RUN_DETECTED", "driver": "drv_DRV1004B", "driverName": "Sarah Johnson", "startLocation": { "longitude": -81.3792, "latitude": 28.5383 }, "endedAt": "2025-09-03T16:25:02.000Z", "endLocation": { "longitude": -81.3798, "latitude": 28.5390 }, "stats": { "maximumSpeed": 60.0, "averageSpeed": 55.0, "roadSpeedLimit": 65.0, "gForceForwardBackward": 0.1, "gForceSideToSide": 0.0, "heading": 315 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "lytx_rl_01" }, "rearFacing": { "available": true, "sourceId": "lytx_rl_02" } }, "extensions": { "here": { "speedLimit": 65.0, "speedLimitSource": "posted", "truckSpeedLimit": 65.0, "roadName": "Orange Blossom Trl", "linkAttributes": { "countryCode": "US", "isUrban": "true", "intersectionCategory": "signalized" }, "weather": { "temperature": 90, "humidity": 70, "visibility": 1500 } } }, "severity": "critical", "raw": [] },
  { "id": "sft_evt_LANECHANGE_01", "sourceId": "111000012", "provider": "samsara", "type": "unsafe_lane_change", "vehicle": "vcl_TR2088B", "vehiclePlate": "ON-2088", "startedAt": "2025-09-15T12:10:00.000Z", "metadata": { "addedAt": "2025-09-16T07:30:00Z", "modifiedAt": "2025-09-16T07:30:00Z" }, "sourceType": "LANE_CHANGE_ALERT", "driver": "drv_DRV1002B", "driverName": "Maria Rodriguez", "startLocation": { "longitude": -79.3832, "latitude": 43.6532 }, "endedAt": "2025-09-15T12:10:04.000Z", "endLocation": { "longitude": -79.3840, "latitude": 43.6540 }, "stats": { "maximumSpeed": 110.0, "averageSpeed": 105.0, "roadSpeedLimit": 100.0, "gForceForwardBackward": 0.3, "gForceSideToSide": 0.9, "heading": 90 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "sam_lc_01" }, "rearFacing": { "available": false, "sourceId": null } }, "extensions": { "here": { "speedLimit": 100.0, "speedLimitSource": "posted", "truckSpeedLimit": 100.0, "roadName": "Hwy 401 East", "linkAttributes": { "countryCode": "CA", "isUrban": "false", "isDivided": "true" }, "weather": { "temperature": 12, "humidity": 75, "visibility": 900 } } }, "severity": "high", "raw": [] },
  { "id": "sft_evt_CAMBLOCK_01", "sourceId": "111000013", "provider": "geotab", "type": "camera_obstruction", "vehicle": "vcl_TR1049C", "vehiclePlate": "TX-1049", "startedAt": "2025-09-28T06:50:00.000Z", "metadata": { "addedAt": "2025-09-29T07:00:00Z", "modifiedAt": "2025-09-29T07:00:00Z" }, "sourceType": "CAMERA_BLOCKED_ALERT", "driver": "drv_DRV2001B", "driverName": "John Smith", "startLocation": { "longitude": -97.7431, "latitude": 30.2672 }, "endedAt": "2025-09-28T06:50:30.000Z", "endLocation": { "longitude": -97.7431, "latitude": 30.2672 }, "stats": { "maximumSpeed": 0.0, "averageSpeed": 0.0, "roadSpeedLimit": 0.0, "gForceForwardBackward": 0.0, "gForceSideToSide": 0.0, "heading": 0 }, "cameraMedia": { "frontFacing": { "available": false, "sourceId": null }, "rearFacing": { "available": false, "sourceId": null } }, "extensions": { "here": { "speedLimit": 0.0, "speedLimitSource": "posted", "truckSpeedLimit": 0.0, "roadName": "Truck Yard - Austin", "linkAttributes": { "countryCode": "US", "isUrban": "true", "isPaved": "true" }, "weather": { "temperature": 75, "humidity": 50, "visibility": 2000 } } }, "severity": "medium", "raw": [] },
  { "id": "sft_evt_EATING_01", "sourceId": "111000014", "provider": "lytx", "type": "eating_and_drinking", "vehicle": "vcl_TR4456B", "vehiclePlate": "OH-4456", "startedAt": "2025-10-10T12:30:00.000Z", "metadata": { "addedAt": "2025-10-11T08:00:00Z", "modifiedAt": "2025-10-11T08:00:00Z" }, "sourceType": "EATING_WHILE_DRIVING", "driver": "drv_DRV1001B", "driverName": "James Sullivan", "startLocation": { "longitude": -82.9988, "latitude": 39.9612 }, "endedAt": "2025-10-10T12:30:20.000Z", "endLocation": { "longitude": -82.9995, "latitude": 39.9620 }, "stats": { "maximumSpeed": 105.0, "averageSpeed": 100.0, "roadSpeedLimit": 120.0, "gForceForwardBackward": 0.0, "gForceSideToSide": 0.0, "heading": 180 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "lytx_eat_01" }, "rearFacing": { "available": false, "sourceId": null } }, "extensions": { "here": { "speedLimit": 120.0, "speedLimitSource": "posted", "truckSpeedLimit": 110.0, "roadName": "I-71 South", "linkAttributes": { "countryCode": "US", "isUrban": "false", "isDivided": "true" }, "weather": { "temperature": 65, "humidity": 60, "visibility": 1800 } } }, "severity": "medium", "raw": [] },
  { "id": "sft_evt_ROLLSTOP_01", "sourceId": "111000015", "provider": "motive", "type": "rolling_stop", "vehicle": "vcl_TR3321B", "vehiclePlate": "NV-3321", "startedAt": "2025-10-22T08:45:00.000Z", "metadata": { "addedAt": "2025-10-23T07:00:00Z", "modifiedAt": "2025-10-23T07:00:00Z" }, "sourceType": "ROLLING_STOP_DETECTED", "driver": "drv_DRV2003C", "driverName": "Mike Johnson", "startLocation": { "longitude": -115.1728, "latitude": 36.1147 }, "endedAt": "2025-10-22T08:45:02.000Z", "endLocation": { "longitude": -115.1732, "latitude": 36.1150 }, "stats": { "maximumSpeed": 12.0, "averageSpeed": 8.0, "roadSpeedLimit": 50.0, "gForceForwardBackward": 0.1, "gForceSideToSide": 0.0, "heading": 270 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "mot_rs_01" }, "rearFacing": { "available": false, "sourceId": null } }, "extensions": { "here": { "speedLimit": 50.0, "speedLimitSource": "posted", "truckSpeedLimit": 50.0, "roadName": "Boulder Hwy", "linkAttributes": { "countryCode": "US", "isUrban": "true", "intersectionCategory": "stop_controlled" }, "weather": { "temperature": 100, "humidity": 5, "visibility": 2000 } } }, "severity": "medium", "raw": [] },
  { "id": "sft_evt_UNSAFEPK_01", "sourceId": "111000016", "provider": "samsara", "type": "unsafe_parking", "vehicle": "vcl_TR6623B", "vehiclePlate": "TX-6623", "startedAt": "2025-11-08T20:15:00.000Z", "metadata": { "addedAt": "2025-11-09T07:00:00Z", "modifiedAt": "2025-11-09T07:00:00Z" }, "sourceType": "UNSAFE_PARKING_DETECTED", "driver": "drv_DRV2004B", "driverName": "Elena Rodriguez", "startLocation": { "longitude": -96.7970, "latitude": 32.7767 }, "endedAt": "2025-11-08T20:15:00.000Z", "endLocation": { "longitude": -96.7970, "latitude": 32.7767 }, "stats": { "maximumSpeed": 0.0, "averageSpeed": 0.0, "roadSpeedLimit": 80.0, "gForceForwardBackward": 0.0, "gForceSideToSide": 0.0, "heading": 0 }, "cameraMedia": { "frontFacing": { "available": false, "sourceId": null }, "rearFacing": { "available": false, "sourceId": null } }, "extensions": { "here": { "speedLimit": 80.0, "speedLimitSource": "posted", "truckSpeedLimit": 80.0, "roadName": "I-30 Frontage Rd", "linkAttributes": { "countryCode": "US", "isUrban": "true", "isPaved": "true" }, "weather": { "temperature": 70, "humidity": 55, "visibility": 1500 } } }, "severity": "medium", "raw": [] },
  { "id": "sft_evt_CRASH_01", "sourceId": "111000017", "provider": "geotab", "type": "crash", "vehicle": "vcl_TR5590B", "vehiclePlate": "FL-5590", "startedAt": "2025-12-02T08:00:00.000Z", "metadata": { "addedAt": "2025-12-03T09:00:00Z", "modifiedAt": "2025-12-03T09:00:00Z" }, "sourceType": "CRASH_DETECTED", "driver": "drv_DRV1004C", "driverName": "Sarah Johnson", "startLocation": { "longitude": -80.1918, "latitude": 25.7617 }, "endedAt": "2025-12-02T08:00:05.000Z", "endLocation": { "longitude": -80.1920, "latitude": 25.7620 }, "stats": { "maximumSpeed": 80.0, "averageSpeed": 75.0, "roadSpeedLimit": 90.0, "gForceForwardBackward": 3.5, "gForceSideToSide": 1.8, "heading": 0 }, "cameraMedia": { "frontFacing": { "available": true, "sourceId": "geo_crsh_01" }, "rearFacing": { "available": true, "sourceId": "geo_crsh_02" } }, "extensions": { "here": { "speedLimit": 90.0, "speedLimitSource": "posted", "truckSpeedLimit": 90.0, "roadName": "I-95 South", "linkAttributes": { "countryCode": "US", "isUrban": "false", "isDivided": "true" }, "weather": { "temperature": 82, "humidity": 80, "visibility": 600 } } }, "severity": "critical", "raw": [] }
];

const RAW_DATA = { "results": SAFETY_EVENTS_RESULTS };

// ===== Helper functions =====
const getEventTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    'harsh_brake': 'Harsh Brake', 'harsh_acceleration': 'Harsh Accel.', 'harsh_cornering': 'Harsh Turn',
    'harsh_turn': 'Harsh Turn', 'over_speed': 'Over Speed', 'crash': 'Crash', 'near_crash': 'Near Crash',
    'tailgating': 'Tailgating', 'cell_phone': 'Cell Phone', 'distracted': 'Distracted',
    'drowsiness': 'Drowsiness', 'smoking': 'Smoking', 'seat_belt_violation': 'Seat Belt',
    'stop_sign_violation': 'Stop Sign', 'red_light_violation': 'Red Light', 'unsafe_lane_change': 'Lane Change',
    'camera_obstruction': 'Cam. Block', 'eating_and_drinking': 'Eating/Drink', 'rolling_stop': 'Rolling Stop',
    'unsafe_parking': 'Unsafe Park', 'collision_warning': 'Collision Warn',
  };
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const getEventTypeStyle = (type: string) => {
  switch (type) {
    case 'harsh_brake':
    case 'harsh_acceleration': return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
    case 'over_speed':
    case 'speeding': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
    case 'harsh_cornering':
    case 'harsh_turn':
    case 'unsafe_lane_change': return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
    case 'collision_warning':
    case 'near_crash':
    case 'crash': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' };
    case 'cell_phone':
    case 'distracted':
    case 'eating_and_drinking': return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' };
    case 'drowsiness': return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' };
    case 'tailgating': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' };
    case 'smoking': return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
    case 'seat_belt_violation':
    case 'stop_sign_violation':
    case 'red_light_violation':
    case 'rolling_stop': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
    case 'camera_obstruction':
    case 'unsafe_parking': return { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' };
    default: return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'critical': return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50/80 rounded text-xs font-bold text-red-600 tracking-wide uppercase whitespace-nowrap"><ShieldAlert size={10} className="text-red-500 flex-shrink-0" /> CRITICAL</span>;
    case 'high': return <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 rounded text-xs font-bold text-amber-600 tracking-wide uppercase whitespace-nowrap">HIGH</span>;
    case 'medium': return <span className="inline-flex items-center px-2 py-0.5 bg-yellow-50 rounded text-xs font-bold text-yellow-600 tracking-wide uppercase whitespace-nowrap">MEDIUM</span>;
    default: return <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 rounded text-xs font-bold text-emerald-600 tracking-wide uppercase whitespace-nowrap">LOW</span>;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Review lifecycle + rich activity trail. Telematics/video events arrive from
// the provider "In Review"; a reviewer verifies the clip and closes with a
// resolution (assign training / warning letter / safety alert / driver notice /
// terminate / dismiss as false). Every event carries a seeded audit trail —
// received → clip attached → recorded → opened → verified → resolution — so the
// Activity tab is meaningful the moment the page loads.
const SEV_TRAILERS = ['TRL-301', 'TRL-455', 'TRL-782', 'TRL-119', 'TRL-640', 'TRL-528', 'TRL-903', 'TRL-214', 'TRL-376', 'TRL-687'];
const SEV_REVIEWERS = ['Dana Whitfield', 'Marcus Lee', 'Priya Nair', 'Tom Becker', 'Sofia Alvarez'];
function hashOf(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function frac(n: number): number { const x = Math.sin(n) * 10000; return x - Math.floor(x); }
function isoPlus(iso: string, mins: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decorateSafetyEvent(e: any): any {
  const key = String(e.id);
  const h = hashOf(key);
  const trailerId = SEV_TRAILERS[h % SEV_TRAILERS.length];
  const company = e.provider;
  const prov = String(company || '').toUpperCase();
  const receivedAt: string = e.metadata?.addedAt ?? e.startedAt;
  const closed = frac(h * 0.017 + 3) > 0.6;
  const status: HosVStatus = closed ? 'resolved' : 'review';
  const reviewer = SEV_REVIEWERS[h % SEV_REVIEWERS.length];
  const cam = hasCamera(e);
  const srcBadge = { label: 'Source', tone: ACTIVITY_BADGE_TONE.Source };
  const sysBadge = { label: 'System', tone: ACTIVITY_BADGE_TONE.System };
  const revBadge = { label: 'Reviewer', tone: ACTIVITY_BADGE_TONE.Reviewer };
  const camBadge = { label: 'Camera', tone: ACTIVITY_BADGE_TONE.Camera };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activity: any[] = [
    { id: `${key}-a1`, at: receivedAt, by: prov, kind: 'received', title: 'Received from telematics', detail: `Imported from ${prov} via API`, badge: srcBadge },
  ];
  if (cam) {
    const which = e.cameraMedia?.frontFacing?.available && e.cameraMedia?.rearFacing?.available
      ? 'Front + rear' : e.cameraMedia?.frontFacing?.available ? 'Front-facing' : 'Rear-facing';
    activity.push({ id: `${key}-a2`, at: isoPlus(receivedAt, 1), by: prov, kind: 'video', title: 'Video clip attached', detail: `${which} camera footage synced with the event`, badge: camBadge });
  }
  activity.push({ id: `${key}-a3`, at: isoPlus(receivedAt, 4), by: 'System', kind: 'recorded', detail: 'Logged to safety events', badge: sysBadge });
  activity.push({ id: `${key}-a4`, at: isoPlus(receivedAt, 18 * 60), by: reviewer, kind: 'viewed', title: 'Opened for review', detail: `${reviewer} reviewed the clip and telemetry`, badge: revBadge });

  let disposition: HosDisposition | undefined;
  let training: { name: string; assignedBy: string; assignedAt: string } | undefined;
  let reviewedBy: string | undefined;
  let reviewedAt: string | undefined;
  let falseViolation = false;

  if (closed) {
    reviewedBy = reviewer;
    reviewedAt = isoPlus(receivedAt, 24 * 60);
    const disp = HOS_DISPOSITIONS[Math.floor(frac(h * 0.031 + 5) * HOS_DISPOSITIONS.length)];
    disposition = disp.id;
    if (disp.id === 'false') falseViolation = true;
    activity.push({ id: `${key}-a5`, at: isoPlus(reviewedAt, -20), by: reviewer, kind: 'verified', title: 'Verified event', detail: disp.id === 'false' ? 'Reviewed footage — not a genuine event.' : 'Reviewed footage — confirmed a genuine event.', badge: revBadge });
    let detail = `Closed — ${disp.label}`;
    if (disp.id === 'training') {
      const tname = HOS_TRAINING_TYPES[Math.floor(frac(h * 0.043 + 7) * HOS_TRAINING_TYPES.length)];
      training = { name: tname, assignedBy: reviewer, assignedAt: reviewedAt };
      detail = `Closed — assigned training: ${tname}`;
    }
    activity.push({ id: `${key}-a6`, at: reviewedAt, by: reviewer, kind: disp.kind, detail, badge: revBadge });
  }

  return { ...e, trailerId, company, receivedAt, status, disposition, training, reviewedBy, reviewedAt, falseViolation, reviewNotes: '', activity };
}

// ═══════════════════════════════════════════════════════════════════════════
// Safety Events list — rebuilt to match the Default Accidents / Tickets pattern
// (PageHeader → KPI cards → group tabs → event-type cards → toolbar → sortable
// table + mobile cards → pagination). Risk weight is pulled from the editable
// Telematics event-type catalog (Settings ▸ Safety Events).
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_SIZES = [10, 25, 50, 100];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Event-type groups (tab buckets) ──────────────────────────────────────────
type GroupId = 'harsh' | 'distraction' | 'collision' | 'compliance' | 'camera';
const GROUP_OF: Record<string, GroupId> = {
  harsh_brake: 'harsh', harsh_acceleration: 'harsh', harsh_cornering: 'harsh', harsh_turn: 'harsh',
  over_speed: 'harsh', speeding: 'harsh', tailgating: 'harsh', unsafe_lane_change: 'harsh',
  cell_phone: 'distraction', distracted: 'distraction', drowsiness: 'distraction', smoking: 'distraction', eating_and_drinking: 'distraction',
  collision_warning: 'collision', near_crash: 'collision', crash: 'collision',
  seat_belt_violation: 'compliance', stop_sign_violation: 'compliance', red_light_violation: 'compliance', rolling_stop: 'compliance', unsafe_parking: 'compliance',
  camera_obstruction: 'camera',
};
const groupOf = (type: string): GroupId => GROUP_OF[type] ?? 'harsh';

// A few raw event types differ from the settings-catalog ids.
const TYPE_TO_CATALOG: Record<string, string> = {
  over_speed: 'speeding',
  harsh_cornering: 'harsh_turn',
  collision_warning: 'near_crash',
};

const SEV_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hasCamera = (e: any) => !!(e.cameraMedia?.frontFacing?.available || e.cameraMedia?.rearFacing?.available);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gforceOf = (e: any) => Math.max(e.stats?.gForceForwardBackward ?? 0, e.stats?.gForceSideToSide ?? 0);

function fmtWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso || '—', time: '' };
  const date = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

const AVATAR_COLORS = ['bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-sky-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500'];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const p = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '—';
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
function DriverCell({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white', avatarColor(name || '?'))}>{initials(name)}</span>
      <span className="truncate text-[13px] font-semibold text-slate-800" title={name}>{name || '—'}</span>
    </div>
  );
}

// ── Columns ──────────────────────────────────────────────────────────────────
type ColId = 'when' | 'type' | 'driver' | 'vehicle' | 'location' | 'speed' | 'gforce' | 'risk' | 'provider' | 'severity' | 'resolution' | 'status' | 'camera';
const COLUMN_DEFS: { id: ColId; label: string; locked?: boolean; defaultOn: boolean }[] = [
  { id: 'when', label: 'Date / time', locked: true, defaultOn: true },
  { id: 'type', label: 'Event type', locked: true, defaultOn: true },
  { id: 'driver', label: 'Driver', defaultOn: true },
  { id: 'vehicle', label: 'Truck / Trailer', defaultOn: true },
  { id: 'location', label: 'Location', defaultOn: false },
  { id: 'speed', label: 'Max / limit', defaultOn: false },
  { id: 'gforce', label: 'G-force', defaultOn: false },
  { id: 'risk', label: 'Risk', defaultOn: false },
  { id: 'provider', label: 'Source', defaultOn: false },
  { id: 'severity', label: 'Severity', defaultOn: true },
  { id: 'resolution', label: 'Resolution', defaultOn: true },
  { id: 'status', label: 'Status', defaultOn: true },
  { id: 'camera', label: 'Camera', defaultOn: false },
];
const SEV_STATUS_RANK: Record<HosVStatus, number> = { open: 1, review: 2, resolved: 3 };
type SortState = { col: ColId; dir: 'asc' | 'desc' };

function SortTh({ id, label, minW, align, sort, onSort }: {
  id: ColId; label: string; minW: string; align?: 'right' | 'center'; sort: SortState | null; onSort: (id: ColId) => void;
}) {
  const active = sort?.col === id;
  return (
    <th className={cn('px-3 py-2.5 whitespace-nowrap', minW, align === 'right' && 'text-right', align === 'center' && 'text-center')}>
      <button type="button" onClick={() => onSort(id)}
        className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider hover:text-slate-700', active ? 'text-slate-700' : 'text-slate-500')}>
        {label}
        {active ? (sort!.dir === 'asc' ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />)
          : <ChevronsUpDown size={12} className="text-slate-300" />}
      </button>
    </th>
  );
}

function ColumnsDropdown({ visible, onToggle }: { visible: Set<ColId>; onToggle: (id: ColId) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
        <Columns size={14} /> Columns <ChevronDown size={13} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Toggle columns</div>
            {COLUMN_DEFS.map(c => (
              <label key={c.id} className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-slate-700', c.locked ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50')}>
                <input type="checkbox" disabled={c.locked} checked={visible.has(c.id)} onChange={() => onToggle(c.id)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                {c.label}
                {c.locked && <span className="ml-auto text-[10px] font-medium text-slate-400">Always</span>}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const TAB_TONE: Record<string, { active: string; badge: string }> = {
  blue: { active: 'border-blue-600 text-blue-700 bg-blue-50/40', badge: 'bg-blue-100 text-blue-700' },
  red: { active: 'border-red-600 text-red-700 bg-red-50/40', badge: 'bg-red-100 text-red-700' },
  violet: { active: 'border-violet-600 text-violet-700 bg-violet-50/40', badge: 'bg-violet-100 text-violet-700' },
  rose: { active: 'border-rose-600 text-rose-700 bg-rose-50/40', badge: 'bg-rose-100 text-rose-700' },
  amber: { active: 'border-amber-600 text-amber-700 bg-amber-50/40', badge: 'bg-amber-100 text-amber-700' },
  sky: { active: 'border-sky-600 text-sky-700 bg-sky-50/40', badge: 'bg-sky-100 text-sky-700' },
};

const SUBCAT_PALETTE = [
  { bg: 'bg-sky-50/60', count: 'text-sky-700', chip: 'bg-sky-50 text-sky-700 ring-sky-200', bar: 'bg-sky-500', barBg: 'bg-sky-100' },
  { bg: 'bg-violet-50/60', count: 'text-violet-700', chip: 'bg-violet-50 text-violet-700 ring-violet-200', bar: 'bg-violet-500', barBg: 'bg-violet-100' },
  { bg: 'bg-rose-50/60', count: 'text-rose-700', chip: 'bg-rose-50 text-rose-700 ring-rose-200', bar: 'bg-rose-500', barBg: 'bg-rose-100' },
  { bg: 'bg-amber-50/60', count: 'text-amber-700', chip: 'bg-amber-50 text-amber-700 ring-amber-200', bar: 'bg-amber-500', barBg: 'bg-amber-100' },
  { bg: 'bg-emerald-50/60', count: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500', barBg: 'bg-emerald-100' },
  { bg: 'bg-indigo-50/60', count: 'text-indigo-700', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200', bar: 'bg-indigo-500', barBg: 'bg-indigo-100' },
  { bg: 'bg-teal-50/60', count: 'text-teal-700', chip: 'bg-teal-50 text-teal-700 ring-teal-200', bar: 'bg-teal-500', barBg: 'bg-teal-100' },
  { bg: 'bg-fuchsia-50/60', count: 'text-fuchsia-700', chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200', bar: 'bg-fuchsia-500', barBg: 'bg-fuchsia-100' },
];

type Sev = 'critical' | 'high' | 'medium' | 'low';

// Row-level kebab menu (Edit / Delete) — portal + fixed position so it escapes
// the sticky Action column's stacking context.
function RowActions({ items }: { items: { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: Math.min(r.bottom + 4, window.innerHeight - items.length * 40 - 12), left: Math.max(8, r.right - 160) });
    setOpen(true);
  };
  return (
    <>
      <button ref={btnRef} type="button" title="More actions" onClick={openMenu}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
        <MoreVertical size={15} />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: 160, zIndex: 80 }}
            className="rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {items.map(it => (
              <button key={it.label} type="button" onClick={() => { setOpen(false); it.onClick(); }}
                className={cn('flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px]', it.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50')}>
                <it.icon size={14} /> {it.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

// Assign-training modal (bulk or single) for safety events.
function SafetyTrainingModal({ count, onClose, onAssign }: { count: number; onClose: () => void; onAssign: (name: string) => void }) {
  const [name, setName] = useState(HOS_TRAINING_TYPES[0]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600"><GraduationCap size={18} /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Assign training</h3>
            <p className="text-[13px] text-slate-500">Assign a training course to {count === 1 ? 'this driver' : <span className="font-semibold text-slate-700">{count} drivers</span>}.</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Training course</label>
          <select value={name} onChange={e => setName(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            {HOS_TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={() => onAssign(name)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-violet-700"><GraduationCap size={15} /> Assign training</button>
        </div>
      </div>
    </div>
  );
}

// View popup with Details / Review / Activity tabs. The review lifecycle lives
// in its own tab (via the shared ReviewResolutionTab); the Activity tab shows
// the full seeded + live audit trail (received, clip attached, viewed, verified,
// resolution, notes…). Matches the Hours-of-Service violations surface.
function SafetyEventModal({ record, riskFor, onClose, onAddNote, onDispose, onAssignTraining, onReopen, onVerify, currentUserName, onNavigate }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any; riskFor: (type: string) => number;
  onClose: () => void;
  onAddNote: (text: string) => void;
  onDispose: (disp: HosDisposition) => void;
  onAssignTraining: () => void;
  onReopen: () => void;
  onVerify: () => void;
  currentUserName?: string;
  onNavigate?: (path: string) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  // Everything shareable from a telematics event — the clip(s), a snapshot and the report.
  const shareItems: ShareItem[] = [
    { name: `telematics-report-${record.id}.pdf`, group: 'Report' },
    ...(record.cameraMedia?.frontFacing?.available ? [{ name: `front-camera-${record.id}.mp4`, group: 'Video' }] : []),
    ...(record.cameraMedia?.rearFacing?.available ? [{ name: `rear-camera-${record.id}.mp4`, group: 'Video' }] : []),
    { name: `event-snapshot-${record.id}.jpg`, group: 'Evidence' },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verifiedAct = (record.activity ?? []).find((a: any) => a.kind === 'verified');
  const when = fmtWhen(record.startedAt);
  const style = getEventTypeStyle(record.type);
  const gf = gforceOf(record);
  const cam = hasCamera(record);
  const st = HOS_STATUS_META[record.status as HosVStatus];
  const [tab, setTab] = useState<'details' | 'review' | 'activity'>('details');
  const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-slate-400';
  const Row = ({ label, value, title }: { label: string; value: ReactNode; title?: string }) => (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 truncate text-right font-semibold text-slate-700" title={title}>{value}</span>
    </div>
  );
  const camLabel = `${record.cameraMedia?.frontFacing?.available ? 'Front' : ''}${record.cameraMedia?.frontFacing?.available && record.cameraMedia?.rearFacing?.available ? ' + ' : ''}${record.cameraMedia?.rearFacing?.available ? 'Rear' : ''}${!cam ? 'None' : ''}`;
  const TABS = [['details', 'Details'], ['review', 'Review'], ['activity', `Activity (${record.activity?.length ?? 0})`]] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="flex h-[640px] max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pt-4">
          <div className="min-w-0 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase', style.bg, style.text, style.border)}>{getEventTypeLabel(record.type)}</span>
              {getSeverityBadge(record.severity)}
              <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', st.tone)}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>
              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600">{record.provider}</span>
              {record.falseViolation && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"><Ban size={10} /> False</span>}
            </div>
            <h3 className="mt-1.5 text-base font-bold text-slate-900">{record.driverName} · {record.vehiclePlate}</h3>
            <p className="text-[12px] text-slate-500">{record.extensions?.here?.roadName} · {when.date} {when.time}</p>
          </div>
          <button type="button" onClick={onClose} className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 px-5">
          {TABS.map(([id, lbl]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={cn('flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors', tab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
              {id === 'review' && <ClipboardCheck size={14} />}{id === 'activity' && <History size={14} />}{lbl}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div><div className={labelCls}>Resolution</div><div className="mt-0.5 text-[13px] font-semibold text-slate-800">{record.disposition ? HOS_DISPOSITION_BY_ID[record.disposition as HosDisposition].label : 'Pending review'}</div></div>
                <div><div className={labelCls}>Risk weight</div><div className="mt-0.5 text-[13px] font-semibold text-slate-800">{riskFor(record.type)}</div></div>
                <div><div className={labelCls}>Truck / Trailer</div><div className="mt-0.5 text-[13px] font-semibold text-slate-800">{record.vehiclePlate} / {record.trailerId ?? '—'}</div></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 text-[12px]">
                  <div className={labelCls}>Telemetry</div>
                  <Row label="Max speed" value={<span className="font-mono">{record.stats?.maximumSpeed} km/h</span>} />
                  <Row label="Avg speed" value={<span className="font-mono">{record.stats?.averageSpeed} km/h</span>} />
                  <Row label="Road limit" value={<span className="font-mono">{record.stats?.roadSpeedLimit} km/h</span>} />
                  <Row label="Heading" value={<span className="font-mono">{record.stats?.heading}°</span>} />
                  <Row label="G-force" value={<span className="font-mono">{gf.toFixed(2)}g</span>} />
                </div>
                <div className="space-y-1.5 text-[12px]">
                  <div className={labelCls}>Context</div>
                  <Row label="Source" value={<span className="uppercase">{record.provider}</span>} />
                  <Row label="Event type" title={record.sourceType} value={<span className="uppercase">{record.sourceType}</span>} />
                  <Row label="Camera" value={camLabel} />
                  <Row label="Weather" value={`${record.extensions?.here?.weather?.temperature != null ? `${record.extensions.here.weather.temperature}°` : '—'}${record.extensions?.here?.weather?.precipitationType ? ` · ${record.extensions.here.weather.precipitationType}` : ''}`} />
                  <Row label="Visibility" value={record.extensions?.here?.weather?.visibility ?? '—'} />
                </div>
              </div>
              {cam && (
                <div className="flex items-center gap-2 rounded-lg border border-fuchsia-100 bg-fuchsia-50/60 px-3 py-2 text-[12px] text-fuchsia-700">
                  <Camera size={14} className="shrink-0" /> {camLabel} camera footage is attached to this event.
                </div>
              )}
              <div className="text-[11px] text-slate-400">Event ID <span className="font-mono">{record.id}</span> · Received <span className="font-mono">{fmtWhen(record.receivedAt ?? record.startedAt).date}</span></div>
            </div>
          )}
          {tab === 'review' && (
            <ReviewResolutionTab
              status={record.status}
              subjectName={record.driverName}
              disposition={record.disposition}
              trainingName={record.training?.name}
              reviewedBy={record.reviewedBy}
              reviewNotes={record.reviewNotes}
              verified={!!verifiedAct}
              verifiedBy={verifiedAct?.by}
              onDispose={onDispose}
              onAssignTraining={onAssignTraining}
              onReopen={onReopen}
              onAddNote={onAddNote}
              onVerify={onVerify}
            />
          )}
          {tab === 'activity' && (
            <ActivityTimeline entries={toActivityEntries(record.activity, fmtWhen)} />
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Share2 size={15} /> Share</button>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
        </div>
      </div>

      {shareOpen && (
        <ShareToChat
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title="Share safety event"
          subtitle={`Share this ${getEventTypeLabel(record.type)} event in a chat — in-app or with an outsider by email.`}
          source={{ type: 'safety-event', id: record.id, label: `Safety event · ${record.driverName}` }}
          items={shareItems}
          defaultChannel="in-app"
          defaultSubject={`Safety event — ${getEventTypeLabel(record.type)} · ${record.driverName}`}
          defaultMessage={`Sharing a ${getEventTypeLabel(record.type)} telematics event for ${record.driverName} (${record.vehiclePlate}).`}
          currentUserName={currentUserName}
          onOpenInMessages={onNavigate ? (id) => { setMessagesFocus(id); onNavigate('/messages'); } : undefined}
        />
      )}
    </div>
  );
}

export function SafetyEventsPage({ currentUserName = 'Safety Manager', onNavigate, accountId }: { currentUserName?: string; onNavigate?: (path: string) => void; accountId?: string } = {}) {
  // Local copy so review / delete actions can mutate without touching the shared
  // SAFETY_EVENTS_RESULTS export (other pages read it). Each raw event is
  // decorated with a trailer id, review status and a seeded activity trail.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allEvents, setAllEvents] = useState<any[]>(() => RAW_DATA.results.map(decorateSafetyEvent));

  // View popup + delete + multiselect + training.
  const [viewingId, setViewingId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deleting, setDeleting] = useState<any | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [trainingIds, setTrainingIds] = useState<string[] | null>(null);
  const [shareRecord, setShareRecord] = useState<RecordRef | null>(null);
  const viewing = viewingId ? allEvents.find(e => e.id === viewingId) ?? null : null;
  // Open a specific event when arriving from a shared record link.
  useEffect(() => { const id = consumePendingRecord('/safety-events'); if (id) setViewingId(id); }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sevRef = (e: any): RecordRef => ({
    type: 'safety-event', id: e.id, label: `Safety event · ${e.driverName}`,
    sublabel: [getEventTypeLabel(e.type), e.vehiclePlate].filter(Boolean).join(' · ') || undefined, path: '/safety-events',
  });

  // ── Activity + review actions (each appends to the audit trail) ──
  const nowStamp = () => new Date().toISOString();
  const newActId = () => `act-${Math.random().toString(36).slice(2, 9)}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withAct = (e: any, kind: string, detail?: string, title?: string): any =>
    ({ ...e, activity: [...(e.activity ?? []), { id: newActId(), at: nowStamp(), by: currentUserName, kind, detail, title, badge: { label: 'Reviewer', tone: ACTIVITY_BADGE_TONE.Reviewer } }] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyTo = (ids: string[], fn: (e: any) => any) => setAllEvents(prev => prev.map(e => (ids.includes(e.id) ? fn(e) : e)));
  const addNote = (id: string, text: string) => applyTo([id], e => withAct({ ...e, reviewNotes: e.reviewNotes ? `${e.reviewNotes}\n${text}` : text }, 'note', text));
  // Push a driver-facing task/notice into the driver's chat for a resolution.
  // 'false' (dismiss) sends nothing — it's just a resolution status.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dispatchDisposition = (e: any, disp: HosDisposition) => {
    if (disp === 'false' || disp === 'training') return;
    const when = fmtWhen(e.startedAt);
    const evt = getEventTypeLabel(e.type);
    const rec = sevRef(e);
    const base = { status: 'pending' as const, record: rec, subtitle: `${evt} · ${when.date}` };
    const map: Record<string, ChatWidget> = {
      warning: { ...base, kind: 'warning-letter', title: 'Warning letter' },
      alert: { ...base, kind: 'alert', title: 'Safety alert' },
      notice: { ...base, kind: 'notice', title: 'Driver notice' },
      terminated: { ...base, kind: 'termination', title: 'Termination notice' },
    };
    const widget = map[disp];
    if (widget) sendWidgetToDriver(e.driverName, widget, `${widget.title} regarding your ${evt} event on ${when.date}.`);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendTrainingWidget = (e: any, name: string) => {
    sendWidgetToDriver(e.driverName, {
      kind: 'training', title: `Training assigned: ${name}`, subtitle: 'Complete your assigned safety training',
      status: 'pending', record: sevRef(e),
    }, `You've been assigned training: ${name}.`);
  };
  // A warning letter is a DOCUMENT as well as a notice, so issuing one also writes the
  // driver's Warning Letter compliance record, carrying the event that caused it. The
  // telematics driver id is the provider's, not the roster's, so the driver is matched by
  // name (see `resolveDriverId`).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileWarningLetter = (e: any) => {
    const when = fmtWhen(e.startedAt);
    issueWarningLetter(accountId, {
      kind: 'safety-event',
      driverId: e.driver ?? '',
      driverName: e.driverName,
      eventType: getEventTypeLabel(e.type),
      reference: e.id,
      sourceId: e.id,
      eventDate: e.startedAt,
      summary: [e.severity ? `${e.severity} severity` : null, e.vehiclePlate ? `Unit ${e.vehiclePlate}` : null,
        when.date].filter(Boolean).join(' · '),
    }, currentUserName);
  };

  // Close an event with a chosen resolution (disposition). Works on one or many.
  const closeWith = (ids: string[], disp: HosDisposition) => {
    const targets = allEvents.filter(e => ids.includes(e.id));
    applyTo(ids, e => {
      const meta = HOS_DISPOSITION_BY_ID[disp];
      return withAct({
        ...e, status: 'resolved', disposition: disp,
        reviewedBy: e.reviewedBy ?? currentUserName, reviewedAt: e.reviewedAt ?? nowStamp(),
        falseViolation: disp === 'false' ? true : e.falseViolation,
      }, meta.kind, `Closed — ${meta.label}`);
    });
    targets.forEach(e => dispatchDisposition(e, disp));
    if (disp === 'warning') targets.forEach(fileWarningLetter);
  };
  const assignTraining = (ids: string[], name: string) => {
    const targets = allEvents.filter(e => ids.includes(e.id));
    applyTo(ids, e => withAct({
      ...e, training: { name, assignedBy: currentUserName, assignedAt: nowStamp() },
      status: 'resolved', disposition: 'training',
      reviewedBy: e.reviewedBy ?? currentUserName, reviewedAt: e.reviewedAt ?? nowStamp(),
    }, 'training', `Closed — assigned training: ${name}`));
    targets.forEach(e => sendTrainingWidget(e, name));
  };
  const reopenMany = (ids: string[]) => applyTo(ids, e => (e.status === 'review' ? e : withAct({ ...e, status: 'review', disposition: undefined }, 'reopened', 'Reopened for review')));
  // Verify — logs a live "Verified" entry by the current user (once).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verify = (ids: string[]) => applyTo(ids, e => ((e.activity ?? []).some((a: any) => a.kind === 'verified' && a.by === currentUserName)
    ? e
    : withAct({ ...e, reviewedBy: e.reviewedBy ?? currentUserName, reviewedAt: e.reviewedAt ?? nowStamp() }, 'verified', 'Reviewed the clip & telemetry — confirmed a genuine event.', 'Verified event')));
  const confirmDelete = () => { if (deleting) setAllEvents(prev => prev.filter(x => x.id !== deleting.id)); setDeleting(null); };
  const toggleSel = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSelected(new Set());

  // Real-time audit: when the current user opens a record, log it as an
  // "Opened for review" activity attributed to them (deduped, once per user).
  useEffect(() => {
    if (!viewingId) return;
    setAllEvents(prev => prev.map(e => {
      if (e.id !== viewingId) return e;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((e.activity ?? []).some((a: any) => a.kind === 'viewed' && a.by === currentUserName)) return e;
      const title = e.status === 'review' ? 'Opened for review' : 'Viewed record';
      return { ...e, activity: [...(e.activity ?? []), { id: newActId(), at: nowStamp(), by: currentUserName, kind: 'viewed', title, detail: `${currentUserName} opened this event`, badge: { label: 'Reviewer', tone: ACTIVITY_BADGE_TONE.Reviewer } }] };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingId]);

  // Risk weight per event type — sourced from the editable settings catalog.
  const riskById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of loadTelematicsEventTypes()) map[t.id] = t.riskWeight;
    return map;
  }, []);
  const riskFor = (type: string) => riskById[TYPE_TO_CATALOG[type] ?? type] ?? 0;

  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState<Sev | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<HosVStatus | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [group, setGroup] = useState<GroupId | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [subExpanded, setSubExpanded] = useState(false);

  const [sort, setSort] = useState<SortState | null>(null);
  const toggleSort = (col: ColId) => setSort(s => (s?.col === col ? (s.dir === 'asc' ? { col, dir: 'desc' } : null) : { col, dir: 'asc' }));
  const [visibleCols, setVisibleCols] = useState<Set<ColId>>(() => new Set(COLUMN_DEFS.filter(c => c.defaultOn).map(c => c.id)));
  const toggleCol = (id: ColId) => setVisibleCols(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const showCol = (id: ColId) => visibleCols.has(id);

  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const providers = useMemo(() => Array.from(new Set(allEvents.map(e => e.provider).filter(Boolean))).sort(), [allEvents]);
  const typeOptions = useMemo(
    () => Array.from(new Set(allEvents.map(e => getEventTypeLabel(e.type as string)).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b)),
    [allEvents],
  );

  const kpis = useMemo(() => ({
    total: allEvents.length,
    critical: allEvents.filter(e => e.severity === 'critical').length,
    high: allEvents.filter(e => e.severity === 'high').length,
    review: allEvents.filter(e => e.status === 'review').length,
    resolved: allEvents.filter(e => e.status === 'resolved').length,
    risk: allEvents.reduce((a, e) => a + riskFor(e.type), 0),
  }), [allEvents, riskById]);

  const groupCounts = useMemo(() => {
    const c: Record<string, number> = { all: allEvents.length, harsh: 0, distraction: 0, collision: 0, compliance: 0, camera: 0 };
    for (const e of allEvents) c[groupOf(e.type)]++;
    return c;
  }, [allEvents]);

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEvents.filter(e => {
      if (sevFilter !== 'all' && e.severity !== sevFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (providerFilter !== 'all' && e.provider !== providerFilter) return false;
      if (group !== 'all' && groupOf(e.type) !== group) return false;
      if (q) {
        const hay = `${e.driverName} ${e.vehiclePlate} ${e.trailerId ?? ''} ${e.extensions?.here?.roadName ?? ''} ${getEventTypeLabel(e.type)} ${e.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allEvents, search, sevFilter, statusFilter, providerFilter, group]);

  // Group by display label so near-synonym raw types (e.g. harsh_cornering
  // + harsh_turn → "Harsh Turn") collapse into one entry — the same set the
  // Event Type dropdown offers. `typeFilter` therefore holds a label.
  const typeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    baseFiltered.forEach(e => { const l = getEventTypeLabel(e.type); counts.set(l, (counts.get(l) ?? 0) + 1); });
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [baseFiltered]);

  const filtered = useMemo(
    () => (typeFilter ? baseFiltered.filter(e => getEventTypeLabel(e.type) === typeFilter) : baseFiltered),
    [baseFiltered, typeFilter],
  );

  const sortVal = (e: any, col: ColId): string | number => {
    switch (col) {
      case 'when': return e.startedAt;
      case 'type': return getEventTypeLabel(e.type).toLowerCase();
      case 'driver': return (e.driverName || '').toLowerCase();
      case 'vehicle': return (e.vehiclePlate || '').toLowerCase();
      case 'location': return (e.extensions?.here?.roadName || '').toLowerCase();
      case 'speed': return e.stats?.maximumSpeed ?? 0;
      case 'gforce': return gforceOf(e);
      case 'risk': return riskFor(e.type);
      case 'provider': return (e.provider || '').toLowerCase();
      case 'severity': return SEV_RANK[e.severity] ?? 0;
      case 'resolution': return e.disposition ? HOS_DISPOSITION_BY_ID[e.disposition as HosDisposition].label.toLowerCase() : '';
      case 'status': return SEV_STATUS_RANK[e.status as HosVStatus] ?? 0;
      case 'camera': return hasCamera(e) ? 1 : 0;
      default: return 0;
    }
  };

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortVal(a, sort.col), bv = sortVal(b, sort.col);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort]);

  useEffect(() => { setPage(1); }, [search, sevFilter, statusFilter, providerFilter, group, typeFilter, pageSize]);

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * pageSize;
  const rows = sorted.slice(start, start + pageSize);
  const pageIds = rows.map(e => e.id);
  const allSel = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleAll = () => setSelected(prev => {
    const n = new Set(prev);
    if (allSel) pageIds.forEach(id => n.delete(id)); else pageIds.forEach(id => n.add(id));
    return n;
  });
  const selectedIds = [...selected];

  const kpiAllActive = sevFilter === 'all' && statusFilter === 'all';
  const toggleSev = (s: Sev) => setSevFilter(p => (p === s ? 'all' : s));
  const toggleStatus = (s: HosVStatus) => setStatusFilter(p => (p === s ? 'all' : s));
  const anyFilter = sevFilter !== 'all' || statusFilter !== 'all' || providerFilter !== 'all' || group !== 'all' || typeFilter || search;
  const resetAll = () => { setSearch(''); setSevFilter('all'); setStatusFilter('all'); setProviderFilter('all'); setGroup('all'); setTypeFilter(null); };

  const TABS: { id: GroupId | 'all'; label: string; tone: keyof typeof TAB_TONE; count: number }[] = [
    { id: 'all', label: 'All Events', tone: 'blue', count: groupCounts.all },
    { id: 'harsh', label: 'Harsh Driving', tone: 'red', count: groupCounts.harsh },
    { id: 'distraction', label: 'Distraction', tone: 'violet', count: groupCounts.distraction },
    { id: 'collision', label: 'Collision', tone: 'rose', count: groupCounts.collision },
    { id: 'compliance', label: 'Compliance', tone: 'amber', count: groupCounts.compliance },
    { id: 'camera', label: 'Camera', tone: 'sky', count: groupCounts.camera },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        iconGradient="from-indigo-500 to-violet-600"
        Icon={Activity}
        title="Safety Events"
        subtitle="Telemetry & video safety events from fleet devices & terminals"
        actions={
          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
            <Download size={15} /> Export
          </button>
        }
      />

      <div className="space-y-5 p-4 sm:p-8">
        {/* KPI cards — click to filter */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KpiStatCard label="Total Events" value={kpis.total} Icon={Activity} accent="blue"
            active={kpiAllActive && group === 'all' && providerFilter === 'all' && !typeFilter}
            onClick={() => { resetAll(); }} />
          <KpiStatCard label="Critical" value={kpis.critical} Icon={AlertOctagon} accent="red"
            active={sevFilter === 'critical'} onClick={() => toggleSev('critical')} />
          <KpiStatCard label="High" value={kpis.high} Icon={CircleAlert} accent="rose"
            active={sevFilter === 'high'} onClick={() => toggleSev('high')} />
          <KpiStatCard label="In Review" value={kpis.review} Icon={Flag} accent="amber"
            active={statusFilter === 'review'} onClick={() => toggleStatus('review')} />
          <KpiStatCard label="Closed" value={kpis.resolved} Icon={CheckCircle2} accent="emerald"
            active={statusFilter === 'resolved'} onClick={() => toggleStatus('resolved')} />
          <KpiStatCard label="Risk Score" value={kpis.risk} Icon={Gauge} accent="sky" />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Group tabs */}
          <div className="flex overflow-x-auto border-b border-slate-200">
            {TABS.map(tab => {
              const active = group === tab.id;
              const tone = TAB_TONE[tab.tone];
              return (
                <button key={tab.id} type="button" onClick={() => { setGroup(tab.id); setTypeFilter(null); }}
                  className={cn('group relative flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 transition-colors',
                    active ? tone.active : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800')}>
                  <span className="text-sm font-semibold">{tab.label}</span>
                  <span className={cn('inline-flex h-5 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums', active ? tone.badge : 'bg-slate-100 text-slate-500')}>{tab.count}</span>
                </button>
              );
            })}
          </div>

          {/* Event-type breakdown cards */}
          <div className="border-b border-slate-200 bg-slate-50/40 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Event types in this view</div>
                <div className="text-[11px] text-slate-400">Click a card to narrow the table to that event type</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {typeFilter && (
                  <button type="button" onClick={() => setTypeFilter(null)} className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:opacity-80">Clear type <X size={11} /></button>
                )}
                {typeBreakdown.length > 8 && (
                  <button type="button" onClick={() => setSubExpanded(v => !v)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
                    {subExpanded ? 'Show less' : 'Show all types'}
                    <ChevronDown size={13} className={cn('transition-transform', subExpanded && 'rotate-180')} />
                  </button>
                )}
              </div>
            </div>
            {typeBreakdown.length === 0 ? (
              <div className="py-4 text-center text-[12px] italic text-slate-400">No event types in this view.</div>
            ) : (
              <div className={cn(
                'grid gap-2',
                subExpanded
                  ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 max-h-[240px] overflow-y-auto overscroll-contain pr-1'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
              )}>
                {(subExpanded ? typeBreakdown : typeBreakdown.slice(0, 8)).map((t, i) => {
                  const selected = typeFilter === t.label;
                  const denom = baseFiltered.length || 1;
                  const sharePct = (t.count / denom) * 100;
                  const c = SUBCAT_PALETTE[i % SUBCAT_PALETTE.length];
                  // Compact "mini" card when the full list is expanded — label + count
                  // on one row so many types fit without heavy scrolling.
                  if (subExpanded) {
                    return (
                      <button key={t.label} type="button" onClick={() => setTypeFilter(selected ? null : t.label)} title={`${t.label} — ${t.count} (${sharePct.toFixed(0)}%)`}
                        className={cn('group flex flex-col overflow-hidden rounded-md border text-left shadow-sm transition-all',
                          selected ? 'border-blue-600 ring-2 ring-blue-300/40 bg-white' : cn('border-slate-200 hover:border-slate-300 hover:shadow', c.bg))}>
                        <div className={cn('h-0.5 w-full', selected ? 'bg-blue-500' : c.bar)} />
                        <div className="flex items-center justify-between gap-1.5 px-2 py-1.5">
                          <span className="line-clamp-1 text-[10px] font-semibold leading-tight text-slate-700" title={t.label}>{t.label}</span>
                          <span className={cn('shrink-0 text-[15px] font-bold leading-none tabular-nums', selected ? 'text-blue-700' : c.count)}>{t.count}</span>
                        </div>
                      </button>
                    );
                  }
                  return (
                    <button key={t.label} type="button" onClick={() => setTypeFilter(selected ? null : t.label)} title={`${t.label} — ${t.count}`}
                      className={cn('group flex h-full flex-col overflow-hidden rounded-lg border text-left shadow-sm transition-all',
                        selected ? 'border-blue-600 ring-2 ring-blue-300/40 bg-white' : cn('border-slate-200 hover:border-slate-300 hover:shadow-md', c.bg))}>
                      <div className={cn('h-1 w-full', selected ? 'bg-blue-500' : c.bar)} />
                      <div className="flex flex-1 flex-col px-3 py-2.5">
                        <div className="line-clamp-2 min-h-[2.6em] text-[11px] font-semibold leading-snug text-slate-700" title={t.label}>{t.label}</div>
                        <div className="mt-2 flex items-end justify-between gap-2">
                          <span className={cn('text-[22px] font-bold leading-none tabular-nums', selected ? 'text-blue-700' : c.count)}>{t.count}</span>
                          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ring-1', selected ? 'text-blue-700 bg-white ring-blue-300/40' : c.chip)}>{sharePct.toFixed(0)}%</span>
                        </div>
                        <div className={cn('mt-2 h-1 overflow-hidden rounded-full', selected ? 'bg-slate-100' : c.barBg)}>
                          <div className={cn('h-full rounded-full transition-all', selected ? 'bg-blue-500' : c.bar)} style={{ width: `${Math.min(100, sharePct)}%` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search driver, plate, road, type…"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <span className="hidden shrink-0 items-center text-slate-400 sm:inline-flex"><Filter size={14} /></span>
            <select value={sevFilter} onChange={e => setSevFilter(e.target.value as Sev | 'all')}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as HosVStatus | 'all')}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
              <option value="all">All statuses</option>
              <option value="review">In Review</option>
              <option value="resolved">Closed</option>
            </select>
            <select value={typeFilter ?? 'all'} onChange={e => setTypeFilter(e.target.value === 'all' ? null : e.target.value)}
              title="Filter by event type"
              className="h-9 max-w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
              <option value="all">All event types</option>
              {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
              <option value="all">All sources</option>
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ColumnsDropdown visible={visibleCols} onToggle={toggleCol} />
            <div className="ml-auto flex items-center gap-2">
              {anyFilter && (
                <button type="button" onClick={resetAll} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                  <X size={13} /> Clear
                </button>
              )}
              <span className="shrink-0 text-[12px] font-medium text-slate-400 tabular-nums">{total} of {allEvents.length}</span>
            </div>
          </div>

          {/* Bulk-action bar (multiselect) */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50/70 px-3 py-2.5 sm:px-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-bold text-blue-700 shadow-sm ring-1 ring-blue-200">{selected.size} selected</span>
              <span className="text-[12px] font-medium text-slate-500">Close as:</span>
              <button type="button" onClick={() => setTrainingIds(selectedIds)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-violet-700"><GraduationCap size={14} /> Assign training</button>
              <button type="button" onClick={() => { closeWith(selectedIds, 'warning'); clearSel(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-50"><FileWarning size={14} /> Warning letter</button>
              <button type="button" onClick={() => { closeWith(selectedIds, 'false'); clearSel(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"><Ban size={14} /> Dismiss false</button>
              <button type="button" onClick={() => { reopenMany(selectedIds); clearSel(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw size={14} /> Reopen</button>
              <button type="button" onClick={clearSel} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-50"><X size={13} /> Clear</button>
            </div>
          )}

          {total === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Activity size={22} /></div>
              <p className="text-sm font-semibold text-slate-700">No events {anyFilter ? 'match your filters' : 'recorded yet'}</p>
              <p className="mt-1 text-xs text-slate-400">Try adjusting the filters or search term.</p>
            </div>
          ) : (<>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-max text-left">
                <thead className="border-b border-slate-200 bg-slate-50/60">
                  <tr>
                    <th className="w-10 pl-5 pr-1 py-2.5">
                      <input type="checkbox" checked={allSel} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                    </th>
                    {showCol('when') && <SortTh id="when" label="Date / time" minW="min-w-[118px]" sort={sort} onSort={toggleSort} />}
                    {showCol('type') && <SortTh id="type" label="Event type" minW="min-w-[136px]" sort={sort} onSort={toggleSort} />}
                    {showCol('driver') && <SortTh id="driver" label="Driver" minW="min-w-[150px]" sort={sort} onSort={toggleSort} />}
                    {showCol('vehicle') && <SortTh id="vehicle" label="Truck / Trailer" minW="min-w-[118px]" sort={sort} onSort={toggleSort} />}
                    {showCol('location') && <SortTh id="location" label="Location" minW="min-w-[150px]" sort={sort} onSort={toggleSort} />}
                    {showCol('speed') && <SortTh id="speed" label="Max / limit" minW="min-w-[120px]" align="center" sort={sort} onSort={toggleSort} />}
                    {showCol('gforce') && <SortTh id="gforce" label="G-force" minW="min-w-[80px]" align="center" sort={sort} onSort={toggleSort} />}
                    {showCol('risk') && <SortTh id="risk" label="Risk" minW="min-w-[64px]" align="center" sort={sort} onSort={toggleSort} />}
                    {showCol('provider') && <SortTh id="provider" label="Source" minW="min-w-[92px]" align="center" sort={sort} onSort={toggleSort} />}
                    {showCol('severity') && <SortTh id="severity" label="Severity" minW="min-w-[96px]" align="center" sort={sort} onSort={toggleSort} />}
                    {showCol('resolution') && <SortTh id="resolution" label="Resolution" minW="min-w-[132px]" sort={sort} onSort={toggleSort} />}
                    {showCol('status') && <SortTh id="status" label="Status" minW="min-w-[100px]" sort={sort} onSort={toggleSort} />}
                    {showCol('camera') && <SortTh id="camera" label="Camera" minW="min-w-[90px]" align="center" sort={sort} onSort={toggleSort} />}
                    <th className="sticky right-0 z-[2] min-w-[110px] border-l border-slate-200 bg-slate-100 px-3 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(e => {
                    const when = fmtWhen(e.startedAt);
                    const style = getEventTypeStyle(e.type);
                    const overLimit = (e.stats?.maximumSpeed ?? 0) > (e.stats?.roadSpeedLimit ?? 0);
                    const gf = gforceOf(e);
                    const cam = hasCamera(e);
                    const st = HOS_STATUS_META[e.status as HosVStatus];
                    const isSel = selected.has(e.id);
                    return (
                        <tr key={e.id} onClick={() => setViewingId(e.id)}
                          className={cn('group cursor-pointer border-b border-slate-100 align-middle hover:bg-slate-50/60', isSel && 'bg-blue-50/50')}>
                          <td className="w-10 pl-5 pr-1 py-3" onClick={ev => ev.stopPropagation()}>
                            <input type="checkbox" checked={isSel} onChange={() => toggleSel(e.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                          </td>
                          {showCol('when') && (
                            <td className="px-3 py-3">
                              <div className="whitespace-nowrap text-[13px] font-semibold text-slate-800">{when.date}</div>
                              <div className="text-[11px] tabular-nums text-slate-400">{when.time}</div>
                            </td>
                          )}
                          {showCol('type') && (
                            <td className="px-3 py-3">
                              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', style.bg, style.text, style.border)}>{getEventTypeLabel(e.type)}</span>
                            </td>
                          )}
                          {showCol('driver') && <td className="px-3 py-3"><DriverCell name={e.driverName} /></td>}
                          {showCol('vehicle') && (
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-slate-800"><Truck size={11} className="shrink-0 text-slate-300" /> {e.vehiclePlate}</div>
                              <div className="text-[11px] text-slate-400">{e.trailerId ?? '—'}</div>
                            </td>
                          )}
                          {showCol('location') && (
                            <td className="px-3 py-3">
                              <span className="flex items-center gap-1 text-[12px] text-slate-500" title={e.extensions?.here?.roadName}>
                                <MapPin size={11} className="shrink-0 text-slate-300" />
                                <span className="max-w-[200px] truncate">{e.extensions?.here?.roadName || '—'}</span>
                              </span>
                            </td>
                          )}
                          {showCol('speed') && (
                            <td className="px-3 py-3 text-center">
                              <span className={cn('text-[13px] font-bold font-mono', overLimit ? 'text-red-600' : 'text-slate-700')}>{e.stats?.maximumSpeed}</span>
                              <span className="mx-1 text-xs text-slate-400">/</span>
                              <span className="font-mono text-[13px] text-slate-500">{e.stats?.roadSpeedLimit}</span>
                            </td>
                          )}
                          {showCol('gforce') && (
                            <td className="px-3 py-3 text-center">
                              <span className={cn('font-mono text-[13px] font-bold', gf >= 0.8 ? 'text-red-600' : 'text-slate-600')}>{gf.toFixed(1)}g</span>
                            </td>
                          )}
                          {showCol('risk') && (
                            <td className="px-3 py-3 text-center"><span className="inline-flex min-w-[30px] items-center justify-center rounded-md bg-slate-100 px-2 py-1 text-[12px] font-bold tabular-nums text-slate-700">{riskFor(e.type)}</span></td>
                          )}
                          {showCol('provider') && (
                            <td className="px-3 py-3 text-center"><span className="rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-600">{e.provider}</span></td>
                          )}
                          {showCol('severity') && <td className="px-3 py-3 text-center">{getSeverityBadge(e.severity)}</td>}
                          {showCol('resolution') && (
                            <td className="px-3 py-3">
                              {e.disposition
                                ? (() => { const d = HOS_DISPOSITION_BY_ID[e.disposition as HosDisposition]; return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold', d.tone)}>{d.label}</span>; })()
                                : <span className="text-[11px] text-slate-400">Pending review</span>}
                            </td>
                          )}
                          {showCol('status') && (
                            <td className="px-3 py-3"><span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', st.tone)}><span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', st.dot)} />{st.label}</span></td>
                          )}
                          {showCol('camera') && (
                            <td className="px-3 py-3 text-center">
                              {cam ? <Camera size={15} className="mx-auto text-indigo-500" /> : <span className="text-[11px] text-slate-300">—</span>}
                            </td>
                          )}
                          <td className={cn('sticky right-0 z-[1] border-l border-slate-100 px-3 py-3 pr-5', isSel ? 'bg-blue-50/50' : 'bg-white group-hover:bg-slate-50')}>
                            <div className="flex items-center justify-end gap-1.5" onClick={ev => ev.stopPropagation()}>
                              <button type="button" title="View" onClick={() => setViewingId(e.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
                                <Eye size={14} />
                              </button>
                              <RowActions items={[
                                { label: 'Share to chat', icon: Share2, onClick: () => setShareRecord(sevRef(e)) },
                                { label: 'Assign training', icon: GraduationCap, onClick: () => setTrainingIds([e.id]) },
                                { label: 'Reopen', icon: RotateCcw, onClick: () => reopenMany([e.id]) },
                                { label: 'Delete', icon: Trash2, onClick: () => setDeleting(e), danger: true },
                              ]} />
                            </div>
                          </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Card list (below xl) */}
            <ul className="divide-y divide-slate-100 xl:hidden">
              {rows.map(e => {
                const when = fmtWhen(e.startedAt);
                const style = getEventTypeStyle(e.type);
                const st = HOS_STATUS_META[e.status as HosVStatus];
                const isSel = selected.has(e.id);
                return (
                  <li key={e.id} onClick={() => setViewingId(e.id)} className={cn('cursor-pointer space-y-2 px-4 py-3.5', isSel && 'bg-blue-50/50')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <input type="checkbox" checked={isSel} onClick={ev => ev.stopPropagation()} onChange={() => toggleSel(e.id)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                        <div className="min-w-0">
                          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase', style.bg, style.text, style.border)}>{getEventTypeLabel(e.type)}</span>
                          <p className="mt-1 text-[13px] font-semibold text-slate-800">{e.driverName}</p>
                          <p className="text-[11px] text-slate-400">{e.vehiclePlate} / {e.trailerId ?? '—'} · {e.extensions?.here?.roadName} · {when.date} · {when.time}</p>
                        </div>
                      </div>
                      <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', st.tone)}>{st.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getSeverityBadge(e.severity)}
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"><Gauge size={10} /> Risk {riskFor(e.type)}</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"><Truck size={10} /> {e.stats?.maximumSpeed}/{e.stats?.roadSpeedLimit} km/h</span>
                      {hasCamera(e) && <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600"><Camera size={10} /> Camera</span>}
                      <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600">{e.provider}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        {e.disposition
                          ? (() => { const d = HOS_DISPOSITION_BY_ID[e.disposition as HosDisposition]; return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', d.tone)}>{d.label}</span>; })()
                          : <span className="text-[11px] text-slate-400">Pending review</span>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5" onClick={ev => ev.stopPropagation()}>
                        <button type="button" title="View" onClick={() => setViewingId(e.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"><Eye size={14} /></button>
                        <RowActions items={[
                          { label: 'Share to chat', icon: Share2, onClick: () => setShareRecord(sevRef(e)) },
                          { label: 'Assign training', icon: GraduationCap, onClick: () => setTrainingIds([e.id]) },
                          { label: 'Reopen', icon: RotateCcw, onClick: () => reopenMany([e.id]) },
                          { label: 'Delete', icon: Trash2, onClick: () => setDeleting(e), danger: true },
                        ]} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
              <label className="flex items-center gap-1.5 text-[12px] text-slate-500">Rows per page
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <span className="mr-2 text-[12px] text-slate-500 tabular-nums">{start + 1}–{Math.min(start + pageSize, total)} of {total}</span>
                <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
                <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {pages}</span>
                <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
            </div>
          </>)}
        </div>
      </div>

      {viewing && (
        <SafetyEventModal
          record={viewing}
          riskFor={riskFor}
          onClose={() => setViewingId(null)}
          onAddNote={(t) => addNote(viewing.id, t)}
          onDispose={(disp) => closeWith([viewing.id], disp)}
          onAssignTraining={() => setTrainingIds([viewing.id])}
          onReopen={() => reopenMany([viewing.id])}
          onVerify={() => verify([viewing.id])}
          currentUserName={currentUserName}
          onNavigate={onNavigate}
        />
      )}

      {trainingIds && (
        <SafetyTrainingModal
          count={trainingIds.length}
          onClose={() => setTrainingIds(null)}
          onAssign={(name) => { assignTraining(trainingIds, name); setTrainingIds(null); if (trainingIds.length > 1) clearSel(); }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setDeleting(null)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={18} /></div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800">Delete this event?</h3>
                <p className="mt-1 text-[13px] leading-snug text-slate-500">
                  This removes the <span className="font-semibold text-slate-700">{getEventTypeLabel(deleting.type)}</span> event for <span className="font-semibold text-slate-700">{deleting.driverName}</span>. This can't be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setDeleting(null)} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={confirmDelete} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-rose-700"><Trash2 size={15} /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {shareRecord && (
        <ShareToChat
          open
          onClose={() => setShareRecord(null)}
          title={`Share ${shareRecord.label}`}
          subtitle="Send the record + documents in a chat, or to an outsider by email"
          source={{ type: 'safety-event', id: shareRecord.id, label: shareRecord.label }}
          items={[]}
          record={shareRecord}
          defaultChannel="in-app"
          defaultSubject={shareRecord.label}
          currentUserName={currentUserName}
          onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate?.('/messages'); }}
        />
      )}
    </div>
  );
}
