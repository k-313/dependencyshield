import json
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, Project, Scan, SBOMArtifact, Dependency, Finding
from app.schemas.schemas import SBOMResponse
from app.core.auth_middleware import get_current_user
from app.services.sbom_generator import SBOMGenerator

router = APIRouter(prefix="/scans", tags=["SBOM"])
sbom_generator = SBOMGenerator()


@router.get("/{scan_id}/sbom", response_model=SBOMResponse)
def get_sbom(
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

    artifact = db.query(SBOMArtifact).filter(SBOMArtifact.scan_id == scan.id).first()
    if not artifact:
        # Generate on demand if missing
        deps = db.query(Dependency).filter(Dependency.scan_id == scan.id).all()
        findings = db.query(Finding).filter(Finding.scan_id == scan.id).all()
        sbom_dict = sbom_generator.generate_cyclonedx_json(scan, deps, findings)
        sbom_str = json.dumps(sbom_dict, indent=2)
        artifact = SBOMArtifact(
            scan_id=scan.id,
            format="cyclonedx-json",
            content=sbom_str,
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)

    parsed_content = json.loads(artifact.content)
    return SBOMResponse(
        id=artifact.id,
        scan_id=artifact.scan_id,
        format=artifact.format,
        checksum=artifact.checksum,
        created_at=artifact.created_at,
        content=parsed_content,
    )


@router.get("/{scan_id}/sbom/download")
def download_sbom(
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

    artifact = db.query(SBOMArtifact).filter(SBOMArtifact.scan_id == scan.id).first()
    if not artifact:
        deps = db.query(Dependency).filter(Dependency.scan_id == scan.id).all()
        findings = db.query(Finding).filter(Finding.scan_id == scan.id).all()
        sbom_dict = sbom_generator.generate_cyclonedx_json(scan, deps, findings)
        artifact_content = json.dumps(sbom_dict, indent=2)
    else:
        artifact_content = artifact.content

    filename = f"cyclonedx-sbom-{scan.project.name.replace(' ', '_')}-{scan.id[:8]}.json"
    return Response(
        content=artifact_content,
        media_type="application/vnd.cyclonedx+json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
