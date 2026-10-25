import time
import asyncio
import httpx
from typing import List, Dict, Any, Optional, Tuple
from app.config import settings
from app.services.parsers.base import ParsedDependency


class OSVClient:
    def __init__(
        self,
        base_url: str = settings.OSV_API_BASE_URL,
        timeout: float = settings.OSV_TIMEOUT_SECONDS,
        max_retries: int = settings.OSV_MAX_RETRIES,
        backoff_factor: float = settings.OSV_RETRY_BACKOFF_FACTOR,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        # In-memory cache: (ecosystem, package_name, version) -> (timestamp, advisories)
        self._cache: Dict[Tuple[str, str, Optional[str]], Tuple[float, List[Dict[str, Any]]]] = {}
        self.cache_ttl = settings.OSV_CACHE_TTL_HOURS * 3600

    def _get_from_cache(self, ecosystem: str, name: str, version: Optional[str]) -> Optional[List[Dict[str, Any]]]:
        key = (ecosystem.lower(), name.lower(), version)
        if key in self._cache:
            ts, data = self._cache[key]
            if time.time() - ts < self.cache_ttl:
                return data
        return None

    def _set_cache(self, ecosystem: str, name: str, version: Optional[str], data: List[Dict[str, Any]]):
        key = (ecosystem.lower(), name.lower(), version)
        self._cache[key] = (time.time(), data)

    async def _post_with_retry(self, client: httpx.AsyncClient, url: str, json_data: dict) -> dict:
        """Execute POST request with exponential backoff on retryable status codes and timeouts."""
        last_exception = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = await client.post(url, json=json_data, timeout=self.timeout)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    retry_after = float(response.headers.get("Retry-After", self.backoff_factor ** attempt))
                    await asyncio.sleep(min(retry_after, 10.0))
                elif response.status_code in (500, 502, 503, 504):
                    await asyncio.sleep(self.backoff_factor ** attempt)
                else:
                    response.raise_for_status()
            except (httpx.TimeoutException, httpx.NetworkError, httpx.ConnectError) as e:
                last_exception = e
                if attempt < self.max_retries:
                    await asyncio.sleep(self.backoff_factor ** attempt)
                else:
                    raise RuntimeError(f"OSV API communication failure after {self.max_retries} attempts: {str(e)}") from e
            except httpx.HTTPStatusError as e:
                last_exception = e
                if attempt >= self.max_retries:
                    raise RuntimeError(f"OSV API returned HTTP {e.response.status_code}: {e.response.text}") from e
                await asyncio.sleep(self.backoff_factor ** attempt)

        raise RuntimeError(f"OSV API request failed: {last_exception}")

    async def query_batch(self, dependencies: List[ParsedDependency]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Query OSV in chunks for all dependencies.
        Returns a dict mapping dep_key (f"{ecosystem}:{package_name}:{version}") -> list of raw vulnerability advisories.
        """
        results: Dict[str, List[Dict[str, Any]]] = {}
        uncached_deps: List[ParsedDependency] = []

        for dep in dependencies:
            dep_key = f"{dep.ecosystem}:{dep.package_name}:{dep.resolved_version or ''}"
            cached = self._get_from_cache(dep.ecosystem, dep.package_name, dep.resolved_version)
            if cached is not None:
                results[dep_key] = cached
            else:
                uncached_deps.append(dep)

        if not uncached_deps:
            return results

        # Process in batches
        batch_size = settings.OSV_BATCH_SIZE
        async with httpx.AsyncClient() as client:
            for i in range(0, len(uncached_deps), batch_size):
                chunk = uncached_deps[i : i + batch_size]
                query_items = []
                for dep in chunk:
                    item: Dict[str, Any] = {
                        "package": {
                            "name": dep.package_name,
                            "ecosystem": dep.ecosystem,
                        }
                    }
                    if dep.resolved_version:
                        item["version"] = dep.resolved_version
                    query_items.append(item)

                payload = {"queries": query_items}
                resp_json = await self._post_with_retry(
                    client, f"{self.base_url}/querybatch", payload
                )

                batch_results = resp_json.get("results", [])
                for dep, res_obj in zip(chunk, batch_results):
                    vulns = res_obj.get("vulns", []) if isinstance(res_obj, dict) else []
                    dep_key = f"{dep.ecosystem}:{dep.package_name}:{dep.resolved_version or ''}"
                    results[dep_key] = vulns
                    self._set_cache(dep.ecosystem, dep.package_name, dep.resolved_version, vulns)

        return results

    @staticmethod
    def parse_advisory(vuln_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract authoritative fields from an OSV advisory:
        advisory_id, summary, details, severity, score, cvss_vector, affected_ranges, fixed_versions, references, aliases
        """
        advisory_id = vuln_data.get("id", "UNKNOWN")
        summary = vuln_data.get("summary") or "No advisory summary provided"
        details = vuln_data.get("details") or ""
        aliases = vuln_data.get("aliases", [])

        # Parse severity and CVSS
        severity_label = "Unknown"
        score: Optional[float] = None
        cvss_vector: Optional[str] = None

        severities = vuln_data.get("severity", [])
        if isinstance(severities, list):
            for s_entry in severities:
                if isinstance(s_entry, dict):
                    stype = s_entry.get("type", "")
                    s_score = s_entry.get("score", "")
                    if "CVSS_V3" in stype:
                        cvss_vector = s_score
                        # Extract base score from vector if present (e.g. CVSS:3.1/... or parse)
                        # We will compute/extract CVSS score below
                        break
                    elif "CVSS_V2" in stype and not cvss_vector:
                        cvss_vector = s_score

        # Check ecosystem_specific or database_specific for severity label
        db_specific = vuln_data.get("database_specific", {})
        if isinstance(db_specific, dict):
            raw_sev = db_specific.get("severity")
            if isinstance(raw_sev, str):
                normalized = raw_sev.strip().capitalize()
                if normalized in ("Critical", "High", "Medium", "Low"):
                    severity_label = normalized

        # Calculate or approximate score from vector if severity label not yet confirmed
        if cvss_vector:
            # Check for CVSS base metric patterns or approximate from vector
            # Typical CVSS 3.1: AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H -> 9.8 Critical
            score = OSVClient._estimate_cvss_score(cvss_vector)
            if severity_label == "Unknown" and score is not None:
                if score >= 9.0:
                    severity_label = "Critical"
                elif score >= 7.0:
                    severity_label = "High"
                elif score >= 4.0:
                    severity_label = "Medium"
                elif score > 0.0:
                    severity_label = "Low"

        # Extract affected ranges and fixed versions
        affected_ranges: List[Dict[str, Any]] = []
        fixed_versions: List[str] = []

        affected_list = vuln_data.get("affected", [])
        if isinstance(affected_list, list):
            for aff in affected_list:
                if not isinstance(aff, dict):
                    continue
                ranges = aff.get("ranges", [])
                if isinstance(ranges, list):
                    for r in ranges:
                        affected_ranges.append(r)
                        events = r.get("events", [])
                        if isinstance(events, list):
                            for ev in events:
                                if isinstance(ev, dict) and "fixed" in ev:
                                    fix_ver = ev["fixed"]
                                    if fix_ver and fix_ver not in fixed_versions:
                                        fixed_versions.append(fix_ver)

        # Extract references
        references: List[Dict[str, str]] = []
        raw_refs = vuln_data.get("references", [])
        if isinstance(raw_refs, list):
            for ref in raw_refs:
                if isinstance(ref, dict) and "url" in ref:
                    references.append({
                        "type": ref.get("type", "WEB"),
                        "url": ref.get("url", ""),
                    })

        return {
            "advisory_id": advisory_id,
            "source": "OSV",
            "summary": summary,
            "details": details,
            "severity": severity_label,
            "score": score,
            "cvss_vector": cvss_vector,
            "affected_ranges": affected_ranges,
            "fixed_versions": fixed_versions,
            "references": references,
            "aliases": aliases,
        }

    @staticmethod
    def _estimate_cvss_score(vector: str) -> Optional[float]:
        """Extract or calculate approximate CVSS v3 score from vector."""
        if not vector or not isinstance(vector, str):
            return None
        # Some vectors might include a score prefix
        # E.g. "9.8" or standard vector string
        if "CVSS:3" in vector:
            # Baseline calculation for standard critical vectors
            # E.g., AV:N/AC:L/PR:N/UI:N -> typically 9.8
            if "AV:N" in vector and "AC:L" in vector and "PR:N" in vector and "UI:N" in vector and "C:H" in vector and "I:H" in vector and "A:H" in vector:
                return 9.8
            elif "AV:N" in vector and "AC:L" in vector and "PR:N" in vector:
                return 8.2
            elif "AV:N" in vector:
                return 7.5
            elif "AV:L" in vector:
                return 5.5
            return 6.0
        return None
