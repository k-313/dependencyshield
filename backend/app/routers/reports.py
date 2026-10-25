from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, Project, Scan, Report, Dependency, Finding
from app.schemas.schemas import ReportResponse
from app.core.auth_middleware import get_current_user
from app.services.report_generator import ReportGenerator

router = APIRouter(tags=["Reports"])
report_generator = ReportGenerator()


@router.get("/reports", response_model=List[ReportResponse])
def list_reports(
    project_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Report)
        .join(Scan, Report.scan_id == Scan.id)
        .join(Project, Scan.project_id == Project.id)
        .filter(Project.owner_id == current_user.id)
    )
    if project_id:
        query = query.filter(Project.id == project_id)

    reports = query.order_by(Report.created_at.desc()).all()
    return [ReportResponse.model_validate(r) for r in reports]


@router.post("/scans/{scan_id}/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    scan_id: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = (
        db.query(Scan)
        .join(Project, Scan.project_id == Project.id)
        .filter(Scan.id == scan_id)
        .first()
    )
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")
    if scan.project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this scan.")

    deps = db.query(Dependency).filter(Dependency.scan_id == scan.id).all()
    findings = db.query(Finding).filter(Finding.scan_id == scan.id).all()

    if format == "csv":
        content = report_generator.generate_csv_report(scan, deps, findings)
    else:
        content = report_generator.generate_json_report(scan, deps, findings)

    report = Report(
        scan_id=scan.id,
        format=format,
        content=content,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportResponse.model_validate(report)


@router.get("/reports/{report_id}/download")
def download_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = (
        db.query(Report)
        .join(Scan, Report.scan_id == Scan.id)
        .join(Project, Scan.project_id == Project.id)
        .filter(Report.id == report_id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    if report.scan.project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this report.")

    ext = "csv" if report.format == "csv" else "json"
    media_type = "text/csv; charset=utf-8" if report.format == "csv" else "application/json; charset=utf-8"
    filename = f"dependencyshield-report-{report.scan.project.name.replace(' ', '_')}-{report.scan_id[:8]}.{ext}"

    return Response(
        content=report.content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
