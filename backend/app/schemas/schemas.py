from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# Auth Schemas
class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Project Schemas
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    source_type: Optional[str] = "manual_upload"


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    owner_id: str
    name: str
    description: Optional[str] = None
    source_type: str
    created_at: datetime
    updated_at: datetime
    scan_count: int = 0
    latest_scan_status: Optional[str] = None
    open_vulnerabilities: int = 0


# Dependency Schemas
class DependencyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    package_name: str
    ecosystem: str
    resolved_version: Optional[str] = None
    declared_version: Optional[str] = None
    direct_or_transitive: str
    package_metadata: Optional[Dict[str, Any]] = None


# Vulnerability Schemas
class VulnerabilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    advisory_id: str
    source: str
    summary: Optional[str] = None
    details: Optional[str] = None
    severity: str
    score: Optional[float] = None
    cvss_vector: Optional[str] = None
    affected_ranges: Optional[List[Any]] = None
    fixed_versions: Optional[List[str]] = None
    references: Optional[List[Dict[str, str]]] = None
    aliases: Optional[List[str]] = None
    last_updated_at: datetime


# Finding Schemas
class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    scan_id: str
    dependency: DependencyResponse
    vulnerability: VulnerabilityResponse
    status: str
    first_detected_at: datetime
    last_detected_at: datetime


# Scan Schemas
class ScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    dependency_count: int
    finding_count: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    unknown_count: int
    error_summary: Optional[str] = None
    warnings: Optional[List[str]] = None
    manifest_name: Optional[str] = None
    ecosystem: Optional[str] = None
    scanner_version: str
    created_at: datetime


class ScanDetailResponse(ScanResponse):
    dependencies: List[DependencyResponse] = []
    findings: List[FindingResponse] = []


class ScanCreateResponse(BaseModel):
    scan_id: str
    status: str
    message: str


# SBOM Schemas
class SBOMResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    scan_id: str
    format: str
    checksum: Optional[str] = None
    created_at: datetime
    content: Dict[str, Any]


# Report Schemas
class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    scan_id: str
    format: str
    created_at: datetime


# AI Remediation Schemas
class AIRemediationResponse(BaseModel):
    vulnerability_id: str
    advisory_id: str
    package_name: str
    severity: str
    summary: str
    risk_analysis: str
    remediation_steps: List[str]
    upgrade_guidance: Optional[str] = None
    is_ai_generated: bool
    authoritative_references: List[str] = []


# Dashboard Metrics Schema
class DashboardStatsResponse(BaseModel):
    total_projects: int
    total_scans: int
    total_vulnerabilities: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    unknown_count: int
    recent_scans: List[ScanResponse] = []
    recent_findings: List[FindingResponse] = []
