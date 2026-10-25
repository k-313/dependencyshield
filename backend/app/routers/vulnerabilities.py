from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, Project, Scan, Finding, Dependency, Vulnerability
from app.schemas.schemas import (
    VulnerabilityResponse,
    FindingResponse,
    DependencyResponse,
    AIRemediationResponse,
)
from app.core.auth_middleware import get_current_user
from app.services.ai_advisor import AIAdvisor

router = APIRouter(prefix="/vulnerabilities", tags=["Vulnerabilities"])
ai_advisor = AIAdvisor()


@router.get("", response_model=List[VulnerabilityResponse])
def list_vulnerabilities(
    severity: Optional[str] = Query(None),
    ecosystem: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Query vulnerabilities that appear in the current user's scans
    query = (
        db.query(Vulnerability)
        .join(Finding, Finding.vulnerability_id == Vulnerability.id)
        .join(Scan, Finding.scan_id == Scan.id)
        .join(Project, Scan.project_id == Project.id)
        .filter(Project.owner_id == current_user.id)
    )

    if project_id:
        query = query.filter(Project.id == project_id)

    if severity:
        query = query.filter(Vulnerability.severity.ilike(severity))

    if ecosystem:
        query = (
            query.join(Dependency, Finding.dependency_id == Dependency.id)
            .filter(Dependency.ecosystem.ilike(ecosystem))
        )

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            (Vulnerability.advisory_id.ilike(search_filter))
            | (Vulnerability.summary.ilike(search_filter))
        )

    vulns = query.distinct().order_by(Vulnerability.last_updated_at.desc()).limit(limit).all()
    return [VulnerabilityResponse.model_validate(v) for v in vulns]


@router.get("/{vulnerability_id}", response_model=VulnerabilityResponse)
def get_vulnerability(
    vulnerability_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vuln = (
        db.query(Vulnerability)
        .join(Finding, Finding.vulnerability_id == Vulnerability.id)
        .join(Scan, Finding.scan_id == Scan.id)
        .join(Project, Scan.project_id == Project.id)
        .filter(Project.owner_id == current_user.id)
        .filter(Vulnerability.id == vulnerability_id)
        .first()
    )
    if not vuln:
        # Also check by advisory_id in case passed e.g. GHSA-xxx
        vuln = (
            db.query(Vulnerability)
            .join(Finding, Finding.vulnerability_id == Vulnerability.id)
            .join(Scan, Finding.scan_id == Scan.id)
            .join(Project, Scan.project_id == Project.id)
            .filter(Project.owner_id == current_user.id)
            .filter(Vulnerability.advisory_id == vulnerability_id)
            .first()
        )

    if not vuln:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vulnerability advisory not found in your projects.",
        )
    return VulnerabilityResponse.model_validate(vuln)


@router.get("/{vulnerability_id}/remediation", response_model=AIRemediationResponse)
async def get_vulnerability_remediation(
    vulnerability_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vuln = (
        db.query(Vulnerability)
        .join(Finding, Finding.vulnerability_id == Vulnerability.id)
        .join(Scan, Finding.scan_id == Scan.id)
        .join(Project, Scan.project_id == Project.id)
        .filter(Project.owner_id == current_user.id)
        .filter(Vulnerability.id == vulnerability_id)
        .first()
    )
    if not vuln:
        # Check by advisory ID as well
        vuln = (
            db.query(Vulnerability)
            .join(Finding, Finding.vulnerability_id == Vulnerability.id)
            .join(Scan, Finding.scan_id == Scan.id)
            .join(Project, Scan.project_id == Project.id)
            .filter(Project.owner_id == current_user.id)
            .filter(Vulnerability.advisory_id == vulnerability_id)
            .first()
        )

    if not vuln:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vulnerability advisory not found in your projects.",
        )

    # Find the associated dependency for context
    finding = (
        db.query(Finding)
        .filter(Finding.vulnerability_id == vuln.id)
        .first()
    )
    dep = finding.dependency if finding else None

    advice = await ai_advisor.get_remediation_advice(vuln, dep)
    return AIRemediationResponse(**advice)
