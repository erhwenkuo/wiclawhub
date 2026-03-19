# WiClawHub — 開發說明

## 專案概述

WiClawHub 是一個仿 ClawHub (https://clawhub.ai/) 的技能註冊平台。API spec 須與 ClawHub OpenAPI v1 完全一致。

## 開發環境

- Python 3.13，使用 `uv` 管理套件
- 使用 Python 前務必先執行：`source .venv/bin/activate`
- Backend 位於 `backend/` 目錄
- Frontend 位於 `frontend/` 目錄

## Backend 開發規範

### 技術棧
- FastAPI + Uvicorn
- SQLModel (SQLAlchemy + Pydantic)
- SQLite (預設) / PostgreSQL (可配置)
- Alembic (DB migration)

### 資料庫切換
- 透過 `DATABASE_URL` 環境變數控制
- 預設：`sqlite+aiosqlite:///./wiclawhub.db`
- PostgreSQL：`postgresql+asyncpg://user:pass@host:5432/dbname`
- JSON 欄位需同時相容 SQLite 和 PostgreSQL

### API 規格
- 所有 API 端點須符合 ClawHub OpenAPI v1 spec
- Base path: `/api/v1/`
- 認證：Bearer token (HTTP header)
- Rate limit: 讀 120/min, 寫 30/min
- 共 14 個端點（11 GET, 2 POST, 1 DELETE）

### 程式碼組織
```
backend/app/
├── main.py          # App factory, middleware, router mounting
├── config.py        # Pydantic Settings (env-based config)
├── database.py      # Engine, session, Base
├── models/          # SQLModel table models
├── schemas/         # Pydantic request/response schemas
├── routers/         # FastAPI routers (one per resource)
├── services/        # Business logic (one per domain)
└── auth/            # Token auth, dependencies
```

### 常用指令
```bash
source .venv/bin/activate
cd backend
uvicorn app.main:app --reload --port 8000    # 啟動開發伺服器
alembic upgrade head                          # 執行 migration
alembic revision --autogenerate -m "desc"     # 產生 migration
pytest                                        # 執行測試
pytest --cov=app                              # 測試 + 覆蓋率
```

## Frontend 開發規範

### 技術棧
- TanStack Router + React 19
- Vite 6
- Tailwind CSS 4
- Monaco Editor（程式碼檢視）
- react-markdown + remark-gfm（Markdown 渲染）
- TanStack Query（資料請求）

### 頁面結構
- `/` — 首頁
- `/skills` — 技能列表
- `/skills/:slug` — 技能詳情
- `/search` — 搜尋
- `/dashboard` — 使用者儀表板
- `/settings` — 設定
- `/upload` — 發布技能

### 常用指令
```bash
cd frontend
npm install          # 安裝依賴
npm run dev          # 啟動開發伺服器
npm run build        # 建置
npm test             # 測試
```

## 重要注意事項

1. **API 相容性**：所有端點的路徑、參數、回應格式必須與 ClawHub OpenAPI spec 一致
2. **資料庫相容**：SQL 語法和 JSON 欄位處理須同時支援 SQLite 和 PostgreSQL
3. **認證端點**：`POST /skills`, `DELETE /skills/{slug}`, `POST /skills/{slug}/undelete`, `GET /whoami` 需要 Bearer token
4. **Cursor Pagination**：`/skills` 和 `/skills/{slug}/versions` 使用 cursor-based 分頁
5. **軟刪除**：技能使用 `is_deleted` 標記，不做實體刪除
