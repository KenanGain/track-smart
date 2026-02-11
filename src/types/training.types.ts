export type TrainingStatus = 'active' | 'inactive';

export type DeliveryMode =
  | 'in_person'
  | 'online'
  | 'video'
  | 'document_ack'
  | 'ride_along'
  | 'simulation';

export type RenewalRecurrence =
  | 'one_time'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | 'biennial';

export interface TrainingAssessment {
  enabled: boolean;
  passingScore: number | null;
  maxAttempts: number | null;
}

export interface TrainingDocuments {
  required: boolean;
  documentTypeIds: string[];
}

export interface NotificationChannels {
  email: boolean;
  inApp: boolean;
  sms: boolean;
}

export interface MonitoringNotifications {
  enabled: boolean;
  monitorBasedOn: 'expiry_date' | 'issue_date';
  renewalRecurrence: RenewalRecurrence;
  notificationRemindersDaysBefore: number[];
  notificationChannels: NotificationChannels;
  projectedNotificationScheduleText: string;
}

export interface TrainingType {
  id: string;
  name: string;
  category: string;
  status: TrainingStatus;
  defaultMandatory: boolean;
  defaultDueDays: number;
  defaultDeliveryModes: DeliveryMode[];
  defaultDocuments: TrainingDocuments;
  defaultAssessment: TrainingAssessment;
  monitoringNotifications: MonitoringNotifications;
  tags: string[];
}
