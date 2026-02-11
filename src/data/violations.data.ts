import type { ViolationRiskMatrix } from "@/types/violations.types";

export const VIOLATION_RISK_MATRIX: ViolationRiskMatrix = {
  "riskModelVersion": "1.1",
  "modelName": "Driver Violation Risk Matrix",
  "description": "Risk configuration grouped by violation category. Each violation has a severity weight, a crash likelihood percentage, and a driver risk category (probability to cause crash in next 12 months).",

  "riskCategories": {
    "1": {
      "label": "High Risk",
      "description": "Highest crash probability / requires urgent action, coaching, or restriction."
    },
    "2": {
      "label": "Moderate Risk",
      "description": "Elevated risk / requires monitoring and corrective training."
    },
    "3": {
      "label": "Lower Risk",
      "description": "Mostly compliance/maintenance-related or lower crash correlation (but still important)."
    }
  },

  "violationCategories": [
    {
      "id": "unsafe_driving",
      "name": "Unsafe Driving",
      "description": "Driver behavior violations tied directly to unsafe operations and high crash likelihood.",
      "violations": [
        {
          "id": "reckless_or_careless_driving_conviction",
          "name": "Reckless or Careless Driving Conviction",
          "severityWeight": 10,
          "crashLikelihoodPercent": 200,
          "driverRiskCategory": 1,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["392.2"], "description": "Failure to obey state/local laws" }],
            "canada": [{ "authority": "Provincial HTA", "reference": ["HTA s.130 (Ontario)"], "description": "Careless Driving" }]
          }
        },
        {
          "id": "improper_turn_violation",
          "name": "Improper Turn Violation",
          "severityWeight": 10,
          "crashLikelihoodPercent": 114,
          "driverRiskCategory": 1,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["392.2"], "description": "Improper maneuver" }]
          }
        },
        {
          "id": "failure_to_yield_right_of_way",
          "name": "Failure to Yield Right of Way",
          "severityWeight": 10,
          "crashLikelihoodPercent": 101,
          "driverRiskCategory": 1,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["392.2"], "description": "Right of way violations" }],
            "canada": [{ "authority": "Provincial HTA", "reference": ["HTA s.136"], "description": "Fail to Yield" }]
          }
        },
        {
          "id": "improper_lane_erratic_lane_change_fail_to_signal",
          "name": "Improper Lane, Erratic Lane Change, Passing or Fail To Signal",
          "severityWeight": 8,
          "crashLikelihoodPercent": 83,
          "driverRiskCategory": 2,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["392.2"], "description": "Unsafe lane movement" }]
          }
        },
        {
          "id": "inattentive_or_unsafe_driving_conviction",
          "name": "Inattentive or Unsafe Driving Conviction",
          "severityWeight": 7,
          "crashLikelihoodPercent": 69,
          "driverRiskCategory": 2,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["392.2"], "description": "Careless driving / Inattentive" }]
          }
        },
        {
          "id": "following_too_close",
          "name": "Following too Close",
          "severityWeight": 5,
          "crashLikelihoodPercent": 46,
          "driverRiskCategory": 2,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["392.14"], "description": "Hazardous conditions" }],
            "canada": [{ "authority": "Provincial HTA", "reference": ["HTA s.158"], "description": "Following Too Close" }]
          }
        },
        {
          "id": "any_other_moving_violation_seatbelt",
          "name": "Any Other Moving Violation, Seatbelt",
          "severityWeight": 5,
          "crashLikelihoodPercent": 43,
          "driverRiskCategory": 2,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["392.16"], "description": "Seat belt usage" }],
            "canada": [{ "authority": "Provincial HTA", "reference": ["HTA s.106"], "description": "Seatbelt" }]
          }
        },
        {
          "id": "failure_to_obey_traffic_control_device",
          "name": "Failure to Obey Traffic Control Device",
          "severityWeight": 3,
          "crashLikelihoodPercent": 30,
          "driverRiskCategory": 2,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["392.2"], "description": "Signs & signals" }]
          }
        },
        {
          "id": "disqualified_driver",
          "name": "Disqualified Driver",
          "severityWeight": 4,
          "crashLikelihoodPercent": 44,
          "driverRiskCategory": 3,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["383.51"], "description": "Driving while disqualified" }]
          }
        },
        {
          "id": "speeding_or_no_speed_limiter_set",
          "name": "Speeding violation or No Speed Limiter Set",
          "severityWeight": 4,
          "crashLikelihoodPercent": 45,
          "driverRiskCategory": 2,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["392.2"], "description": "Speed law violation" }],
            "canada": [{ "authority": "Provincial HTA", "reference": ["HTA s.128"], "description": "Speeding" }]
          }
        },
        {
          "id": "past_crash",
          "name": "Past Crash",
          "severityWeight": 8,
          "crashLikelihoodPercent": 74,
          "driverRiskCategory": 2,
           "description": "Historical record of a crash event."
        },
        {
          "id": "handheld_device_distracted_driving",
          "name": "Handheld Device - Distracted Driving",
          "severityWeight": 10,
          "crashLikelihoodPercent": 200,
          "driverRiskCategory": 1,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["392.80", "392.82"], "description": "Handheld mobile phone and texting while driving" }],
            "canada": [{ "authority": "Provincial HTA + NSC", "reference": ["HTA s.78.1", "NSC Standard 9"], "description": "Distracted driving and fatigue-related enforcement" }]
          }
        },
        {
          "id": "documentation_licensing_medical_certificate_violation",
          "name": "Documentation, Licensing or Medical Certificate Violation",
          "severityWeight": 1,
          "crashLikelihoodPercent": 18,
          "driverRiskCategory": 3,
           "description": "Missing or expired administrative documents."
        }
      ],
      "telemetrySafetyEvents": [
        { "id": "speeding", "name": "Speeding", "linkedViolationId": "speeding_or_no_speed_limiter_set" },
        { "id": "harsh_acceleration", "name": "Harsh Acceleration", "linkedViolationId": "inattentive_or_unsafe_driving_conviction" },
        { "id": "harsh_brake", "name": "Harsh Break", "linkedViolationId": "following_too_close" },
        { "id": "harsh_turn", "name": "Harsh Turn", "linkedViolationId": "improper_lane_erratic_lane_change_fail_to_signal" },
        { "id": "crash", "name": "Crash", "linkedViolationId": "past_crash" },
        { "id": "seat_belt_violation", "name": "Seat Belt Violation", "linkedViolationId": "any_other_moving_violation_seatbelt" },
        { "id": "cell_phone", "name": "Cell_phone", "linkedViolationId": "handheld_device_distracted_driving" },
        { "id": "eating_and_drinking", "name": "eating and drinking", "linkedViolationId": "handheld_device_distracted_driving" },
        { "id": "camera_obstruction", "name": "Camera Obstruction", "linkedViolationId": "inattentive_or_unsafe_driving_conviction" },
        { "id": "unsafe_lane_change", "name": "unsafe lane change", "linkedViolationId": "improper_lane_erratic_lane_change_fail_to_signal" },
        { "id": "smoking", "name": "Smoking", "linkedViolationId": "handheld_device_distracted_driving" },
        { "id": "drowsiness", "name": "Drowsiness", "linkedViolationId": "inattentive_or_unsafe_driving_conviction" },
        { "id": "distracted_driving", "name": "Distracted Driving", "linkedViolationId": "handheld_device_distracted_driving" },
        { "id": "tailgating", "name": "tailgating", "linkedViolationId": "following_too_close" },
        { "id": "stop_sign_violation", "name": "Stop Sign Violation", "linkedViolationId": "failure_to_obey_traffic_control_device" },
        { "id": "near_crash", "name": "Near Crash", "linkedViolationId": "past_crash" },
        { "id": "red_light_violation", "name": "Red Light Violation", "linkedViolationId": "failure_to_obey_traffic_control_device" },
        { "id": "rolling_stop", "name": "Rolling Stop", "linkedViolationId": "failure_to_obey_traffic_control_device" },
        { "id": "unsafe_parking", "name": "unsafe Parking", "linkedViolationId": "failure_to_obey_traffic_control_device" }
      ]
    },

    {
      "id": "hours_of_service_compliance",
      "name": "Hours-of-service Compliance",
      "description": "Fatigue and HOS compliance violations impacting alertness and crash probability.",
      "violations": [
        {
          "id": "hos_fatigued_related",
          "name": "Hours of Service - Fatigued related",
          "severityWeight": 10,
          "crashLikelihoodPercent": 200,
          "driverRiskCategory": 1,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["392.3"], "description": "Fatigued Driving" }],
            "canada": [{ "authority": "NSC", "reference": ["NSC Standard 9"], "description": "Fatigued Driving" }]
          }
        },
        {
          "id": "any_other_hos_violation",
          "name": "Any other HoS Violation",
          "severityWeight": 5,
          "crashLikelihoodPercent": 50,
          "driverRiskCategory": 2,
          "regulatoryCodes": {
             "usa": [{ "authority": "FMCSA", "cfr": ["395.8", "395.3(a)"], "description": "Logbook Violations / Driving Time Limits" }],
             "canada": [{ "authority": "NSC", "reference": ["NSC Standard 9", "SOR/2005-313"], "description": "Logbook Errors / Driving Time Exceeded" }]
          }
        }
      ]
    },

    {
      "id": "vehicle_maintenance",
      "name": "Vehicle Maintenance",
      "description": "Vehicle condition and inspection-related issues that affect safety and compliance.",
      "violations": [
        {
          "id": "any_oos_violation",
          "name": "Any OOS violation",
          "severityWeight": 10,
          "crashLikelihoodPercent": 29,
          "driverRiskCategory": 3,
          "regulatoryCodes": {
             "usa": [{ "authority": "FMCSA", "cfr": ["396.7"], "description": "Out of Service Defect" }],
             "canada": [{ "authority": "CVSA", "reference": ["CVSA OOS Criteria"], "description": "Out of Service Defect" }]
          }
        },
        {
          "id": "size_or_weight_violation",
          "name": "Size or Weight violation",
          "severityWeight": 7,
          "crashLikelihoodPercent": 20,
          "driverRiskCategory": 3
        },
        {
          "id": "inspection_dvir_or_schedule_1",
          "name": "Inspection, DVIR or Schedule 1",
          "severityWeight": 6,
          "crashLikelihoodPercent": 18,
          "driverRiskCategory": 3,
          "regulatoryCodes": {
             "usa": [{ "authority": "FMCSA", "cfr": ["396.11", "396.13"], "description": "Inspection/DVIR" }],
             "canada": [{ "authority": "NSC", "reference": ["NSC Standard 11", "Schedule 1"], "description": "Vehicle Inspections / Defects" }]
          }
        },
        {
          "id": "non_oos_defect",
          "name": "Non-OOS Defect",
          "severityWeight": 3,
          "crashLikelihoodPercent": 18,
          "driverRiskCategory": 3
        },
        {
          "id": "non_defect",
          "name": "Non-Defect",
          "severityWeight": 3,
          "crashLikelihoodPercent": 18,
          "driverRiskCategory": 3
        },
        {
          "id": "load_securement_violation",
          "name": "Load Securement Violation",
          "severityWeight": 3,
          "crashLikelihoodPercent": 16,
          "driverRiskCategory": 3,
          "regulatoryCodes": {
             "usa": [{ "authority": "FMCSA", "cfr": ["393.100 – 393.136"], "description": "Load Securement" }],
             "canada": [{ "authority": "NSC", "reference": ["NSC Standard 10"], "description": "Load Securement" }]
          }
        }
      ]
    },

    {
      "id": "controlled_substances_drug_and_alcohol",
      "name": "Controlled Substances (Drug and Alcohol)",
      "description": "Drug and alcohol violations with major safety impact and strict compliance requirements.",
      "violations": [
        {
          "id": "drug_or_alcohol_use_related",
          "name": "Drug or Alcohol - Use Related",
          "severityWeight": 10,
          "crashLikelihoodPercent": 200,
          "driverRiskCategory": 1,
          "regulatoryCodes": {
             "usa": [{ "authority": "FMCSA", "cfr": ["382.201", "382.211", "392.4"], "description": "Drug/Alcohol Use, Possession, Refusal" }],
             "canada": [{ "authority": "Criminal Code / NSC", "reference": ["CCC 320.14"], "description": "Impaired Operation" }]
          }
        },
        {
          "id": "drug_or_alcohol_possession_related",
          "name": "Drug or Alcohol - Possession Related",
          "severityWeight": 5,
          "crashLikelihoodPercent": 29,
          "driverRiskCategory": 3,
          "regulatoryCodes": {
             "usa": [{ "authority": "FMCSA", "cfr": ["392.4"], "description": "Possession" }],
             "canada": [{ "authority": "Criminal Code", "reference": ["Criminal Code"], "description": "Possession" }]
          }
        }
      ]
    },

    {
      "id": "hazardous_materials_compliance",
      "name": "Hazardous Materials Compliance",
      "description": "Hazmat/TDG compliance violations tied to labeling, documentation, and transport regulations.",
      "violations": [
        {
          "id": "tdg_hazmat_marking_or_documentation",
          "name": "TDG/Hazmat - Marking or Documentation",
          "severityWeight": 5,
          "crashLikelihoodPercent": 18,
          "driverRiskCategory": 3,
          "regulatoryCodes": {
            "usa": [{ "authority": "FMCSA", "cfr": ["172 Subpart D", "172.200"], "description": "Hazmat Marking / Documentation" }],
            "canada": [{ "authority": "TDG", "reference": ["Part 3", "Part 4"], "description": "Marking/Labels, Shipping Docs, Placards" }]
          }
        }
      ]
    }
  ]
};
