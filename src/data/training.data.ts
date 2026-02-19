import type { TrainingType } from "@/types/training.types";

export const TRAINING_TYPES: TrainingType[] = [
  {
    id: "new_hire_orientation",
    name: "New Hire Orientation",
    category: "Onboarding & Company Policy",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 7,
    defaultDeliveryModes: ["in_person", "online", "video", "document_ack"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate", "orientation_ack"] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "one_time",
      notificationRemindersDaysBefore: [30, 7, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 30 days, 7 days, 1 day before."
    },
    tags: ["onboarding", "policy"]
  },
  {
    id: "company_policies_handbook_acknowledgement",
    name: "Company Policies & Handbook Acknowledgement",
    category: "Onboarding & Company Policy",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 14,
    defaultDeliveryModes: ["document_ack", "online"],
    defaultDocuments: { required: true, documentTypeIds: ["handbook_ack"] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["policy", "acknowledgement"]
  },
  {
    id: "hours_of_service_policy_company_rules",
    name: "Hours of Service Policy (Company Rules)",
    category: "Onboarding & Company Policy",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 14,
    defaultDeliveryModes: ["online", "in_person", "video", "document_ack"],
    defaultDocuments: { required: true, documentTypeIds: ["hos_policy_ack", "training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30, 7],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days, 7 days before."
    },
    tags: ["hos", "policy", "compliance"]
  },
  {
    id: "driver_conduct_professionalism",
    name: "Driver Conduct & Professionalism",
    category: "Onboarding & Company Policy",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 30,
    defaultDeliveryModes: ["online", "video", "document_ack", "in_person"],
    defaultDocuments: { required: true, documentTypeIds: ["conduct_ack"] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["conduct", "policy"]
  },
  {
    id: "customer_service_shipper_receiver_procedures",
    name: "Customer Service & Shipper/Receiver Procedures",
    category: "Onboarding & Company Policy",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 45,
    defaultDeliveryModes: ["online", "video", "in_person"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30, 7, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 30 days, 7 days, 1 day before."
    },
    tags: ["customer_service", "procedure"]
  },
  {
    id: "dispatch_communication_procedures",
    name: "Dispatch / Communication Procedures",
    category: "Onboarding & Company Policy",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 14,
    defaultDeliveryModes: ["online", "in_person", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "one_time",
      notificationRemindersDaysBefore: [7, 3, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 7 days, 3 days, 1 day before."
    },
    tags: ["dispatch", "communication"]
  },
  {
    id: "workplace_harassment_prevention",
    name: "Workplace Harassment Prevention",
    category: "Onboarding & Company Policy",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 60,
    defaultDeliveryModes: ["online", "video", "document_ack"],
    defaultDocuments: { required: true, documentTypeIds: ["harassment_policy_ack", "training_certificate"] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["hr", "policy"]
  },

  {
    id: "hours_of_service_hos_rules_training",
    name: "Hours of Service (HOS) Rules Training",
    category: "Regulatory & Compliance",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 30,
    defaultDeliveryModes: ["online", "in_person", "video"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30, 7],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days, 7 days before."
    },
    tags: ["hos", "compliance"]
  },
  {
    id: "eld_training_device_app_usage",
    name: "ELD Training (Device + App Usage)",
    category: "Regulatory & Compliance",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 14,
    defaultDeliveryModes: ["online", "in_person", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "one_time",
      notificationRemindersDaysBefore: [7, 3, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 7 days, 3 days, 1 day before."
    },
    tags: ["eld", "technology", "compliance"]
  },
  {
    id: "dot_roadside_inspection_prep",
    name: "DOT / Roadside Inspection Prep",
    category: "Regulatory & Compliance",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 60,
    defaultDeliveryModes: ["online", "in_person", "video"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["inspection", "dot", "compliance"]
  },
  {
    id: "driver_qualification_file_dqf_requirements_overview",
    name: "Driver Qualification File (DQF) Requirements Overview",
    category: "Regulatory & Compliance",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 30,
    defaultDeliveryModes: ["online", "document_ack"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30, 7, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 30 days, 7 days, 1 day before."
    },
    tags: ["dqf", "compliance"]
  },
  {
    id: "trip_inspection_pre_trip_post_trip_compliance",
    name: "Trip Inspection (Pre-Trip / Post-Trip) Compliance",
    category: "Regulatory & Compliance",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 30,
    defaultDeliveryModes: ["in_person", "video", "online"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["inspection", "dvir", "compliance"]
  },
  {
    id: "cargo_securement_regulations",
    name: "Cargo Securement Regulations",
    category: "Regulatory & Compliance",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 60,
    defaultDeliveryModes: ["in_person", "online", "video"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["cargo", "securement", "compliance"]
  },
  {
    id: "weight_axle_limits_scale_procedures",
    name: "Weight & Axle Limits / Scale Procedures",
    category: "Regulatory & Compliance",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 90,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30, 7, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 30 days, 7 days, 1 day before."
    },
    tags: ["scale", "weight_limits", "compliance"]
  },
  {
    id: "accident_reporting_post_accident_procedure",
    name: "Accident Reporting & Post-Accident Procedure",
    category: "Regulatory & Compliance",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 45,
    defaultDeliveryModes: ["online", "video", "in_person"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["accident", "compliance"]
  },
  {
    id: "recordkeeping_log_audits_carrier_driver",
    name: "Recordkeeping & Log Audits (Carrier + Driver)",
    category: "Regulatory & Compliance",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 90,
    defaultDeliveryModes: ["online"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30, 7, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 30 days, 7 days, 1 day before."
    },
    tags: ["recordkeeping", "audit", "compliance"]
  },

  {
    id: "defensive_driving",
    name: "Defensive Driving",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 60,
    defaultDeliveryModes: ["online", "in_person", "video", "ride_along"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["safety", "driving"]
  },
  {
    id: "space_management_following_distance",
    name: "Space Management & Following Distance",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 90,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [60, 30, 7],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 60 days, 30 days, 7 days before."
    },
    tags: ["safety", "following_distance"]
  },
  {
    id: "speed_management_speeding_prevention",
    name: "Speed Management & Speeding Prevention",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 90,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [60, 30, 7],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 60 days, 30 days, 7 days before."
    },
    tags: ["safety", "speeding"]
  },
  {
    id: "distracted_driving_prevention_phone_incab_tech",
    name: "Distracted Driving Prevention (Phone, In-cab tech)",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 60,
    defaultDeliveryModes: ["online", "video", "in_person"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["safety", "distraction"]
  },
  {
    id: "fatigue_management_alertness",
    name: "Fatigue Management & Alertness",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 60,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [60, 30, 7],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 60 days, 30 days, 7 days before."
    },
    tags: ["safety", "fatigue"]
  },
  {
    id: "winter_driving_safety",
    name: "Winter Driving Safety",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 30,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30, 7, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 30 days, 7 days, 1 day before."
    },
    tags: ["seasonal", "winter"]
  },
  {
    id: "night_driving_safety",
    name: "Night Driving Safety",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 120,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30, 7, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 30 days, 7 days, 1 day before."
    },
    tags: ["safety", "night"]
  },
  {
    id: "mountain_grade_driving_safety",
    name: "Mountain / Grade Driving Safety",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 120,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30, 7, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 30 days, 7 days, 1 day before."
    },
    tags: ["safety", "mountain"]
  },
  {
    id: "backing_parking_safety",
    name: "Backing & Parking Safety",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 60,
    defaultDeliveryModes: ["in_person", "video", "ride_along"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [60, 30, 7],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 60 days, 30 days, 7 days before."
    },
    tags: ["safety", "backing"]
  },
  {
    id: "intersection_urban_driving_safety",
    name: "Intersection & Urban Driving Safety",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 120,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30, 7, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 30 days, 7 days, 1 day before."
    },
    tags: ["safety", "urban"]
  },
  {
    id: "work_zone_safety",
    name: "Work Zone Safety",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 120,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30, 7, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 30 days, 7 days, 1 day before."
    },
    tags: ["safety", "work_zone"]
  },
  {
    id: "railroad_crossing_safety",
    name: "Railroad Crossing Safety",
    category: "Safety & Defensive Driving",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 120,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30, 7, 1],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 30 days, 7 days, 1 day before."
    },
    tags: ["safety", "railroad"]
  },

  {
    id: "tractor_trailer_coupling_uncoupling",
    name: "Tractor/Trailer Coupling & Uncoupling",
    category: "Vehicle, Equipment & Operations",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 30,
    defaultDeliveryModes: ["in_person", "video", "ride_along"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [60, 30, 7],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 60 days, 30 days, 7 days before."
    },
    tags: ["equipment", "operations"]
  },
  {
    id: "air_brake_systems_training",
    name: "Air Brake Systems Training",
    category: "Vehicle, Equipment & Operations",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 30,
    defaultDeliveryModes: ["in_person", "online", "video"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "biennial",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText: "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["air_brakes", "equipment"]
  },

  // ===============================
  // Cargo & Freight Handling
  // ===============================

  {
    id: "cargo_securement_general",
    name: "Cargo Securement (General)",
    category: "Cargo & Freight Handling",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 60,
    defaultDeliveryModes: ["online", "video", "in_person"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["cargo", "securement"]
  },

  {
    id: "flatbed_securement_straps_chains_tarps",
    name: "Flatbed Securement (Straps/Chains/Tarps)",
    category: "Cargo & Freight Handling",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 60,
    defaultDeliveryModes: ["in_person", "video", "ride_along"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["cargo", "flatbed"]
  },

  {
    id: "reefer_load_handling_temperature_compliance",
    name: "Reefer Load Handling & Temperature Compliance",
    category: "Cargo & Freight Handling",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 45,
    defaultDeliveryModes: ["online", "video", "in_person"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30, 7],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 30 days, 7 days before."
    },
    tags: ["cargo", "reefer"]
  },

  {
    id: "fragile_high_value_freight_handling",
    name: "Fragile / High-Value Freight Handling",
    category: "Cargo & Freight Handling",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 90,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminder at 30 days before."
    },
    tags: ["cargo", "high_value"]
  },

  {
    id: "seal_control_anti_theft_procedures",
    name: "Seal Control & Anti-Theft Procedures",
    category: "Cargo & Freight Handling",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 60,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 60 days, 30 days before."
    },
    tags: ["cargo", "security"]
  },

  {
    id: "cross_border_shipment_procedures",
    name: "Cross-Border Shipment Procedures",
    category: "Cargo & Freight Handling",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 60,
    defaultDeliveryModes: ["online", "video", "in_person"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminder at 30 days before."
    },
    tags: ["cross_border", "customs"]
  },


  // ===============================
  // Dangerous Goods / Hazmat
  // ===============================

  {
    id: "hazmat_general_awareness",
    name: "Hazmat General Awareness",
    category: "Dangerous Goods / Hazmat",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 30,
    defaultDeliveryModes: ["online", "in_person", "video"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["hazmat"]
  },

  {
    id: "hazmat_function_specific_training",
    name: "Hazmat Function-Specific Training",
    category: "Dangerous Goods / Hazmat",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 30,
    defaultDeliveryModes: ["in_person", "online", "video"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["hazmat"]
  },

  {
    id: "hazmat_safety_training",
    name: "Hazmat Safety Training",
    category: "Dangerous Goods / Hazmat",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 30,
    defaultDeliveryModes: ["in_person", "online", "video"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["hazmat", "safety"]
  },

  {
    id: "hazmat_security_awareness",
    name: "Hazmat Security Awareness",
    category: "Dangerous Goods / Hazmat",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 30,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["hazmat", "security"]
  },

  {
    id: "spill_response_emergency_procedures",
    name: "Spill Response & Emergency Procedures",
    category: "Dangerous Goods / Hazmat",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 30,
    defaultDeliveryModes: ["in_person", "simulation", "video"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["hazmat", "emergency"]
  },

  {
    id: "placarding_shipping_papers_training",
    name: "Placarding & Shipping Papers Training",
    category: "Dangerous Goods / Hazmat",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 30,
    defaultDeliveryModes: ["online", "video", "in_person"],
    defaultDocuments: { required: true, documentTypeIds: ["training_certificate"] },
    defaultAssessment: { enabled: true, passingScore: 80, maxAttempts: 3 },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [90, 60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 90 days, 60 days, 30 days before."
    },
    tags: ["hazmat", "placarding"]
  },


  // ===============================
  // Security & Theft Prevention
  // ===============================

  {
    id: "cargo_theft_prevention",
    name: "Cargo Theft Prevention",
    category: "Security & Theft Prevention",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 60,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 60 days, 30 days before."
    },
    tags: ["security", "theft"]
  },

  {
    id: "personal_safety_situational_awareness",
    name: "Personal Safety & Situational Awareness",
    category: "Security & Theft Prevention",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 90,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminder at 30 days before."
    },
    tags: ["security", "personal_safety"]
  },

  {
    id: "secure_parking_route_risk_planning",
    name: "Secure Parking / Route Risk Planning",
    category: "Security & Theft Prevention",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 60,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 60 days, 30 days before."
    },
    tags: ["security", "route"]
  },

  {
    id: "chain_of_custody_load_handover_controls",
    name: "Chain of Custody & Load Handover Controls",
    category: "Security & Theft Prevention",
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 90,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: false,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminder at 30 days before."
    },
    tags: ["security", "custody"]
  },

  {
    id: "in_cab_security_keys_documents_devices",
    name: "In-Cab Security (keys, documents, devices)",
    category: "Security & Theft Prevention",
    status: "active",
    defaultMandatory: true,
    defaultDueDays: 60,
    defaultDeliveryModes: ["online", "video"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
      enabled: true,
      monitorBasedOn: "expiry_date",
      renewalRecurrence: "annual",
      notificationRemindersDaysBefore: [60, 30],
      notificationChannels: { email: true, inApp: true, sms: false },
      projectedNotificationScheduleText:
        "Monitor Expiry Date. Reminders at 60 days, 30 days before."
    },
    tags: ["security", "in_cab"]
  }
];

export const TRAINING_CATEGORIES = [
  "Onboarding & Company Policy",
  "Regulatory & Compliance",
  "Safety & Defensive Driving",
  "Vehicle, Equipment & Operations",
  "Cargo & Freight Handling",
  "Dangerous Goods / Hazmat",
  "Security & Theft Prevention"
];
