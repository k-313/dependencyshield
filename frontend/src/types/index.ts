export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  source_type: string;
  created_at: string;
  updated_at: string;
  scan_count: number;
  latest_scan_status: string | null;
  open_vulnerabilities: number;
}

export interface Dependency {
  id: string;
  package_name: string;
  ecosystem: string;
  resolved_version: string | null;
  declared_version: string | null;
  direct_or_transitive: "direct" | "transitive";
  package_metadata?: Record<string, unknown>;
}

export interface Vulnerability {
  id: string;
  advisory_id: string;
  source: string;
  summary: string | null;
  details: string | null;
  severity: "Critical" | "High" | "Medium" | "Low" | "Unknown";
  score: number | null;
  cvss_vector: string | null;
  affected_ranges: unknown[] | null;
  fixed_versions: string[] | null;
  references: { type: string; url: string }[] | null;
  aliases: string[] | null;
  last_updated_at: string;
}

export interface Finding {
  id: string;
  scan_id: string;
  dependency: Dependency;
  vulnerability: Vulnerability;
  status: "open" | "resolved" | "ignored";
  first_detected_at: string;
  last_detected_at: string;
}

export type ScanStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed_with_findings"
  | "incomplete"
  | "failed"
  | "cancelled";

export interface Scan {
  id: string;
  project_id: string;
  status: ScanStatus;
  started_at: string | null;
  completed_at: string | null;
  dependency_count: number;
  finding_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  unknown_count: number;
  error_summary: string | null;
  warnings: string[] | null;
  manifest_name: string | null;
  ecosystem: string | null;
  scanner_version: string;
  created_at: string;
}

export interface ScanDetail extends Scan {
  dependencies: Dependency[];
  findings: Finding[];
}

export interface SBOMResponse {
  id: string;
  scan_id: string;
  format: string;
  checksum: string | null;
  created_at: string;
  content: Record<string, unknown>;
}

export interface ReportItem {
  id: string;
  scan_id: string;
  format: "json" | "csv";
  created_at: string;
}

export interface AIRemediation {
  vulnerability_id: string;
  advisory_id: string;
  package_name: string;
  severity: string;
  summary: string;
  risk_analysis: string;
  remediation_steps: string[];
  upgrade_guidance: string | null;
  is_ai_generated: boolean;
  authoritative_references: string[];
}

export interface DashboardStats {
  total_projects: number;
  total_scans: number;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  unknown_count: number;
  recent_scans: Scan[];
  recent_findings: Finding[];
}
