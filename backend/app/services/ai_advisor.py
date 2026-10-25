import os
import logging
from typing import Dict, Any, List, Optional
from app.config import settings
from app.models.models import Vulnerability, Dependency

logger = logging.getLogger("dependencyshield.ai")


class AIAdvisor:
    """Provides grounded vulnerability explanations and remediation advice."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def get_remediation_advice(
        self,
        vulnerability: Vulnerability,
        dependency: Optional[Dependency] = None
    ) -> Dict[str, Any]:
        pkg_name = dependency.package_name if dependency else "affected package"
        cur_version = dependency.resolved_version or dependency.declared_version if dependency else "unknown"
        fixed_versions = vulnerability.fixed_versions or []
        references = [r.get("url") for r in (vulnerability.references or []) if isinstance(r, dict)]

        # If Gemini API Key is available, try generative grounded synthesis
        if self.api_key:
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=self.api_key)
                prompt = (
                    f"You are a DevSecOps & Security Assistant. Provide clear, factual remediation guidance for:\n"
                    f"- Package: {pkg_name}\n"
                    f"- Current Version: {cur_version}\n"
                    f"- Advisory ID: {vulnerability.advisory_id}\n"
                    f"- Severity: {vulnerability.severity}\n"
                    f"- Summary: {vulnerability.summary}\n"
                    f"- Details: {vulnerability.details}\n"
                    f"- Known Fixed Versions: {', '.join(fixed_versions) if fixed_versions else 'None identified in advisory'}\n\n"
                    f"CRITICAL RULES:\n"
                    f"1. Strictly ground your response ONLY in the advisory data provided above.\n"
                    f"2. DO NOT invent CVEs, scores, or fictitious fixed versions.\n"
                    f"3. Do NOT declare the package completely safe.\n"
                    f"4. Provide a 2-sentence plain-English risk explanation and 2-4 actionable remediation steps."
                )

                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                )

                raw_text = response.text or ""
                return {
                    "vulnerability_id": vulnerability.id,
                    "advisory_id": vulnerability.advisory_id,
                    "package_name": pkg_name,
                    "severity": vulnerability.severity,
                    "summary": vulnerability.summary or "Vulnerability advisory",
                    "risk_analysis": raw_text[:400].strip(),
                    "remediation_steps": [
                        f"Upgrade {pkg_name} to a secure version ({', '.join(fixed_versions)})" if fixed_versions else f"Review {pkg_name} advisory references for mitigation or patch guidance.",
                        f"Audit manifest files (package.json / requirements.txt) to verify resolved version is updated.",
                        "Re-run DependencyShield scan to verify finding resolution.",
                    ],
                    "upgrade_guidance": f"Recommended target version: {fixed_versions[0]}" if fixed_versions else "No official fixed version listed in advisory. Inspect vendor references.",
                    "is_ai_generated": True,
                    "authoritative_references": references[:5],
                }
            except Exception as e:
                logger.warning(f"Gemini API invocation failed, falling back to rule-based advice: {e}")

        # Deterministic Grounded Fallback (100% reliable, no external AI needed)
        fix_guidance = (
            f"Upgrade to version {fixed_versions[0]} or later."
            if fixed_versions
            else "No official patched release listed in the advisory. Monitor vendor updates or consider replacing the dependency."
        )

        steps = []
        if fixed_versions:
            if dependency and dependency.ecosystem == "npm":
                steps.append(f"Run 'npm install {pkg_name}@{fixed_versions[0]}' and commit updated package-lock.json.")
            elif dependency and dependency.ecosystem == "PyPI":
                steps.append(f"Update requirements.txt to '{pkg_name}=={fixed_versions[0]}' and run 'pip install -r requirements.txt'.")
            else:
                steps.append(f"Update {pkg_name} dependency specification to '{fixed_versions[0]}'.")
        else:
            steps.append(f"Review authoritative advisory references for workarounds or configuration mitigations.")

        steps.append("Run comprehensive regression test suite to ensure backward compatibility.")
        steps.append("Trigger a new DependencyShield scan to verify the vulnerability is remediated.")

        risk_analysis = (
            f"{vulnerability.advisory_id} impacts {pkg_name} (current: {cur_version}) with {vulnerability.severity} severity. "
            f"{vulnerability.summary or 'Exploitation may compromise application confidentiality, integrity, or availability.'}"
        )

        return {
            "vulnerability_id": vulnerability.id,
            "advisory_id": vulnerability.advisory_id,
            "package_name": pkg_name,
            "severity": vulnerability.severity,
            "summary": vulnerability.summary or "Vulnerability advisory",
            "risk_analysis": risk_analysis,
            "remediation_steps": steps,
            "upgrade_guidance": fix_guidance,
            "is_ai_generated": False,
            "authoritative_references": references[:5],
        }
