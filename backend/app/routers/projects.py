from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import User, Project, Scan, Finding
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from app.core.auth_middleware import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(Project).filter(Project.owner_id == current_user.id).order_by(Project.created_at.desc()).all()
    
    response_list = []
    for proj in projects:
        scan_count = db.query(func.count(Scan.id)).filter(Scan.project_id == proj.id).scalar() or 0
        latest_scan = db.query(Scan).filter(Scan.project_id == proj.id).order_by(Scan.created_at.desc()).first()
        
        # Calculate open vulnerabilities in latest scan
        open_vulns = 0
        if latest_scan:
            open_vulns = latest_scan.finding_count

        p_resp = ProjectResponse(
            id=proj.id,
            owner_id=proj.owner_id,
            name=proj.name,
            description=proj.description,
            source_type=proj.source_type,
            created_at=proj.created_at,
            updated_at=proj.updated_at,
            scan_count=scan_count,
            latest_scan_status=latest_scan.status if latest_scan else None,
            open_vulnerabilities=open_vulns,
        )
        response_list.append(p_resp)
        
    return response_list


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = Project(
        owner_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        source_type=payload.source_type or "manual_upload",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return ProjectResponse(
        id=project.id,
        owner_id=project.owner_id,
        name=project.name,
        description=project.description,
        source_type=project.source_type,
        created_at=project.created_at,
        updated_at=project.updated_at,
        scan_count=0,
        latest_scan_status=None,
        open_vulnerabilities=0,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this project.")

    scan_count = db.query(func.count(Scan.id)).filter(Scan.project_id == project.id).scalar() or 0
    latest_scan = db.query(Scan).filter(Scan.project_id == project.id).order_by(Scan.created_at.desc()).first()

    return ProjectResponse(
        id=project.id,
        owner_id=project.owner_id,
        name=project.name,
        description=project.description,
        source_type=project.source_type,
        created_at=project.created_at,
        updated_at=project.updated_at,
        scan_count=scan_count,
        latest_scan_status=latest_scan.status if latest_scan else None,
        open_vulnerabilities=latest_scan.finding_count if latest_scan else 0,
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this project.")

    if payload.name is not None:
        project.name = payload.name.strip()
    if payload.description is not None:
        project.description = payload.description.strip()

    db.commit()
    db.refresh(project)

    scan_count = db.query(func.count(Scan.id)).filter(Scan.project_id == project.id).scalar() or 0
    latest_scan = db.query(Scan).filter(Scan.project_id == project.id).order_by(Scan.created_at.desc()).first()

    return ProjectResponse(
        id=project.id,
        owner_id=project.owner_id,
        name=project.name,
        description=project.description,
        source_type=project.source_type,
        created_at=project.created_at,
        updated_at=project.updated_at,
        scan_count=scan_count,
        latest_scan_status=latest_scan.status if latest_scan else None,
        open_vulnerabilities=latest_scan.finding_count if latest_scan else 0,
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this project.")

    db.delete(project)
    db.commit()
    return None
