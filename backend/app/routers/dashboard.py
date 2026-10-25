from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import User, Project, Scan, Finding, Dependency, Vulnerability
from app.schemas.schemas import (
    DashboardStatsResponse,
    ScanResponse,
    FindingResponse,
    DependencyResponse,
    VulnerabilityResponse,
)
from app.core.auth_middleware import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Total projects owned
    total_projects = (
        db.query(func.count(Project.id))
        .filter(Project.owner_id == current_user.id)
        .scalar()
        or 0
    )

    # Scans owned
    scans_query = (
        db.query(Scan)
        .join(Project, Scan.project_id == Project.id)
        .filter(Project.owner_id == current_user.id)
    )
    total_scans = scans_query.count()

    # Open findings across user's projects
    findings_query = (
        db.query(Finding)
        .join(Scan, Finding.scan_id == Scan.id)
        .join(Project, Scan.project_id == Project.id)
        .filter(Project.owner_id == current_user.id)
        .filter(Finding.status == "open")
    )
    total_vulnerabilities = findings_query.count()

    # Severity distribution
    crit = 0
    high = 0
    med = 0
    low = 0
    unk = 0

    all_open_findings = findings_query.all()
    for f in all_open_findings:
        sev = (f.vulnerability.severity or "Unknown").capitalize()
        if sev == "Critical":
            crit += 1
        elif sev == "High":
            high += 1
        elif sev == "Medium":
            med += 1
        elif sev == "Low":
            low += 1
        else:
            unk += 1

    # Recent scans (up to 5)
    recent_scans = (
        scans_query.order_by(Scan.created_at.desc())
        .limit(5)
        .all()
    )

    # Recent findings (up to 5)
    recent_findings = (
        findings_query.order_by(Finding.first_detected_at.desc())
        .limit(5)
        .all()
    )

    return DashboardStatsResponse(
        total_projects=total_projects,
        total_scans=total_scans,
        total_vulnerabilities=total_vulnerabilities,
        critical_count=crit,
        high_count=high,
        medium_count=med,
        low_count=low,
        unknown_count=unk,
        recent_scans=[ScanResponse.model_validate(s) for s in recent_scans],
        recent_findings=[
            FindingResponse(
                id=f.id,
                scan_id=f.scan_id,
                dependency=DependencyResponse.model_validate(f.dependency),
                vulnerability=VulnerabilityResponse.model_validate(f.vulnerability),
                status=f.status,
                first_detected_at=f.first_detected_at,
                last_detected_at=f.last_detected_at,
            )
            for f in recent_findings
        ],
    )
