import csv
import io
import json
from datetime import datetime, timezone
from typing import List
from app.models.models import Scan, Dependency, Finding


class ReportGenerator:
    """Generates structured JSON and RFC-4180 compliant CSV reports."""

    @staticmethod
    def generate_json_report(scan: Scan, dependencies: List[Dependency], findings: List[Finding]) -> str:
        project_name = scan.project.name if scan.project else "Unknown Project"
        
        findings_data = []
        for f in findings:
            vuln = f.vulnerability
            dep = f.dependency
            findings_data.append({
                "finding_id": f.id,
                "status": f.status,
                "package_name": dep.package_name if dep else "Unknown",
                "ecosystem": dep.ecosystem if dep else "Unknown",
                "resolved_version": dep.resolved_version if dep else None,
                "declared_version": dep.declared_version if dep else None,
                "advisory_id": vuln.advisory_id if vuln else "Unknown",
                "severity": vuln.severity if vuln else "Unknown",
                "cvss_score": vuln.score if vuln else None,
                "summary": vuln.summary if vuln else "",
                "fixed_versions": vuln.fixed_versions if vuln else [],
                "references": [r.get("url") for r in (vuln.references or []) if isinstance(r, dict)],
                "first_detected_at": f.first_detected_at.isoformat() if f.first_detected_at else None,
            })

        report_dict = {
            "report_title": f"DependencyShield Security Audit Report - {project_name}",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "scan_metadata": {
                "scan_id": scan.id,
                "project_id": scan.project_id,
                "project_name": project_name,
                "status": scan.status,
                "scanner_version": scan.scanner_version,
                "manifest_scanned": scan.manifest_name,
                "ecosystem": scan.ecosystem,
                "started_at": scan.started_at.isoformat() if scan.started_at else None,
                "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
                "warnings": scan.warnings or [],
            },
            "summary": {
                "total_dependencies": scan.dependency_count,
                "total_vulnerabilities": scan.finding_count,
                "severity_breakdown": {
                    "critical": scan.critical_count,
                    "high": scan.high_count,
                    "medium": scan.medium_count,
                    "low": scan.low_count,
                    "unknown": scan.unknown_count,
                }
            },
            "findings": findings_data,
        }
        return json.dumps(report_dict, indent=2)

    @staticmethod
    def generate_csv_report(scan: Scan, dependencies: List[Dependency], findings: List[Finding]) -> str:
        project_name = scan.project.name if scan.project else "Unknown Project"
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        # Header row
        writer.writerow([
            "Scan ID",
            "Project Name",
            "Manifest",
            "Ecosystem",
            "Package Name",
            "Resolved Version",
            "Declared Version",
            "Dependency Type",
            "Advisory ID",
            "Severity",
            "CVSS Score",
            "Fixed Versions",
            "Summary",
            "References",
            "Finding Status",
        ])

        if not findings:
            # If no findings, output empty row or summary
            writer.writerow([
                scan.id,
                project_name,
                scan.manifest_name or "",
                scan.ecosystem or "",
                "NO KNOWN VULNERABILITIES DETECTED",
                "",
                "",
                "",
                "NONE",
                "CLEAN",
                "0.0",
                "N/A",
                "No known vulnerabilities identified in this scan",
                "",
                "resolved",
            ])
        else:
            for f in findings:
                vuln = f.vulnerability
                dep = f.dependency
                fixed_str = ", ".join(vuln.fixed_versions) if vuln and vuln.fixed_versions else "None specified"
                ref_str = "; ".join([r.get("url", "") for r in (vuln.references or []) if isinstance(r, dict)]) if vuln else ""
                
                writer.writerow([
                    scan.id,
                    project_name,
                    scan.manifest_name or "",
                    dep.ecosystem if dep else "",
                    dep.package_name if dep else "",
                    dep.resolved_version or "Unresolved",
                    dep.declared_version or "Unspecified",
                    dep.direct_or_transitive if dep else "",
                    vuln.advisory_id if vuln else "",
                    vuln.severity if vuln else "Unknown",
                    vuln.score if vuln and vuln.score is not None else "N/A",
                    fixed_str,
                    vuln.summary if vuln else "",
                    ref_str,
                    f.status,
                ])

        return output.getvalue()
