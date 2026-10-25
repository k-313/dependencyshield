import io
import time
import pytest
from app.models.models import Scan


def test_full_e2e_scanner_workflow(client, db_session):
    # Step 1: Register a new user
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": "e2e_analyst@dependencyshield.io", "password": "SecurePassword123!"},
    )
    assert reg_res.status_code == 201
    auth_data = reg_res.json()
    token = auth_data["access_token"]
    user_id = auth_data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: Sign in (verify login credentials)
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "e2e_analyst@dependencyshield.io", "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200

    # Step 3: Create a new project
    proj_res = client.post(
        "/api/v1/projects",
        json={"name": "E2E Production App", "description": "Web service with npm dependencies"},
        headers=headers,
    )
    assert proj_res.status_code == 201
    project = proj_res.json()
    project_id = project["id"]
    assert project["name"] == "E2E Production App"

    # Step 4 & 5: Upload a supported dependency manifest and start a scan
    # Real manifest with pinned versions (e.g. lodash 4.17.20 which has known GHSAs)
    sample_manifest = """{
        "name": "e2e-service",
        "lockfileVersion": 3,
        "packages": {
            "": {
                "name": "e2e-service",
                "dependencies": {
                    "lodash": "^4.17.20"
                }
            },
            "node_modules/lodash": {
                "version": "4.17.20",
                "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz"
            }
        }
    }"""

    scan_post_res = client.post(
        "/api/v1/scans",
        data={"project_id": project_id},
        files={"file": ("package-lock.json", io.BytesIO(sample_manifest.encode("utf-8")), "application/json")},
        headers=headers,
    )
    assert scan_post_res.status_code == 202
    scan_meta = scan_post_res.json()
    scan_id = scan_meta["scan_id"]
    assert scan_meta["status"] == "queued"

    # Step 6: Query scan status
    # In TestClient, BackgroundTasks run before the response is returned to client!
    # Let's verify scan details
    scan_detail_res = client.get(f"/api/v1/scans/{scan_id}", headers=headers)
    assert scan_detail_res.status_code == 200
    scan_detail = scan_detail_res.json()
    assert scan_detail["status"] in ("completed", "completed_with_findings")
    assert scan_detail["dependency_count"] >= 1

    # Step 7: View actual findings
    findings_res = client.get(f"/api/v1/scans/{scan_id}/findings", headers=headers)
    assert findings_res.status_code == 200
    findings = findings_res.json()
    assert isinstance(findings, list)

    # Step 8: Open vulnerability details and remediation endpoint
    if findings:
        vuln_id = findings[0]["vulnerability"]["id"]
        vuln_res = client.get(f"/api/v1/vulnerabilities/{vuln_id}", headers=headers)
        assert vuln_res.status_code == 200
        assert vuln_res.json()["id"] == vuln_id

        # Remediation advice
        rem_res = client.get(f"/api/v1/vulnerabilities/{vuln_id}/remediation", headers=headers)
        assert rem_res.status_code == 200
        rem_data = rem_res.json()
        assert "remediation_steps" in rem_data
        assert len(rem_data["remediation_steps"]) >= 1

    # Step 9: Generate and inspect SBOM
    sbom_res = client.get(f"/api/v1/scans/{scan_id}/sbom", headers=headers)
    assert sbom_res.status_code == 200
    sbom_data = sbom_res.json()
    assert sbom_data["format"] == "cyclonedx-json"
    assert sbom_data["content"]["bomFormat"] == "CycloneDX"

    # Download SBOM file
    sbom_dl_res = client.get(f"/api/v1/scans/{scan_id}/sbom/download", headers=headers)
    assert sbom_dl_res.status_code == 200
    assert "attachment" in sbom_dl_res.headers.get("Content-Disposition", "")

    # Step 10: Generate and download report
    report_gen_res = client.post(f"/api/v1/scans/{scan_id}/reports?format=csv", headers=headers)
    assert report_gen_res.status_code == 201
    report_id = report_gen_res.json()["id"]

    report_dl_res = client.get(f"/api/v1/reports/{report_id}/download", headers=headers)
    assert report_dl_res.status_code == 200
    assert "text/csv" in report_dl_res.headers.get("Content-Type", "")

    # Step 11: Sign out
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # Step 12: Verify that protected data cannot be accessed without authorization
    unauth_proj_res = client.get(f"/api/v1/projects/{project_id}")
    assert unauth_proj_res.status_code == 401

    unauth_scan_res = client.get(f"/api/v1/scans/{scan_id}")
    assert unauth_scan_res.status_code == 401
