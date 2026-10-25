import json
import io
import pytest
from app.models.models import Scan, Dependency, Vulnerability, Finding, Project
from app.services.sbom_generator import SBOMGenerator
from app.services.report_generator import ReportGenerator


def test_cyclonedx_sbom_structure(db_session, user_a):
    project = Project(owner_id=user_a.id, name="SBOM Project")
    scan = Scan(project=project, status="completed_with_findings", dependency_count=1, finding_count=1)
    dep = Dependency(
        scan=scan,
        package_name="axios",
        ecosystem="npm",
        resolved_version="0.21.1",
        declared_version="^0.21.1",
        direct_or_transitive="direct",
    )
    vuln = Vulnerability(
        advisory_id="GHSA-42xw-2xvc-cxcp",
        summary="Server-Side Request Forgery in axios",
        severity="High",
        score=7.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
        fixed_versions=["0.21.2"],
    )
    finding = Finding(scan=scan, dependency=dep, vulnerability=vuln, status="open")

    sbom = SBOMGenerator.generate_cyclonedx_json(scan, [dep], [finding])

    assert sbom["bomFormat"] == "CycloneDX"
    assert sbom["specVersion"] == "1.5"
    assert sbom["serialNumber"].startswith("urn:uuid:")
    assert len(sbom["components"]) == 1
    assert sbom["components"][0]["name"] == "axios"
    assert sbom["components"][0]["purl"] == "pkg:npm/axios@0.21.1"

    assert len(sbom["vulnerabilities"]) == 1
    v = sbom["vulnerabilities"][0]
    assert v["id"] == "GHSA-42xw-2xvc-cxcp"
    assert v["ratings"][0]["severity"] == "high"
    assert v["ratings"][0]["score"] == 7.5
    assert "0.21.2" in v["recommendation"]


def test_report_generation_formats(user_a):
    project = Project(owner_id=user_a.id, name="Audit App")
    scan = Scan(project=project, status="completed", dependency_count=2, finding_count=0)
    dep1 = Dependency(scan=scan, package_name="fastapi", ecosystem="PyPI", resolved_version="0.110.0")

    # JSON report
    json_str = ReportGenerator.generate_json_report(scan, [dep1], [])
    data = json.loads(json_str)
    assert "DependencyShield Security Audit Report" in data["report_title"]
    assert data["summary"]["total_dependencies"] == 2
    assert data["summary"]["total_vulnerabilities"] == 0

    # CSV report
    csv_str = ReportGenerator.generate_csv_report(scan, [dep1], [])
    lines = csv_str.strip().splitlines()
    assert len(lines) >= 2
    assert "Scan ID,Project Name,Manifest" in lines[0]
    assert "NO KNOWN VULNERABILITIES DETECTED" in lines[1]


def test_oversized_manifest_upload_rejected(client, db_session, user_a, auth_headers_user_a):
    proj = Project(owner_id=user_a.id, name="Oversized Test")
    db_session.add(proj)
    db_session.commit()

    # Generate 6MB payload (exceeds 5MB limit)
    big_content = b'{"dependencies": {"test": "1.0.0"}}' + b" " * (6 * 1024 * 1024)

    res = client.post(
        "/api/v1/scans",
        data={"project_id": proj.id},
        files={"file": ("package.json", io.BytesIO(big_content), "application/json")},
        headers=auth_headers_user_a,
    )
    assert res.status_code == 413
    assert "exceeds maximum size" in res.json()["detail"]


def test_unsupported_file_upload_rejected(client, db_session, user_a, auth_headers_user_a):
    proj = Project(owner_id=user_a.id, name="Unsupported Test")
    db_session.add(proj)
    db_session.commit()

    res = client.post(
        "/api/v1/scans",
        data={"project_id": proj.id},
        files={"file": ("malicious.exe", b"MZ...", "application/octet-stream")},
        headers=auth_headers_user_a,
    )
    assert res.status_code == 400
    assert "Unsupported manifest file" in res.json()["detail"]
