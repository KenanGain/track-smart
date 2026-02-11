export interface Violation {
  id: string;
  name: string;
  severityWeight: number;
  crashLikelihoodPercent: number;
  driverRiskCategory: number;
  description?: string;
  regulatoryCodes?: {
    usa?: {
      authority: string;
      cfr: string[];
      description?: string;
    }[];
    canada?: {
      authority: string;
      reference: string[];
      description?: string;
    }[];
  };
}

export interface TelemetryEvent {
  id: string;
  name: string;
  linkedViolationId: string;
}

export interface ViolationCategory {
  id: string;
  name: string;
  description: string;
  violations: Violation[];
  telemetrySafetyEvents?: TelemetryEvent[];
}

export interface RiskCategory {
  label: string;
  description: string;
}

export interface ViolationRiskMatrix {
  riskModelVersion: string;
  modelName: string;
  description: string;
  riskCategories: Record<string, RiskCategory>;
  violationCategories: ViolationCategory[];
}
