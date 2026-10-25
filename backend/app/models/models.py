import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Integer,
    Float,
    JSON,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from app.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=get_utc_now,
        onupdate=get_utc_now,
        nullable=False,
    )

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    owner_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    source_type = Column(String(50), default="manual_upload", nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=get_utc_now,
        onupdate=get_utc_now,
        nullable=False,
    )

    owner = relationship("User", back_populates="projects")
    scans = relationship("Scan", back_populates="project", cascade="all, delete-orphan")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        String(50),
        default="queued",
        nullable=False,
        index=True,
    )  # queued, running, completed, completed_with_findings, incomplete, failed, cancelled
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    dependency_count = Column(Integer, default=0, nullable=False)
    finding_count = Column(Integer, default=0, nullable=False)
    critical_count = Column(Integer, default=0, nullable=False)
    high_count = Column(Integer, default=0, nullable=False)
    medium_count = Column(Integer, default=0, nullable=False)
    low_count = Column(Integer, default=0, nullable=False)
    unknown_count = Column(Integer, default=0, nullable=False)
    error_summary = Column(Text, nullable=True)
    warnings = Column(JSON, default=list, nullable=True)
    manifest_name = Column(String(255), nullable=True)
    ecosystem = Column(String(50), nullable=True)  # npm, PyPI, etc.
    scanner_version = Column(String(50), default="1.0.0", nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    project = relationship("Project", back_populates="scans")
    dependencies = relationship("Dependency", back_populates="scan", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")
    sboms = relationship("SBOMArtifact", back_populates="scan", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="scan", cascade="all, delete-orphan")


class Dependency(Base):
    __tablename__ = "dependencies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(
        String(36),
        ForeignKey("scans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    package_name = Column(String(255), nullable=False, index=True)
    ecosystem = Column(String(50), nullable=False, index=True)  # npm, PyPI
    resolved_version = Column(String(100), nullable=True)
    declared_version = Column(String(100), nullable=True)
    direct_or_transitive = Column(String(20), default="direct", nullable=False)
    package_metadata = Column(JSON, default=dict, nullable=True)

    scan = relationship("Scan", back_populates="dependencies")
    findings = relationship("Finding", back_populates="dependency", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_dependencies_scan_pkg", "scan_id", "package_name"),
    )


class Vulnerability(Base):
    __tablename__ = "vulnerabilities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    advisory_id = Column(String(100), unique=True, nullable=False, index=True)  # e.g. GHSA-xxx, CVE-xxx
    source = Column(String(50), default="OSV", nullable=False)
    summary = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    severity = Column(String(20), default="Unknown", nullable=False, index=True)  # Critical, High, Medium, Low, Unknown
    score = Column(Float, nullable=True)  # CVSS score e.g. 7.5
    cvss_vector = Column(String(150), nullable=True)
    affected_ranges = Column(JSON, default=list, nullable=True)
    fixed_versions = Column(JSON, default=list, nullable=True)
    references = Column(JSON, default=list, nullable=True)
    aliases = Column(JSON, default=list, nullable=True)
    last_updated_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    findings = relationship("Finding", back_populates="vulnerability")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(
        String(36),
        ForeignKey("scans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dependency_id = Column(
        String(36),
        ForeignKey("dependencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vulnerability_id = Column(
        String(36),
        ForeignKey("vulnerabilities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(String(50), default="open", nullable=False, index=True)  # open, resolved, ignored
    first_detected_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    last_detected_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    scan = relationship("Scan", back_populates="findings")
    dependency = relationship("Dependency", back_populates="findings")
    vulnerability = relationship("Vulnerability", back_populates="findings")

    __table_args__ = (
        UniqueConstraint("scan_id", "dependency_id", "vulnerability_id", name="uq_finding_scan_dep_vuln"),
        Index("ix_findings_scan_status", "scan_id", "status"),
    )


class SBOMArtifact(Base):
    __tablename__ = "sbom_artifacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(
        String(36),
        ForeignKey("scans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    format = Column(String(50), default="cyclonedx-json", nullable=False)
    storage_key = Column(String(255), nullable=True)
    checksum = Column(String(64), nullable=True)  # SHA256
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    scan = relationship("Scan", back_populates="sboms")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(
        String(36),
        ForeignKey("scans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    format = Column(String(20), nullable=False)  # json, csv
    storage_key = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    scan = relationship("Scan", back_populates="reports")
