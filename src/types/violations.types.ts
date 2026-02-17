// Schema 3.0 Violation Types — Unified CSA / NSC Violation Master Chart

export interface ViolationRegulatoryCodeUSA {
  authority: string;
  cfr: string[];
  description: string;
  statute: string[];
}

export interface ViolationRegulatoryCodeCanada {
  authority: string;
  reference: string[];
  description: string;
  province?: string[];
}

export interface CanadaEnforcement {
  act: string;
  section: string;
  code: string;
  ccmtaCode: string;
  category?: string;
  descriptions: {
    full: string;
    conviction?: string;
    shortForm52?: string;
  };
  points: {
    nsc: number | null;
    revised?: number | null;
    cvor?: {
      raw: string;
      min: number | null;
      max: number | null;
    };
  };
  cvorClassification?: {
    convictionType: string;
    alternativeGroup: string;
  };
  rawSource?: {
    rawLine: string;
    rawMatch: string;
    pdfPage?: number | null;
  };
}

export interface ViolationItem {
  id: string;
  violationCode: string;
  violationDescription: string;
  violationGroup: string;
  severityWeight: { driver: number; carrier: number };
  crashLikelihoodPercent: number | null;
  driverRiskCategory: number;
  inDsms: boolean;
  isOos: boolean;
  regulatoryCodes: {
    usa: ViolationRegulatoryCodeUSA[];
    canada: ViolationRegulatoryCodeCanada[];
  };
  canadaEnforcement: CanadaEnforcement;
  _source?: string;
}

export interface ViolationCategoryStats {
  total: number;
  high_risk: number;
  moderate_risk: number;
  lower_risk: number;
}

export interface ViolationCategory {
  label?: string;
  _stats: ViolationCategoryStats;
  items: ViolationItem[];
}

export interface RiskCategory {
  label: string;
  description: string;
}

export interface OverallStats {
  totalViolations: number;
  highRisk: number;
  moderateRisk: number;
  lowerRisk: number;
}

export interface ViolationData {
  chartName: string;
  schemaVersion: string;
  lastUpdated: string;
  riskCategories: Record<string, RiskCategory>;
  categories: Record<string, ViolationCategory>;
  _overallStats: OverallStats;
}
