# DependencyShield API Reference

The DependencyShield API is built with FastAPI and OpenAPI 3.1. Interactive Swagger documentation is available at `/docs` when running the backend.

Base URL: `http://localhost:8000/api/v1`

---

## 1. Authentication

### Register Account
`POST /api/v1/auth/register`

Creates a new user account and sets an `access_token` HttpOnly cookie.

**Request Body:**
```json
{
  "email": "analyst@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "3f8b0e7c-8d1a-4f5e-9a2b-1c3d4e5f6a7b",
    "email": "analyst@example.com",
    "created_at": "2026-10-25T12:00:00Z"
  }
}
```

### Sign In
`POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "analyst@example.com",
  "password": "SecurePassword123!"
}
```

### Sign Out
`POST /api/v1/auth/logout`

Clears the session cookie.

---

## 2. Projects

### List Projects
`GET /api/v1/projects`
Requires Bearer token or HttpOnly session cookie.

**Response (200 OK):**
```json
[
  {
    "id": "proj-uuid",
    "owner_id": "user-uuid",
    "name": "Backend API",
    "description": "FastAPI microservice",
    "source_type": "manual_upload",
    "created_at": "2026-10-25T12:00:00Z",
    "updated_at": "2026-10-25T12:00:00Z",
    "scan_count": 2,
    "latest_scan_status": "completed_with_findings",
    "open_vulnerabilities": 3
  }
]
```

### Create Project
`POST /api/v1/projects`

**Request Body:**
```json
{
  "name": "Payment Gateway",
  "description": "PCI-DSS compliant payment processor"
}
```

---

## 3. Scans

### Submit Manifest for Scanning
`POST /api/v1/scans`
Content-Type: `multipart/form-data`

**Form Parameters:**
- `project_id`: string (UUID of user's project)
- `file`: binary (Supported: `package-lock.json`, `package.json`, `requirements.txt`, `pyproject.toml`)

**Response (202 Accepted):**
```json
{
  "scan_id": "scan-uuid",
  "status": "queued",
  "message": "Dependency scan has been queued for background analysis."
}
```

### Get Scan Status & Findings
`GET /api/v1/scans/{scan_id}`

**Response (200 OK):**
```json
{
  "id": "scan-uuid",
  "project_id": "proj-uuid",
  "status": "completed_with_findings",
  "dependency_count": 42,
  "finding_count": 2,
  "critical_count": 1,
  "high_count": 1,
  "medium_count": 0,
  "low_count": 0,
  "unknown_count": 0,
  "error_summary": null,
  "warnings": [],
  "manifest_name": "package-lock.json",
  "ecosystem": "npm",
  "scanner_version": "1.0.0",
  "created_at": "2026-10-25T12:05:00Z",
  "dependencies": [...],
  "findings": [...]
}
```

---

## 4. Software Bill of Materials (SBOM)

### Retrieve CycloneDX SBOM
`GET /api/v1/scans/{scan_id}/sbom`

Returns standard CycloneDX v1.5 JSON schema document including all parsed components, Package URLs (PURLs), and matched vulnerability ratings.

### Download SBOM File
`GET /api/v1/scans/{scan_id}/sbom/download`

Returns Content-Disposition `attachment; filename="cyclonedx-sbom-{project}-{id}.json"`.

---

## 5. Security Reports

### Download Audit Report
`GET /api/v1/reports/{report_id}/download`

Returns `text/csv` or `application/json` report containing scan metadata, severity breakdowns, affected packages, resolved versions, and authoritative advisory references.

---

## 6. Health Checks

- `GET /health/live`: Liveness check (200 OK)
- `GET /health/ready`: Readiness check (verifies database connectivity, 200 OK or 503 Service Unavailable)
