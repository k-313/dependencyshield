import hashlib
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.models import (
    Scan,
    Dependency,
    Vulnerability,
    Finding,
    SBOMArtifact,
    Report,
    get_utc_now,
)
from app.services.parsers import get_parser
from app.services.osv_client import OSVClient
from app.services.sbom_generator import SBOMGenerator
from app.services.report_generator import ReportGenerator

logger = logging.getLogger("dependencyshield.scanner")


class ScanEngine:
    def __init__(self, osv_client: OSVClient = None):
        self.osv_client = osv_client or OSVClient()
        self.sbom_gen = SBOMGenerator()
        self.report_gen = ReportGenerator()

    async def execute_scan(self, scan_id: str, manifest_content: str, filename: str):
        """Asynchronous worker to parse dependencies, query OSV, record findings, and generate artifacts."""
        db: Session = SessionLocal()
        try:
            scan = db.query(Scan).filter(Scan.id == scan_id).first()
            if not scan:
                logger.error(f"Scan {scan_id} not found")
                return

            if scan.status == "cancelled":
                logger.info(f"Scan {scan_id} was cancelled before starting")
                return

            # Mark scan running
            scan.status = "running"
            scan.started_at = get_utc_now()
            scan.manifest_name = filename
            db.commit()

            # 1. Parse manifest
            try:
                parser = get_parser(filename)
                parse_result = parser.parse(manifest_content, filename)
            except Exception as e:
                scan.status = "failed"
                scan.completed_at = get_utc_now()
                scan.error_summary = f"Manifest parsing error: {str(e)}"
                db.commit()
                return

            scan.ecosystem = parse_result.ecosystem
            scan.warnings = parse_result.warnings

            if not parse_result.dependencies:
                scan.status = "completed"
                scan.completed_at = get_utc_now()
                scan.dependency_count = 0
                scan.finding_count = 0
                db.commit()
                # Still generate empty SBOM & Report
                self._generate_artifacts(db, scan, [])
                return

            # 2. Persist dependencies
            created_deps = []
            for pdep in parse_result.dependencies:
                dep_record = Dependency(
                    scan_id=scan.id,
                    package_name=pdep.package_name,
                    ecosystem=pdep.ecosystem,
                    resolved_version=pdep.resolved_version,
                    declared_version=pdep.declared_version,
                    direct_or_transitive=pdep.direct_or_transitive,
                    package_metadata=pdep.package_metadata,
                )
                db.add(dep_record)
                created_deps.append((pdep, dep_record))

            db.commit()
            for _, dep_record in created_deps:
                db.refresh(dep_record)

            scan.dependency_count = len(created_deps)

            # 3. Query OSV API for vulnerabilities
            try:
                raw_results = await self.osv_client.query_batch(parse_result.dependencies)
            except Exception as e:
                logger.error(f"OSV API query failure for scan {scan_id}: {e}")
                scan.status = "failed"
                scan.completed_at = get_utc_now()
                scan.error_summary = (
                    f"Vulnerability database communication failure: {str(e)}. "
                    "Cannot verify security status."
                )
                db.commit()
                return

            # 4. Process and persist vulnerabilities & findings
            critical_c = 0
            high_c = 0
            medium_c = 0
            low_c = 0
            unknown_c = 0
            total_findings = 0

            for pdep, dep_record in created_deps:
                dep_key = f"{pdep.ecosystem}:{pdep.package_name}:{pdep.resolved_version or ''}"
                vuln_list = raw_results.get(dep_key, [])

                for raw_vuln in vuln_list:
                    parsed_vuln = OSVClient.parse_advisory(raw_vuln)
                    advisory_id = parsed_vuln["advisory_id"]

                    # Check or create Vulnerability record
                    vuln_rec = db.query(Vulnerability).filter(Vulnerability.advisory_id == advisory_id).first()
                    if not vuln_rec:
                        vuln_rec = Vulnerability(
                            advisory_id=advisory_id,
                            source=parsed_vuln["source"],
                            summary=parsed_vuln["summary"],
                            details=parsed_vuln["details"],
                            severity=parsed_vuln["severity"],
                            score=parsed_vuln["score"],
                            cvss_vector=parsed_vuln["cvss_vector"],
                            affected_ranges=parsed_vuln["affected_ranges"],
                            fixed_versions=parsed_vuln["fixed_versions"],
                            references=parsed_vuln["references"],
                            aliases=parsed_vuln["aliases"],
                            last_updated_at=get_utc_now(),
                        )
                        db.add(vuln_rec)
                        db.commit()
                        db.refresh(vuln_rec)

                    # Create Finding record
                    existing_finding = db.query(Finding).filter(
                        Finding.scan_id == scan.id,
                        Finding.dependency_id == dep_record.id,
                        Finding.vulnerability_id == vuln_rec.id,
                    ).first()

                    if not existing_finding:
                        finding = Finding(
                            scan_id=scan.id,
                            dependency_id=dep_record.id,
                            vulnerability_id=vuln_rec.id,
                            status="open",
                            first_detected_at=get_utc_now(),
                            last_detected_at=get_utc_now(),
                        )
                        db.add(finding)
                        total_findings += 1

                        # Count severities
                        sev = (vuln_rec.severity or "Unknown").capitalize()
                        if sev == "Critical":
                            critical_c += 1
                        elif sev == "High":
                            high_c += 1
                        elif sev == "Medium":
                            medium_c += 1
                        elif sev == "Low":
                            low_c += 1
                        else:
                            unknown_c += 1

            db.commit()

            # 5. Set scan results
            scan.finding_count = total_findings
            scan.critical_count = critical_c
            scan.high_count = high_c
            scan.medium_count = medium_c
            scan.low_count = low_c
            scan.unknown_count = unknown_c
            scan.completed_at = get_utc_now()

            if total_findings > 0:
                scan.status = "completed_with_findings"
            else:
                scan.status = "completed"

            db.commit()

            # 6. Generate SBOM and initial Reports
            all_deps = [d for _, d in created_deps]
            self._generate_artifacts(db, scan, all_deps)

        except Exception as e:
            logger.exception(f"Unexpected error in scan engine for scan {scan_id}: {e}")
            try:
                scan = db.query(Scan).filter(Scan.id == scan_id).first()
                if scan:
                    scan.status = "failed"
                    scan.completed_at = get_utc_now()
                    scan.error_summary = f"Unexpected scan processing error: {str(e)}"
                    db.commit()
            except Exception:
                pass
        finally:
            db.close()

    def _generate_artifacts(self, db: Session, scan: Scan, dependencies: list):
        """Generate and save CycloneDX SBOM and Security Reports."""
        try:
            # Generate CycloneDX JSON
            findings = db.query(Finding).filter(Finding.scan_id == scan.id).all()
            sbom_dict = self.sbom_gen.generate_cyclonedx_json(scan, dependencies, findings)
            sbom_str = json.dumps(sbom_dict, indent=2)
            sbom_hash = hashlib.sha256(sbom_str.encode("utf-8")).hexdigest()

            sbom_artifact = SBOMArtifact(
                scan_id=scan.id,
                format="cyclonedx-json",
                checksum=sbom_hash,
                content=sbom_str,
            )
            db.add(sbom_artifact)

            # Generate JSON & CSV Reports
            json_report_str = self.report_gen.generate_json_report(scan, dependencies, findings)
            csv_report_str = self.report_gen.generate_csv_report(scan, dependencies, findings)

            rep_json = Report(
                scan_id=scan.id,
                format="json",
                content=json_report_str,
            )
            rep_csv = Report(
                scan_id=scan.id,
                format="csv",
                content=csv_report_str,
            )
            db.add(rep_json)
            db.add(rep_csv)
            db.commit()
        except Exception as e:
            logger.error(f"Error generating artifacts for scan {scan.id}: {e}")
