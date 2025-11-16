export interface NonConformity {
  regulationClause: string;
  regulationText: string;
  manualReference: string;
  finding: string;
  severity: 'High' | 'Medium' | 'Low';
  recommendation: string;
}

export interface AuditorQuestion {
  question: string;
  regulationClause: string;
  reasoning: string;
}

export interface VersionChangeFinding {
  clause: string;
  summaryOfChange: string;
  manualCoverage: string;
  recommendation: string;
}

export interface SectionAnalysis {
  moeSection: string;
  status: 'Compliant' | 'Non-Compliant' | 'Partial' | 'Not Covered';
  summary: string;
}

export interface AuditResult {
  summary: string;
  nonConformities: NonConformity[];
  questions: AuditorQuestion[];
  sectionAnalysis: SectionAnalysis[];
  versionChangeAnalysis?: VersionChangeFinding[];
}

export enum AuditStatus {
  Idle,
  Loading,
  Success,
  Error,
}
