# WiClawHub

WiClawHub 是一個技能（Skill）註冊與管理平台，靈感來自 [ClawHub](https://clawhub.ai/)。提供技能的發布、版本管理、搜尋與下載功能，API 與 ClawHub OpenAPI v1 規格完全相容。

## 功能特色

- **技能管理** — 發布、更新、刪除、恢復技能
- **語意化版本控制** — 每次發布產生新版本，附帶 changelog
- **全文搜尋** — 依關鍵字搜尋技能
- **檔案管理** — 技能可包含多個檔案，支援線上瀏覽與下載
- **安全掃描** — 自動掃描技能檔案安全性
- **審核系統** — 標記可疑或惡意技能
- **使用者認證** — Email/密碼註冊登入、GitHub OAuth、Google OAuth、API token
- **JWT Session** — 短期 access token + 可輪替 refresh token
- **Rate Limiting** — 讀取 120/min，寫入 30/min

## 技術架構

### Backend

| 元件 | 技術 | 用途 |
|------|------|------|
| Web Framework | FastAPI | 高效能 API 框架 |
| Database | SQLite (預設) / PostgreSQL | 持久化資料儲存 |
| ORM | SQLAlchemy / SQLModel | 資料庫互動與資料建模 |
| Data Validation | Pydantic | 型別安全的請求/回應驗證 |
| Server | Uvicorn | ASGI 伺服器 |
| Migration | Alembic | 資料庫遷移 |
| Auth | bcrypt + python-jose | 密碼雜湊 + JWT |
| HTTP Client | httpx | OAuth token 交換 |

### Frontend

| 元件 | 技術 | 用途 |
|------|------|------|
| Framework | TanStack Router + React | SPA 路由框架 |
| Build Tool | Vite | 快速開發建置工具 |
| Styling | Tailwind CSS | Utility-first CSS |
| Code Editor | Monaco Editor | 線上程式碼檢視 |
| Markdown | react-markdown | Markdown 渲染 |
| Icons | lucide-react | 圖示庫 |

## 快速開始

### 前置需求

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) (Python 套件管理)
- Node.js 20+ (前端套件管理)

### Backend 啟動

```bash
# 啟動虛擬環境
source .venv/bin/activate

# 安裝 backend 依賴
cd backend
uv pip install -e ".[dev]"

# 執行資料庫遷移
alembic upgrade head

# 啟動開發伺服器
uvicorn app.main:app --reload --port 8000
```

### Frontend 啟動

```bash
cd frontend

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

### 環境變數

複製 `.env.example` 為 `.env` 並修改：

```env
# Database (預設使用 SQLite，需使用 async driver)
DATABASE_URL=sqlite+aiosqlite:///./wiclawhub.db

# 切換為 PostgreSQL
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/wiclawhub

# Auth
SECRET_KEY=your-secret-key

# JWT (預設使用 SECRET_KEY)
# JWT_SECRET_KEY=
# JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
# JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth - GitHub (至 GitHub Developer Settings 建立 OAuth App)
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=

# OAuth - Google (至 Google Cloud Console 建立 OAuth 2.0 憑證)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# Frontend URL (OAuth callback 用)
FRONTEND_URL=http://localhost:5173

# Rate limiting (requests per minute)
RATE_LIMIT_READ=120
RATE_LIMIT_WRITE=30
```

## API 文件

啟動後端後，存取：

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## API 端點概覽

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| GET | `/api/v1/search` | 搜尋技能 | - |
| GET | `/api/v1/resolve` | 依 hash 解析版本 | - |
| GET | `/api/v1/skills` | 列出技能 | - |
| POST | `/api/v1/skills` | 發布技能版本 | Bearer |
| GET | `/api/v1/skills/{slug}` | 取得技能 | - |
| DELETE | `/api/v1/skills/{slug}` | 軟刪除技能 | Bearer |
| POST | `/api/v1/skills/{slug}/undelete` | 恢復刪除 | Bearer |
| GET | `/api/v1/skills/{slug}/versions` | 列出版本 | - |
| GET | `/api/v1/skills/{slug}/versions/{version}` | 取得特定版本 | - |
| GET | `/api/v1/skills/{slug}/moderation` | 取得審核資訊 | - |
| GET | `/api/v1/skills/{slug}/scan` | 安全掃描詳情 | - |
| GET | `/api/v1/skills/{slug}/file` | 取得原始檔案 | - |
| GET | `/api/v1/download` | 下載 zip | - |
| GET | `/api/v1/whoami` | 當前使用者 | Bearer |
| POST | `/api/v1/auth/register` | Email/密碼註冊 | - |
| POST | `/api/v1/auth/login` | Email/密碼登入 | - |
| POST | `/api/v1/auth/refresh` | 刷新 access token | - |
| POST | `/api/v1/auth/logout` | 登出 (撤銷 refresh token) | Bearer |
| GET | `/api/v1/auth/oauth/{provider}/authorize` | 開始 OAuth 流程 | - |
| GET | `/api/v1/auth/oauth/{provider}/callback` | OAuth 回呼 | - |

## 專案結構

```
wiclawhub/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 應用程式入口
│   │   ├── config.py         # 設定管理
│   │   ├── database.py       # 資料庫連線
│   │   ├── models/           # SQLModel 資料模型
│   │   ├── schemas/          # Pydantic 請求/回應模型
│   │   ├── routers/          # API 路由
│   │   ├── services/         # 業務邏輯
│   │   └── auth/             # 認證
│   ├── tests/                # 測試
│   ├── alembic/              # 資料庫遷移
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── routes/           # 頁面路由
│   │   ├── components/       # React 元件
│   │   ├── lib/              # 工具函式
│   │   └── styles.css        # 全域樣式
│   └── package.json
├── PLAN.md                   # 實作計劃
├── CLAUDE.md                 # 開發說明
└── README.md                 # 本文件
```

## 授權

MIT License
