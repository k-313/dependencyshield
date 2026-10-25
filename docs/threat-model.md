# DependencyShield Threat Model

## 1. Scope and Assets

| Asset | Description | Sensitivity |
| :--- | :--- | :--- |
| **User Account Credentials** | Email, bcrypt-hashed passwords, active sessions | Critical |
| **Project & Dependency Metadata** | Internal package names, manifest contents, dependency trees | High |
| **Vulnerability Disclosures & Findings** | Known unpatched vulnerabilities in user codebases | Critical |
| **SBOM Artifacts & Audit Reports** | CycloneDX documents and compliance audit logs | High |
| **AI Advisor Prompts & Outputs** | Advisory descriptions and recommended upgrade plans | Medium |

---

## 2. Trust Boundaries

```
[ Untrusted Public Internet / Client Browser ]
                     │
         [Boundary 1: TLS / HTTPS / Rate Limiter]
                     ▼
             [ FastAPI Application ]
                     │
         [Boundary 2: Authentication & Ownership]
                     ▼
            [ Database / Storage ]
                     │
         [Boundary 3: External API Calls]
                     ▼
          [ Google OSV / Gemini API ]
```

- **Boundary 1 (Edge to API)**: Incoming requests from arbitrary clients. Subject to brute-force attacks, oversized uploads, and malformed JSON.
- **Boundary 2 (API to Database)**: Query isolation. Must enforce multi-tenant separation so User A cannot access User B's scans or projects.
- **Boundary 3 (API to External Feeds)**: Outbound requests to OSV API and optional Gemini API. Subject to connection drops, rate limiting, and network tampering.

---

## 3. Threat Scenarios and Mitigations

### 3.1 Insecure Direct Object Reference (IDOR)
- **Threat**: Attacker changes UUID in `/api/v1/projects/{id}`, `/api/v1/scans/{id}`, or `/api/v1/reports/{id}/download` to view or delete another user's security disclosures.
- **Mitigation**: Every entity lookup joins on the `Project` table and checks `Project.owner_id == current_user.id`. Authorization tests in `tests/test_authorization.py` explicitly verify cross-user isolation.

### 3.2 Remote Code Execution via Malicious Manifests
- **Threat**: Attacker uploads a `package.json` or `pyproject.toml` containing lifecycle hooks (`preinstall`, `setup.py` scripts) attempting code execution.
- **Mitigation**: DependencyShield strictly parses files with `json.loads` and standard Python `tomllib`. Packages are **never installed**; build tools (`npm install`, `pip install`) are never executed on user input.

### 3.3 Resource Exhaustion / Denial of Service
- **Threat**: Attacker uploads a 500MB payload or spams expensive scan requests.
- **Mitigation**: 
  - Upload size limit enforced at 5MB (`MAX_UPLOAD_SIZE_BYTES`).
  - In-memory sliding-window rate limiters on `/auth` (20 req/min) and `/scans` (30 req/min).
  - Background async execution prevents HTTP worker thread starvation.

### 3.4 Vulnerability Intelligence Outage Disguised as Clean Results
- **Threat**: OSV API experiences network downtime or rate limits. A naive scanner might treat 0 API results as "0 vulnerabilities", misrepresenting a compromised app as safe.
- **Mitigation**: If OSV communication fails after exponential retries, the scan is transitioned to `failed` or `incomplete` with an explicit `error_summary`. Clean `completed` state is reserved exclusively for verified successful 0-result lookups.

### 3.5 AI Hallucination of Security Advisories
- **Threat**: LLM invents CVE numbers, incorrect CVSS scores, or falsely declares an affected dependency "secure".
- **Mitigation**: The AI assistant prompt is strictly constrained to authoritative OSV advisory disclosures. When no Gemini key is configured, a deterministic rule-based remediation engine generates verifiable steps without calling any LLM.

---

## 4. Residual Risks

- **Zero-Day Vulnerabilities**: Dependency scanning identifies disclosed CVEs/GHSAs in public registries. Undisclosed zero-day defects cannot be identified by signature-based tools alone.
- **Unpinned Ranges**: Manifests with caret (`^`) or tilde (`~`) ranges without a lockfile cannot guarantee exact runtime package versions; DependencyShield records a coverage warning in the scan summary to alert the user.
