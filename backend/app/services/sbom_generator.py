import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from app.models.models import Scan, Dependency, Finding


class SBOMGenerator:
    """Generates valid CycloneDX v1.5 JSON documents."""

    @staticmethod
    def generate_cyclonedx_json(scan: Scan, dependencies: List[Dependency], findings: List[Finding]) -> Dict[str, Any]:
        project_name = scan.project.name if scan.project else "SoftwareProject"
        bom_uuid = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        # Build component list
        components: List[Dict[str, Any]] = []
        dep_purl_map: Dict[str, str] = {}

        for dep in dependencies:
            eco = (dep.ecosystem or "npm").lower()
            purl_type = "npm" if "npm" in eco else "pypi"
            version_str = dep.resolved_version or dep.declared_version or "unknown"
            
            # Construct standard Package URL (PURL)
            purl = f"pkg:{purl_type}/{dep.package_name}@{version_str}"
            dep_purl_map[dep.id] = purl

            comp: Dict[str, Any] = {
                "bom-ref": purl,
                "type": "library",
                "name": dep.package_name,
                "version": version_str,
                "purl": purl,
                "scope": "required" if dep.direct_or_transitive == "direct" else "optional",
                "properties": [
                    {"name": "dependency_type", "value": dep.direct_or_transitive},
                    {"name": "ecosystem", "value": dep.ecosystem},
                    {"name": "is_exact_resolved", "value": str(dep.resolved_version is not None).lower()},
                ]
            }
            components.append(comp)

        # Build vulnerabilities list
        vulnerabilities: List[Dict[str, Any]] = []
        seen_advisories = set()

        for finding in findings:
            vuln = finding.vulnerability
            if not vuln or vuln.advisory_id in seen_advisories:
                continue
            seen_advisories.add(vuln.advisory_id)

            affected_purl = dep_purl_map.get(finding.dependency_id)
            affects_list = [{"ref": affected_purl}] if affected_purl else []

            ratings = []
            if vuln.severity:
                rating_obj: Dict[str, Any] = {
                    "severity": vuln.severity.lower() if vuln.severity.lower() in ("critical", "high", "medium", "low") else "unknown"
                }
                if vuln.score is not None:
                    rating_obj["score"] = vuln.score
                    rating_obj["method"] = "CVSSv3"
                if vuln.cvss_vector:
                    rating_obj["vector"] = vuln.cvss_vector
                ratings.append(rating_obj)

            vuln_obj: Dict[str, Any] = {
                "bom-ref": f"vuln-{vuln.advisory_id}",
                "id": vuln.advisory_id,
                "source": {
                    "name": vuln.source or "OSV",
                    "url": f"https://osv.dev/vulnerability/{vuln.advisory_id}"
                },
                "ratings": ratings,
                "description": vuln.summary or "Vulnerability advisory",
                "detail": vuln.details or "",
                "affects": affects_list,
            }
            if vuln.fixed_versions:
                vuln_obj["recommendation"] = f"Upgrade to fixed version: {', '.join(vuln.fixed_versions)}"

            vulnerabilities.append(vuln_obj)

        # CycloneDX root structure
        sbom = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.5",
            "serialNumber": f"urn:uuid:{bom_uuid}",
            "version": 1,
            "metadata": {
                "timestamp": now_iso,
                "tools": [
                    {
                        "vendor": "DependencyShield",
                        "name": "DependencyShield Scanner",
                        "version": scan.scanner_version or "1.0.0",
                    }
                ],
                "component": {
                    "bom-ref": f"app-{scan.project_id}",
                    "type": "application",
                    "name": project_name,
                    "version": "1.0.0",
                },
                "properties": [
                    {"name": "scan_id", "value": scan.id},
                    {"name": "status", "value": scan.status},
                    {"name": "total_dependencies", "value": str(scan.dependency_count)},
                    {"name": "total_findings", "value": str(scan.finding_count)},
                ]
            },
            "components": components,
            "vulnerabilities": vulnerabilities,
            "dependencies": [
                {
                    "ref": f"app-{scan.project_id}",
                    "dependsOn": [c["bom-ref"] for c in components if c.get("scope") == "required"]
                }
            ]
        }

        return sbom
