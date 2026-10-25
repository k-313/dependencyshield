# DependencyShield 🛡️
### AI-Powered Software Dependency Vulnerability Scanner & Supply Chain Security Platform

DependencyShield is a full-stack, enterprise-grade software supply chain security application that analyzes dependency manifests, identifies known open-source vulnerabilities via Google's Open Source Vulnerability (OSV) database, generates standardized CycloneDX v1.5 Software Bills of Materials (SBOMs), tracks security findings over time, and provides grounded, evidence-based remediation roadmaps.

---

## 🌟 Key Capabilities

- **Zero-Execution Manifest Analysis**: Strict static parsing of Node.js (`package-lock.json` v1-v3, `package.json`) and Python (`requirements.txt`, `pyproject.toml` PEP 508/621 & Poetry). Manifests are **never executed** and packages are **never installed** during analysis.
- **Authoritative Vulnerability Feed**: Real batch integration with the official Google OSV API (`https://api.osv.dev/v1/querybatch`) with exponential backoff and rate-limit retry handling.
- **Standardized CycloneDX v1.5 SBOMs**: Automatic generation of compliant CycloneDX JSON artifacts with Package URLs (PURLs), direct/transitive relationships, and SHA-256 cryptographic checksums.
- **Compliance Audit Reports**: Instant export in machine-readable JSON and RFC-4180 CSV spreadsheet formats for compliance and external auditing.
- **Grounded AI Security Advisor**: Evidence-based remediation guidance powered by Google Gemini (via `google-genai` SDK) with strict constraints against hallucinating CVEs or fictitious versions, paired with a 100% deterministic rule-based offline fallback.
- **Enterprise Multi-Tenant Security**: Password hashing with salted `bcrypt`, signed JWT sessions with `HttpOnly` and `SameSite` cookies, request correlation IDs, security headers (`nosniff`, `DENY`), and verified ownership isolation across all endpoints.

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), TypeScript (Strict Mode), Tailwind CSS v4, Lucide React, Recharts, React Hook Form, Zod |
| **Backend** | Python 3.11+, FastAPI, Pydantic V2, SQLAlchemy 2.0, Alembic, HTTPX (Async), Pytest |
| **Database** | PostgreSQL (Neon for production), SQLite (Zero-config local development) |
| **Security Feeds** | Google OSV (Open Source Vulnerability) API |
| **AI Engine** | Google Gemini API (`google-genai` SDK) with deterministic fallback |
| **CI / CD** | GitHub Actions (`.github/workflows/ci.yml`) |

---

## 📋 Prerequisites for Windows 10/11

Ensure the following tools are installed on your system:
- **Git**: `git --version` (>= 2.40)
- **Node.js & npm**: `node --version` (>= 18.0.0), `npm.cmd --version`
- **Python**: `python --version` (>= 3.10)

---

## 🚀 Local Windows Setup (PowerShell)

### 1. Clone & Set Up the Repository

Open a PowerShell terminal:

```powershell
# Navigate to your workspace directory
cd C:\Users\user\.gemini\antigravity\scratch\dependencyshield
```

### 2. Configure Backend Virtual Environment & Dependencies

```powershell
# Navigate to backend
cd backend

# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Upgrade pip and install pinned backend dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# Run database migrations to initialize tables
alembic upgrade head
```

### 3. Configure Frontend Dependencies

In a second PowerShell terminal:

```powershell
cd C:\Users\user\.gemini\antigravity\scratch\dependencyshield\frontend

# Install frontend dependencies with npm
npm.cmd install --legacy-peer-deps
```

---

## 🏃 Running the Application Locally

Run the backend and frontend services in separate PowerShell windows:

### Terminal 1: FastAPI Backend
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\dependencyshield\backend
.\.venv\Scripts\Activate.ps1

# Bind to 0.0.0.0 (accessible locally and across LAN / VM / WSL interfaces)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Or simply: python -m app.main
```
- API Base: `http://localhost:8000` (or `http://<your-lan-ip>:8000`)
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/health/live`

### Terminal 2: Next.js Frontend
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\dependencyshield\frontend

# Starts Next.js bound to 0.0.0.0:3000 (accessible locally and across LAN)
npm.cmd run dev
```
- Web Application UI: `http://localhost:3000` (or `http://<your-lan-ip>:3000`)
- *Tip*: The frontend automatically detects `window.location.hostname` so LAN/VM devices automatically connect to the backend at `http://<your-lan-ip>:8000`.

---

## 🧪 Running Automated Tests

### Backend Unit & Integration Tests (Pytest)
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\dependencyshield\backend
.\.venv\Scripts\Activate.ps1
python -m pytest -v
```
*Executes 23 tests verifying authentication, project ownership, parser correctness, OSV error resilience, CycloneDX SBOM structure, CSV/JSON report exports, and full 12-step E2E scanner workflows.*

### Frontend Unit & Component Tests (Vitest)
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\dependencyshield\frontend
npm.cmd test
```

### Frontend Linting & Production Build
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\dependencyshield\frontend
npm.cmd run lint
npm.cmd run build
```

---

## ⚙️ Environment Variables

Create `.env` in the backend directory based on `.env.example`:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Environment name (`development` or `production`) | `development` |
| `SECRET_KEY` | Salt/Key for JWT signing (32+ chars) | `dev-secret-key-...` |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./dependencyshield.db` |
| `OSV_API_BASE_URL` | Base URL for Google OSV API | `https://api.osv.dev/v1` |
| `OSV_BATCH_SIZE` | Chunk size for batch queries | `100` |
| `GEMINI_API_KEY` | Optional Google Gemini API key for AI assistant | `None` (uses rule-based engine) |
| `NEXT_PUBLIC_API_URL`| API URL accessible by the browser frontend | `http://localhost:8000` |

---

## 🌐 Production Deployment

### 1. Database (Neon PostgreSQL)
1. Provision a free PostgreSQL database on [Neon](https://neon.tech).
2. Copy the connection string (with pooled connection or direct):
   ```bash
   DATABASE_URL="postgresql://user:password@ep-sample-pooler.region.neon.tech/dependencyshield?sslmode=require"
   ```
3. Run Alembic migrations against Neon:
   ```powershell
   alembic upgrade head
   ```

### 2. Backend (Render / Railway / Fly.io)
1. Deploy the `backend/` directory as a Python web service.
2. Build command: `pip install -r requirements.txt && alembic upgrade head`
3. Start command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set environment variables: `DATABASE_URL`, `SECRET_KEY`, `ENVIRONMENT=production`.

### 3. Frontend (Vercel)
1. Import the repository on [Vercel](https://vercel.com) and configure root directory to `frontend`.
2. Framework preset: **Next.js**.
3. Set environment variable: `NEXT_PUBLIC_API_URL="https://your-backend-api.onrender.com"`.
4. Deploy.

---

## 🔍 Known Limitations & Design Choices

1. **Lockfiles Preferred for Determinism**: While `package.json` and unpinned `requirements.txt` are parsed, exact vulnerability matching requires resolved versions. Uploading lockfiles (`package-lock.json`) is strongly encouraged; the scanner records a coverage notice when range constraints are detected.
2. **OSV Rate Limits**: The engine implements batching in groups of 100 with exponential backoff. In the event of an upstream service outage, scans transition to `failed` rather than providing an inaccurate "clean" finding count.

---

## 📄 License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
