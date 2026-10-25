import os
from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
    Query,
)
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, Project, Scan, Finding, Dependency, Vulnerability
from app.schemas.schemas import (
    ScanResponse,
    ScanDetailResponse,
    ScanCreateResponse,
    FindingResponse,
    DependencyResponse,
    VulnerabilityResponse,
)
from app.core.auth_middleware import get_current_user
from app.core.rate_limiter import scan_limiter
from app.services.scan_engine import ScanEngine
from app.config import settings

router = APIRouter(prefix="/scans", tags=["Scans"])
scan_engine = ScanEngine()


@router.post("", response_model=ScanCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_scan(
    background_tasks: BackgroundTasks,
    project_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Verify project ownership
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this project.")

    # 2. Validate filename
    filename = file.filename or "unknown"
    clean_filename = os.path.basename(filename).lower()
    allowed_names = ("package.json", "package-lock.json", "requirements.txt", "pyproject.toml")
    is_valid_name = (
        clean_filename in allowed_names
        or (clean_filename.endswith(".txt") and "requirement" in clean_filename)
    )
    if not is_valid_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported manifest file '{filename}'. Supported files: "
                "package.json, package-lock.json, requirements.txt, pyproject.toml."
            ),
        )

    # 3. Read content & validate size
    content_bytes = await file.read()
    if len(content_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded manifest exceeds maximum size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    try:
        content_text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manifest file must be valid UTF-8 text.",
        )

    # 4. Create Scan record in DB
    scan = Scan(
        project_id=project.id,
        status="queued",
        manifest_name=os.path.basename(filename),
        scanner_version=settings.VERSION,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # 5. Enqueue background scanning task
    background_tasks.add_task(
        scan_engine.execute_scan,
        scan_id=scan.id,
        manifest_content=content_text,
        filename=os.path.basename(filename),
    )

    return ScanCreateResponse(
        scan_id=scan.id,
        status="queued",
        message="Dependency scan has been queued for background analysis.",
    )


@router.get("", response_model=List[ScanResponse])
def list_scans(
    project_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Scan)
        .join(Project, Scan.project_id == Project.id)
        .filter(Project.owner_id == current_user.id)
    )
    if project_id:
        query = query.filter(Scan.project_id == project_id)

    scans = query.order_by(Scan.created_at.desc()).all()
    return [ScanResponse.model_validate(s) for s in scans]


@router.get("/{scan_id}", response_model=ScanDetailResponse)
def get_scan(
    scan_id: str,
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

    # Load dependencies and findings
    deps = db.query(Dependency).filter(Dependency.scan_id == scan.id).all()
    findings = (
        db.query(Finding)
        .filter(Finding.scan_id == scan.id)
        .all()
    )

    detail = ScanDetailResponse.model_validate(scan)
    detail.dependencies = [DependencyResponse.model_validate(d) for d in deps]
    detail.findings = [
        FindingResponse(
            id=f.id,
            scan_id=f.scan_id,
            dependency=DependencyResponse.model_validate(f.dependency),
            vulnerability=VulnerabilityResponse.model_validate(f.vulnerability),
            status=f.status,
            first_detected_at=f.first_detected_at,
            last_detected_at=f.last_detected_at,
        )
        for f in findings
    ]
    return detail


@router.post("/{scan_id}/cancel")
def cancel_scan(
    scan_id: str,
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

    if scan.status in ("queued", "running"):
        scan.status = "cancelled"
        db.commit()
        return {"message": "Scan cancelled."}
    return {"message": f"Scan is already in terminal state '{scan.status}'."}


@router.get("/{scan_id}/findings", response_model=List[FindingResponse])
def get_scan_findings(
    scan_id: str,
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

    findings = db.query(Finding).filter(Finding.scan_id == scan.id).all()
    return [
        FindingResponse(
            id=f.id,
            scan_id=f.scan_id,
            dependency=DependencyResponse.model_validate(f.dependency),
            vulnerability=VulnerabilityResponse.model_validate(f.vulnerability),
            status=f.status,
            first_detected_at=f.first_detected_at,
            last_detected_at=f.last_detected_at,
        )
        for f in findings
    ]
