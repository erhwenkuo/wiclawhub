<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

# WiClawHub

WiClawHub is a entrprise ready & self hosted agent skill registration and management platform inspired by [ClawHub](https://clawhub.ai/). 

It provides skill publishing, version management, search, and download capabilities, with an API fully compatible with the ClawHub OpenAPI v1 spec.

![](./docs/assets/wilclawhub_cover.png)

## Documentation

- English (default): `README.md` (this file)
  - [How to use ClawHub cli with WiClawHub](./docs/clawhub_cli.md)
- Traditional Chinese：[`README_zh-TW.md`](README_zh-TW.md)
- Simplified Chinese：[`README_zh-CN.md`](README_zh-CN.md)

## Why Build This

Using public Skill Hubs (e.g., [ClawHub](https://clawhub.ai/), [SkillHub](https://www.skillhub.club/)) to create or download "skills" raises serious security concerns, primarily because these public platforms are vulnerable to large-scale supply chain attacks and malware infiltration.

Enterprises build self-hosted agent Skill Hubs to transform scattered AI capabilities into manageable, reusable, and secure corporate assets.

![](./docs/assets/wiclaw_hub_purpose.png)

Key reasons:

1. **Security & Data Sovereignty**
   - **Private Logic Protection**: Enterprise skills often contain sensitive business logic, API keys, or internal system access. Self-hosted deployment ensures that skill definitions never leak to public clouds.
   - **Access Control (RBAC)**: A self-hosted Skill Hub enables fine-grained control over who (which department or AI agent) can invoke specific high-privilege skills (e.g., HR changes or financial transfers).

2. **Governance & Standardization**
   - **Single Source of Truth**: Prevents departments from independently developing duplicate skills (e.g., three different versions of "query inventory"). The registry ensures the entire organization uses verified, quality-consistent skill versions.
   - **Version Management**: When backend APIs update, the Skill Registry enables version switching (v1.0 to v2.0), ensuring production AI agents don't break due to underlying tool changes.

3. **Operational Efficiency & Discoverability**
   - **Cross-Team Sharing**: Developers simply "register" their Python scripts or API tools, and AI agents across other departments can immediately discover and use them, maximizing development ROI.
   - **Token Optimization**: No need to stuff all tool descriptions into prompts. AI agents can dynamically retrieve and load relevant skills from the Skill Registry based on the current task, saving tokens and improving accuracy.

4. **Compliance & Auditing**
   - **Complete Logging**: A self-hosted hub can fully record "who called which skill, when, with what input and output" — a requirement for passing compliance audits in highly regulated industries like finance and healthcare.
   - **Stability Monitoring**: Enterprises can monitor call success rates and latency for specific skills, and promptly fix broken internal integration points.

5. **Custom Business Domain Knowledge**
   - **Proprietary Workflows**: General-purpose AI (e.g., ChatGPT) doesn't understand proprietary internal processes. A Skill Hub allows enterprises to package complex SOPs (e.g., "onboarding review process" or "patent search logic") into standardized skills, giving AI real business execution capability.



## Features

- **Skill Management** — Publish, update, delete, and restore skills
- **Semantic Versioning** — Each publish creates a new version with a changelog
- **Full-Text Search** — Search skills by keyword
- **File Management** — Skills can contain multiple files with online browsing and download
- **Security Scanning** — Automatic security scanning of skill files
- **Moderation System** — Flag suspicious or malicious skills
- **User Authentication** — Email/password registration and login, GitHub OAuth, Google OAuth, API token
- **JWT Sessions** — Short-lived access tokens + rotatable refresh tokens
- **Rate Limiting** — Read 120/min, Write 30/min

## Tech Stack

### Backend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Web Framework | FastAPI | High-performance API framework |
| Database | SQLite (default) / PostgreSQL | Persistent data storage |
| ORM | SQLAlchemy / SQLModel | Database interaction and data modeling |
| Data Validation | Pydantic | Type-safe request/response validation |
| Server | Uvicorn | ASGI server |
| Migration | Alembic | Database migrations |
| Auth | bcrypt + python-jose | Password hashing + JWT |
| HTTP Client | httpx | OAuth token exchange |

### Frontend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | TanStack Router + React | SPA routing framework |
| Build Tool | Vite | Fast development build tool |
| Styling | Tailwind CSS | Utility-first CSS |
| Code Editor | Monaco Editor | Online code viewer |
| Markdown | react-markdown | Markdown rendering |
| Icons | lucide-react | Icon library |

## Quick Start

### Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Node.js 20+ (frontend package management)

### Backend Setup

```bash
# Activate virtual environment
source .venv/bin/activate

# Install backend dependencies
cd backend
uv pip install -e ".[dev]"

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and modify:

```env
# Site name (displayed in header, footer, and home page)
# SKILL_SITE_NAME=WiClawHub

# Database (defaults to SQLite, requires async driver)
DATABASE_URL=sqlite+aiosqlite:///./wiclawhub.db

# Switch to PostgreSQL
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/wiclawhub

# Auth
SECRET_KEY=your-secret-key

# JWT (defaults to SECRET_KEY)
# JWT_SECRET_KEY=
# JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
# JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth - GitHub (create an OAuth App in GitHub Developer Settings)
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=

# OAuth - Google (create OAuth 2.0 credentials in Google Cloud Console)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# Frontend URL (for OAuth callbacks)
FRONTEND_URL=http://localhost:5173

# Rate limiting (requests per minute)
RATE_LIMIT_READ=120
RATE_LIMIT_WRITE=30
```

## API Documentation

After starting the backend, visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/search` | Search skills | - |
| GET | `/api/v1/resolve` | Resolve version by hash | - |
| GET | `/api/v1/skills` | List skills | - |
| POST | `/api/v1/skills` | Publish skill version | Bearer |
| GET | `/api/v1/skills/{slug}` | Get skill | - |
| DELETE | `/api/v1/skills/{slug}` | Soft-delete skill | Bearer |
| POST | `/api/v1/skills/{slug}/undelete` | Restore deleted skill | Bearer |
| GET | `/api/v1/skills/{slug}/versions` | List versions | - |
| GET | `/api/v1/skills/{slug}/versions/{version}` | Get specific version | - |
| GET | `/api/v1/skills/{slug}/moderation` | Get moderation info | - |
| GET | `/api/v1/skills/{slug}/scan` | Security scan details | - |
| GET | `/api/v1/skills/{slug}/file` | Get raw file | - |
| GET | `/api/v1/download` | Download zip | - |
| GET | `/api/v1/whoami` | Current user | Bearer |
| POST | `/api/v1/auth/register` | Email/password registration | - |
| POST | `/api/v1/auth/login` | Email/password login | - |
| POST | `/api/v1/auth/refresh` | Refresh access token | - |
| POST | `/api/v1/auth/logout` | Logout (revoke refresh token) | Bearer |
| GET | `/api/v1/auth/oauth/{provider}/authorize` | Start OAuth flow | - |
| GET | `/api/v1/auth/oauth/{provider}/callback` | OAuth callback | - |

## Project Structure

```
wiclawhub/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application entry point
│   │   ├── config.py         # Configuration management
│   │   ├── database.py       # Database connection
│   │   ├── models/           # SQLModel data models
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── routers/          # API routes
│   │   ├── services/         # Business logic
│   │   └── auth/             # Authentication
│   ├── tests/                # Tests
│   ├── alembic/              # Database migrations
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── routes/           # Page routes
│   │   ├── components/       # React components
│   │   ├── lib/              # Utility functions
│   │   └── styles.css        # Global styles
│   └── package.json
├── PLAN.md                   # Implementation plan
├── CLAUDE.md                 # Development guide
└── README.md                 # This file
```


## License

MIT License
