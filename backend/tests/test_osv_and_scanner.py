import pytest
from unittest.mock import AsyncMock, patch
from app.services.osv_client import OSVClient
from app.services.parsers.base import ParsedDependency
from app.services.scan_engine import ScanEngine
from app.models.models import Project, Scan, Finding, Vulnerability, SBOMArtifact, Report


def test_osv_parse_advisory():
    raw_osv_vuln = {
        "id": "GHSA-p6mc-m468-83gw",
        "summary": "Prototype pollution in lodash",
        "details": "All versions of package lodash prior to 4.17.21 are vulnerable...",
        "aliases": ["CVE-2020-8203"],
        "severity": [
            {
                "type": "CVSS_V3",
                "score": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
            }
        ],
        "database_specific": {
            "severity": "CRITICAL"
        },
        "affected": [
            {
                "package": {"name": "lodash", "ecosystem": "npm"},
                "ranges": [
                    {
                        "type": "SEMVER",
                        "events": [
                            {"introduced": "0"},
                            {"fixed": "4.17.21"}
                        ]
                    }
                ]
            }
        ],
        "references": [
            {"type": "ADVISORY", "url": "https://nvd.nist.gov/vuln/detail/CVE-2020-8203"}
        ]
    }

    parsed = OSVClient.parse_advisory(raw_osv_vuln)
    assert parsed["advisory_id"] == "GHSA-p6mc-m468-83gw"
    assert parsed["severity"] == "Critical"
    assert parsed["score"] == 9.8
    assert "4.17.21" in parsed["fixed_versions"]
    assert len(parsed["references"]) == 1


@pytest.mark.asyncio
async def test_scan_engine_network_failure_marks_scan_failed(db_session, user_a):
    # Setup test project & scan
    project = Project(owner_id=user_a.id, name="Fail Project")
    db_session.add(project)
    db_session.commit()

    scan = Scan(project_id=project.id, status="queued")
    db_session.add(scan)
    db_session.commit()

    # Mock OSV client to simulate network outage
    mock_osv = OSVClient()
    mock_osv.query_batch = AsyncMock(side_effect=RuntimeError("Connection timeout to OSV API"))

    engine = ScanEngine(osv_client=mock_osv)
    manifest = '{"dependencies": {"lodash": "4.17.20"}}'
    await engine.execute_scan(scan.id, manifest, "package.json")

    db_session.refresh(scan)
    assert scan.status == "failed"
    assert "Vulnerability database communication failure" in scan.error_summary
    assert scan.finding_count == 0


@pytest.mark.asyncio
async def test_scan_engine_detects_findings_and_creates_artifacts(db_session, user_a):
    project = Project(owner_id=user_a.id, name="Vulnerable Project")
    db_session.add(project)
    db_session.commit()

    scan = Scan(project_id=project.id, status="queued")
    db_session.add(scan)
    db_session.commit()

    mock_osv = OSVClient()
    mock_osv.query_batch = AsyncMock(return_value={
        "npm:lodash:4.17.20": [
            {
                "id": "GHSA-test-vuln-1",
                "summary": "Prototype Pollution in lodash",
                "database_specific": {"severity": "HIGH"},
                "affected": [
                    {"ranges": [{"events": [{"introduced": "0"}, {"fixed": "4.17.21"}]}]}
                ],
                "references": [{"type": "WEB", "url": "https://example.com/advisory"}]
            }
        ]
    })

    engine = ScanEngine(osv_client=mock_osv)
    manifest = '{"dependencies": {"lodash": "4.17.20"}}'
    await engine.execute_scan(scan.id, manifest, "package.json")

    db_session.refresh(scan)
    assert scan.status == "completed_with_findings"
    assert scan.dependency_count == 1
    assert scan.finding_count == 1
    assert scan.high_count == 1

    # Check findings record
    finding = db_session.query(Finding).filter(Finding.scan_id == scan.id).first()
    assert finding is not None
    assert finding.vulnerability.advisory_id == "GHSA-test-vuln-1"

    # Check SBOM artifact generated
    sbom = db_session.query(SBOMArtifact).filter(SBOMArtifact.scan_id == scan.id).first()
    assert sbom is not None
    assert "CycloneDX" in sbom.content

    # Check reports generated
    reports = db_session.query(Report).filter(Report.scan_id == scan.id).all()
    assert len(reports) == 2  # json and csv
