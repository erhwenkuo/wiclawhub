# WiClawHub 實作計劃

## 概述

WiClawHub 是一個仿 [ClawHub](https://clawhub.ai/) 的技能（Skill）註冊與管理平台。後端使用 FastAPI + SQLAlchemy/SQLModel，前端使用 React (TanStack Start) + Tailwind CSS，API 規格與 ClawHub OpenAPI v1 完全相容。

---

## Milestone 1：專案基礎架構與開發環境 ✅

**目標：** 建立專案骨架、開發環境、CI 基礎設施。

### Backend (`backend/`)
- [x] 初始化 FastAPI 專案結構
- [x] 設定 `config.py`：使用 Pydantic Settings 管理環境變數
- [x] 設定 `database.py`：SQLAlchemy async engine、session factory
- [x] 設定 Alembic 做 DB migration
- [x] 設定 Uvicorn 啟動腳本
- [x] 基本健康檢查 endpoint `GET /health`

### Frontend (`frontend/`)
- [x] 初始化 React + TanStack Router + Vite 專案
- [x] 設定 Tailwind CSS 4
- [x] 設定基本路由結構
- [x] 建立 Layout 元件 (Header, Footer)

### 開發環境
- [x] 根目錄 `pyproject.toml` 整合 workspace
- [x] `.env.example` 範例配置檔
- [x] Docker Compose（SQLite + PostgreSQL）

**交付物：** 可啟動的空白 FastAPI 伺服器 + 空白前端頁面，`/health` 回傳 200。

---

## Milestone 2：資料模型與資料庫 ✅

**目標：** 定義所有核心資料表，完成 migration。

### 任務
- [x] 使用 SQLModel 定義所有 models（users, skills, skill_versions, skill_moderation, file_storage）
- [x] 自定義 JSONType TypeDecorator 解決 SQLite/PostgreSQL JSON 相容性
- [x] 建立 Alembic initial migration
- [x] 撰寫 seed data 腳本（開發用）
- [x] 確認 SQLite 與 PostgreSQL 相容

**交付物：** 所有資料表建立完成，migration 可正常執行。

---

## Milestone 3：核心 API — 技能 CRUD ✅

**目標：** 實作技能的基本 CRUD 操作，符合 OpenAPI spec。

- [x] 所有 Pydantic schemas 定義完成（camelCase aliases）
- [x] 14 個 API endpoints 全部實作完成
- [x] 服務層 `skill_service.py`（所有業務邏輯統一管理）
- [x] Bearer token 認證（SHA256 hash + DB lookup）
- [x] Rate limiting middleware（sliding window, 120 read/min, 30 write/min）
- [x] Cursor-based pagination

**交付物：** 所有 14 個 API endpoints 完成，通過測試。

---

## Milestone 4：前端 — 瀏覽與搜尋 ✅

**目標：** 實作技能瀏覽、搜尋、詳情頁面。

- [x] 首頁（hero + 最新 6 個技能）
- [x] 技能列表頁（cursor pagination）
- [x] 技能詳情頁（changelog, file viewer, versions sidebar, security badges）
- [x] 搜尋頁面
- [x] 所有元件：SkillCard, TagBadge, Spinner, ErrorMessage
- [x] API client + TanStack Query hooks

**交付物：** 可瀏覽技能列表、搜尋、查看技能詳情與檔案。

---

## Milestone 5：前端 — 使用者功能 ✅

**目標：** 實作認證、發布、管理功能。

- [x] Login 頁面（API token 認證）
- [x] Dashboard（我的技能列表，刪除功能）
- [x] Upload 頁面（多檔案上傳 + metadata）
- [x] Settings 頁面（profile + token 顯示）
- [x] AuthContext / AuthProvider（localStorage token 管理）

**交付物：** 完整的使用者功能，可登入、發布、管理技能。

---

## Milestone 6：進階功能與優化 ✅

**目標：** 完善系統，增加進階功能。

- [x] OpenAPI spec 自動生成（3.1.0, bearerAuth securityScheme）
- [x] Rate limiting middleware（in-memory sliding window）
- [x] 結構化日誌（RequestLoggingMiddleware）
- [x] 統一錯誤處理（AppError + error handlers）
- [x] CORS 設定
- [x] 深色/淺色主題切換（ThemeProvider + localStorage）
- [x] Dockerfile（backend + frontend）
- [x] Docker Compose（SQLite 版 + PostgreSQL 版）

**交付物：** 生產就緒的系統，可透過 Docker 部署。

---

## Milestone 7：測試與文件 ✅

**目標：** 完善測試覆蓋率與文件。

- [x] Backend 測試：32 tests passing（pytest-asyncio + httpx AsyncClient）
  - test_health, test_skills, test_versions, test_moderation_scan, test_file_download, test_search_resolve, test_auth
- [x] Frontend 測試：17 tests passing（Vitest + @testing-library/react）
  - format.test.ts（timeAgo, formatNumber, formatDate）
  - components.test.tsx（Spinner, TagBadge, ErrorMessage）
- [x] API 文件（Swagger UI at /docs, ReDoc at /redoc, tagged endpoints）
- [x] README.md（quickstart, API overview, project structure）
- [x] CLAUDE.md（dev norms）

**交付物：** 完整測試套件與文件。

---

## 技術決策記錄

| 決策 | 選擇 | 原因 |
|------|------|------|
| DB 預設 | SQLite | 開發簡單，零配置 |
| DB 可選 | PostgreSQL | 生產環境擴展性 |
| ORM | SQLModel | 結合 SQLAlchemy + Pydantic |
| 搜尋 | SQLite FTS5 / PostgreSQL tsvector | 無需外部搜尋引擎 |
| 檔案儲存 | 本地檔案系統 + DB metadata | 簡單，可擴展為 S3 |
| 認證 | Bearer API Token | 與 clawhub API spec 一致 |
| 前端框架 | TanStack Start + React | 與 clawhub 一致 |
| CSS | Tailwind CSS | 與 clawhub 一致 |
