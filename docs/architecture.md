# DependencyShield Architecture

## 1. System Overview

DependencyShield is an enterprise-grade software supply chain security platform that analyzes package dependency manifests, queries authoritative vulnerability databases (Google OSV), produces CycloneDX v1.5 Software Bills of Materials (SBOMs), and generates grounded remediation roadmaps.

```
+-------------------------------------------------------------------------+
|                              Next.js 16 UI                              |
|   (App Router, Tailwind CSS, Lucide React, Recharts, React Hook Form)    |
+------------------------------------+------------------------------------+
                                     |  HTTP / JSON / Cookies
                                     v
+-------------------------------------------------------------------------+
|                             FastAPI Backend                             |
|  - Auth Middleware & Session Security (Bcrypt, JWT, SameSite Cookies)   |
|  - Rate Limiting (In-Memory Sliding Window)                             |
|  - Security Headers & Request Correlation IDs                           |
+----+-------------------+--------------------+--------------------+------+
     |                   |                    |                    |
     v                   v                    v                    v
+---------+     +-----------------+    +-------------+     +--------------+
| Parsers |     | OSV Client Engine|    | SBOM Engine |     | AI Advisor   |
| - npm   |     | - Batch Query   |    | - CycloneDX |     | - Gemini SDK |
| - PyPI  |     | - Exponential   |    |   v1.5 JSON |     | - Evidence-  |
|         |     |   Backoff       |    | - Checksums |     |   based rule |
|         |     | - In-memory TTL |    | - PURLs     |     |   engine     |
+----+----+     +--------+--------+    +------+------+     +-------+------+
     |                   |                    |                    |
     +-------------------+--------------------+--------------------+
                                     |
                                     v
                +------------------------------------------+
                |        SQLAlchemy 2.0 / Alembic          |
                |  PostgreSQL (Neon) or SQLite (Local Dev) |
                +------------------------------------------+
```

---

## 2. Request Lifecycle

1. **Authentication**: Users register or authenticate via `/api/v1/auth/login`. Passwords are encrypted using salted `bcrypt`. Signed JWT tokens are issued with `SameSite=Lax` and `HttpOnly` cookie settings, with optional Bearer token fallback for CLI/API clients.
2. **Project Context**: All assets (Scans, Dependencies, Findings, SBOMs, Reports) are strictly scoped to a `Project` owned by a specific `User`. Every API endpoint enforces foreign key ownership checks; cross-user data access returns `403 Forbidden` or `404 Not Found`.
3. **Scan Dispatch**: The user uploads a manifest file (`package.json`, `package-lock.json`, `requirements.txt`, or `pyproject.toml`) up to 5MB. The server validates MIME type, content UTF-8 validity, and file size before persisting a `Scan` entity with status `queued`.
4. **Asynchronous Execution**: A background task executes the parse-and-query pipeline without blocking browser HTTP connections.

---

## 3. Scan Processing Flow

```
Manifest Upload (POST /api/v1/scans)
       │
       ▼
1. Validate & Sanitize (Size <= 5MB, Filename, UTF-8 check)
       │
       ▼
2. Create Scan in DB (status: 'queued')
       │
       ▼
3. Dispatch Background Job
       │
       ├──► 3a. Update scan status -> 'running'
       ├──► 3b. Invoke Parser (NpmLockfileParser, PythonRequirementsParser, etc.)
       │        - Parse dependency identity and version specifiers
       │        - Record coverage warnings if ranges are detected
       ├──► 3c. Batch Query OSV API (/querybatch)
       │        - Execute in chunks of 100 packages
       │        - Bounded retries with exponential backoff on 429/5xx
       │        - Deduplicate by advisory ID (GHSA, CVE)
       ├──► 3d. Correlate Findings & Severities
       │        - Critical / High / Medium / Low / Unknown
       │        - Persist Finding records
       ├──► 3e. Generate Artifacts
       │        - CycloneDX v1.5 JSON SBOM with SHA-256 checksum
       │        - JSON Audit Report
       │        - RFC-4180 CSV Audit Report
       └──► 3f. Update Scan status -> 'completed' or 'completed_with_findings'
```

---

## 4. Database Schema & Entities

The relational schema ensures ACID compliance, cascading deletions on project removal, and zero data leakage:

- **User**: User account credentials, email normalization, and audit timestamps.
- **Project**: Monitored repository workspace owned by a specific user.
- **Scan**: Lifecycle state (`queued`, `running`, `completed`, `completed_with_findings`, `incomplete`, `failed`, `cancelled`), finding counts, and scanner version.
- **Dependency**: Discovered package name, ecosystem (`npm` or `PyPI`), resolved version, declared version, and direct/transitive flag.
- **Vulnerability**: Authoritative advisory catalog entry (`advisory_id`, `severity`, CVSS `score`, `cvss_vector`, `affected_ranges`, `fixed_versions`, `references`).
- **Finding**: Many-to-many junction binding a `Scan`, an affected `Dependency`, and a specific `Vulnerability`.
- **SBOMArtifact**: Stored CycloneDX document with cryptographic SHA-256 checksum.
- **Report**: Stored audit report (JSON and CSV formats) for compliance retention.

---

## 5. Security & Isolation

- **Zero Arbitrary Execution**: The scanning engine operates purely as a static structured parser. User-supplied manifests are never executed with Node, npm, Python, or pip.
- **No Hallucinated Data**: Vulnerabilities are populated strictly from OSV disclosures. If an external service is unavailable, the scan fails cleanly with a documented network warning rather than returning an artificial "safe" status.
