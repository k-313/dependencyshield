import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityBadge } from "@/components/scans/severity-badge";
import { ScanStatusBadge } from "@/components/scans/scan-status-badge";
import { FindingsTable } from "@/components/scans/findings-table";
import { AIRemediationCard } from "@/components/ai/ai-remediation-card";

describe("SeverityBadge Component", () => {
  it("renders critical severity and score correctly", () => {
    render(<SeverityBadge severity="Critical" score={9.8} />);
    expect(screen.getByText("Critical")).toBeDefined();
    expect(screen.getByText("9.8")).toBeDefined();
  });

  it("renders medium severity with unknown score", () => {
    render(<SeverityBadge severity="Medium" />);
    expect(screen.getByText("Medium")).toBeDefined();
  });
});

describe("ScanStatusBadge Component", () => {
  it("renders completed clean state", () => {
    render(<ScanStatusBadge status="completed" />);
    expect(screen.getByText("Clean (0 Findings)")).toBeDefined();
  });

  it("renders findings detected state", () => {
    render(<ScanStatusBadge status="completed_with_findings" />);
    expect(screen.getByText("Findings Detected")).toBeDefined();
  });

  it("renders scanning state", () => {
    render(<ScanStatusBadge status="running" />);
    expect(screen.getByText("Scanning...")).toBeDefined();
  });

  it("renders scan failed state", () => {
    render(<ScanStatusBadge status="failed" />);
    expect(screen.getByText("Scan Failed")).toBeDefined();
  });
});

describe("FindingsTable Component", () => {
  it("displays accurate empty state note when no findings exist", () => {
    render(<FindingsTable findings={[]} />);
    expect(screen.getByText("No Known Vulnerabilities Identified")).toBeDefined();
    expect(
      screen.getByText(/The completed scan matched 0 known advisories/i)
    ).toBeDefined();
  });
});

describe("AIRemediationCard Component", () => {
  it("renders remediation guidance with risk analysis and action steps", () => {
    const mockRemediation = {
      vulnerability_id: "vuln-1",
      advisory_id: "GHSA-1234-abcd",
      package_name: "lodash",
      severity: "High",
      summary: "Prototype Pollution in lodash",
      risk_analysis: "Severe prototype pollution risk.",
      remediation_steps: [
        "Upgrade lodash to version 4.17.21",
        "Run npm test to verify compatibility",
      ],
      upgrade_guidance: "Upgrade to 4.17.21 or later",
      is_ai_generated: true,
      authoritative_references: ["https://nvd.nist.gov/vuln/detail/CVE-2020-8203"],
    };

    render(<AIRemediationCard remediation={mockRemediation} />);
    expect(screen.getByText("Severe prototype pollution risk.")).toBeDefined();
    expect(screen.getByText("Upgrade lodash to version 4.17.21")).toBeDefined();
    expect(screen.getByText("Upgrade to 4.17.21 or later")).toBeDefined();
    expect(screen.getByText("AI-Assisted (Gemini)")).toBeDefined();
  });
});
