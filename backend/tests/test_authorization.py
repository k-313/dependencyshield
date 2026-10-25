from app.models.models import Project, Scan, Report, SBOMArtifact


def test_cross_user_project_access_rejected(client, db_session, user_a, user_b, auth_headers_user_b):
    # Create project owned by User A
    proj_a = Project(owner_id=user_a.id, name="User A Confidential App")
    db_session.add(proj_a)
    db_session.commit()
    db_session.refresh(proj_a)

    # User B attempts to access User A's project
    res = client.get(f"/api/v1/projects/{proj_a.id}", headers=auth_headers_user_b)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

    # User B attempts to update User A's project
    update_res = client.patch(
        f"/api/v1/projects/{proj_a.id}",
        json={"name": "Hacked Name"},
        headers=auth_headers_user_b,
    )
    assert update_res.status_code == 403

    # User B attempts to delete User A's project
    del_res = client.delete(f"/api/v1/projects/{proj_a.id}", headers=auth_headers_user_b)
    assert del_res.status_code == 403


def test_cross_user_scan_and_artifact_access_rejected(
    client, db_session, user_a, user_b, auth_headers_user_b
):
    proj_a = Project(owner_id=user_a.id, name="User A App")
    db_session.add(proj_a)
    db_session.commit()

    scan_a = Scan(project_id=proj_a.id, status="completed")
    db_session.add(scan_a)
    db_session.commit()

    report_a = Report(scan_id=scan_a.id, format="json", content="{}")
    db_session.add(report_a)

    sbom_a = SBOMArtifact(scan_id=scan_a.id, format="cyclonedx-json", content="{}")
    db_session.add(sbom_a)
    db_session.commit()

    # User B tries to get User A's scan
    res_scan = client.get(f"/api/v1/scans/{scan_a.id}", headers=auth_headers_user_b)
    assert res_scan.status_code == 403

    # User B tries to download User A's report
    res_rep = client.get(f"/api/v1/reports/{report_a.id}/download", headers=auth_headers_user_b)
    assert res_rep.status_code == 403

    # User B tries to download User A's SBOM
    res_sbom = client.get(f"/api/v1/scans/{scan_a.id}/sbom/download", headers=auth_headers_user_b)
    assert res_sbom.status_code == 403


def test_unauthenticated_requests_rejected(client):
    endpoints = [
        ("GET", "/api/v1/projects"),
        ("POST", "/api/v1/projects"),
        ("GET", "/api/v1/scans"),
        ("GET", "/api/v1/dashboard/stats"),
        ("GET", "/api/v1/vulnerabilities"),
        ("GET", "/api/v1/reports"),
    ]
    for method, path in endpoints:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json={})
        assert res.status_code == 401
