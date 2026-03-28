<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

# WiClawHub

WiClawHub 是一个企业级、可自建部署的代理人技能注册与管理平台，灵感来自 [ClawHub](https://clawhub.ai/)。

提供技能的发布、版本管理、搜索与下载功能，API 与 ClawHub OpenAPI v1 规格完全兼容。

![](./docs/assets/wilclawhub_cover.png)

## 文档

- 英文（默认）：[`README.md`](README.md)
  - [如何搭配 WiClawHub 使用 ClawHub CLI](./docs/clawhub_cli.md)
- 繁体中文：[`README_zh-TW.md`](README_zh-TW.md)
- 简体中文：`README_zh-CN.md`（本文件）

## 构建原由

使用公开的 Skill Hub（例如 [ClawHub](https://clawhub.ai/), [SkillHub](https://www.skillhub.club/)）上建立或下载"技能"（Skills）会引发严重的安全问题，主要是因为这些公开的 Skill 平台容易遭遇大规模的供应链攻击与恶意软件渗透。

企业建立自建（Self-hosted）代理人技能枢纽（Skill Hub），主要是为了将分散的 AI 能力转化为可管理、可复用且安全的企业资产。

![](./docs/assets/wiclaw_hub_purpose.png)

以下是核心原因：

1. **安全与数据主权 (Security & Data Sovereignty)**
   - **私有逻辑保护**：企业内部的技能通常包含敏感的业务逻辑、API 密钥或内部系统访问权。自建部署能确保这些"技能定义"不会流向公共云端，防止企业资产外泄。
   - **权限管控 (RBAC)**：通过自建 Skill Hub，企业可以精确控制谁（哪个部门或哪个 AI 代理人）有权调用特定的高权限技能（例如：人力资源变更或财务转账）。

2. **治理与标准化 (Governance & Standardization)**
   - **单一事实来源 (Single Source of Truth)**：避免各部门各自开发重复的技能（例如有三种不同版本的"查询库存"工具）。注册表能确保全公司使用经过验证、质量统一的技能版本。
   - **版本管理**：当后端 API 更新时，通过 Skill Registry 可以进行版本切换（v1.0 到 v2.0），确保生产环境中的 AI 代理人不会因为底层工具变动而突然失效。

3. **提升运作效率与可发现性 (Operational Efficiency)**
   - **跨团队共享**：开发者只需将写好的 Python 脚本或 API 工具"注册"进去，其他部门的 AI 代理人就能立即发现并套用，极大化开发投资回报率（ROI）。
   - **降低模型负担 (Token Optimization)**：不需要把所有工具说明都塞进 Prompt。AI 代理人可以根据当前任务，动态地从 Skill Registry 检索并载入相关技能，节省 Token 并提高精准度。

4. **合规与审计 (Compliance & Auditing)**
   - **完整日志**：自建枢纽能完整记录"谁在何时、调用了哪个技能、输入与输出为何"，这对金融、医疗等受高度监管的行业来说，是通过合规审查的必要条件。
   - **稳定性监控**：企业可以监控特定技能的调用成功率与延迟，及时修复失效的内部集成点。

5. **定制化业务领域知识**
   - **专属工作流**：通用型 AI（如 ChatGPT）不了解企业内部的专有流程。Skill Hub 允许企业将复杂的 SOP（如"入职审核流程"或"专利检索逻辑"）封装成标准化技能，让 AI 具备真正的业务执行力。

## 功能特色

- **技能管理** — 发布、更新、删除、恢复技能
- **语义化版本控制** — 每次发布产生新版本，附带 changelog
- **全文搜索** — 依关键字搜索技能
- **文件管理** — 技能可包含多个文件，支持在线浏览与下载
- **安全扫描** — 自动扫描技能文件安全性
- **审核系统** — 标记可疑或恶意技能
- **用户认证** — Email/密码注册登录、GitHub OAuth, Google OAuth, API token
- **JWT Session** — 短期 access token + 可轮替 refresh token
- **Rate Limiting** — 读取 120/min，写入 30/min

## 技术架构

### Backend

| 组件 | 技术 | 用途 |
|------|------|------|
| Web Framework | FastAPI | 高性能 API 框架 |
| Database | SQLite (默认) / PostgreSQL | 持久化数据存储 |
| ORM | SQLAlchemy / SQLModel | 数据库交互与数据建模 |
| Data Validation | Pydantic | 类型安全的请求/响应验证 |
| Server | Uvicorn | ASGI 服务器 |
| Migration | Alembic | 数据库迁移 |
| Auth | bcrypt + python-jose | 密码哈希 + JWT |
| HTTP Client | httpx | OAuth token 交换 |

### Frontend

| 组件 | 技术 | 用途 |
|------|------|------|
| Framework | TanStack Router + React | SPA 路由框架 |
| Build Tool | Vite | 快速开发构建工具 |
| Styling | Tailwind CSS | Utility-first CSS |
| Code Editor | Monaco Editor | 在线代码查看 |
| Markdown | react-markdown | Markdown 渲染 |
| Icons | lucide-react | 图标库 |

## 快速开始

### 方式 A：Docker 部署（推荐）

最快速的启动方式，仅需安装 [Docker](https://docs.docker.com/get-docker/) 和 Docker Compose。

#### 1. 配置环境变量

从模板创建 `.env.docker` 文件（与开发用的 `.env` 分开，避免冲突）：

```bash
cp .env.docker.example .env.docker
vi .env.docker
```

> **提示：** Docker Compose 仅会自动读取 `.env` 进行变量替换。由于我们使用独立的 `.env.docker` 文件，执行 `docker compose` 命令时须加上 `--env-file .env.docker`。本指南中的所有 Docker 命令已包含此参数。

至少设置以下项目：

```env
# 必须：请改为安全的随机字符串
SECRET_KEY=your-secret-random-string

# 局域网 / 远程访问：设为服务器的 IP 或域名
# 若仅从 localhost 访问，可跳过此项
SITE_URL=http://192.168.50.25

# 可选：PostgreSQL 密码（默认：wiclawhub）
# POSTGRES_PASSWORD=your-db-password
```

> **重要：** `SITE_URL` 控制 ClawHub CLI 如何发现你的实例。若局域网中的其他机器需要访问 WiClawHub，请设为服务器的局域网 IP（例如 `http://192.168.50.25`）或域名。若仅从 `localhost` 访问，可跳过此设置。

#### 2. 选择数据库并启动

**使用 SQLite**（简单，无需外部数据库）：

```bash
docker compose --env-file .env.docker up -d
```

**使用 PostgreSQL**（建议用于生产环境）：

```bash
docker compose --env-file .env.docker -f docker-compose.postgres.yml up -d
```

#### 3. 验证

```bash
# 确认所有容器正在运行
docker compose ps

# 测试健康检查端点
curl http://localhost/health

# 测试服务发现（供 ClawHub CLI 使用）
curl http://localhost/.well-known/clawhub.json
```

在浏览器中打开 `http://localhost`（或 `http://<你的服务器 IP>`）即可访问 WiClawHub。

#### 4. 连接 ClawHub CLI

在任何需要与 WiClawHub 交互的机器上：

```bash
# 将 CLI 指向你的 WiClawHub 实例
export CLAWHUB_SITE="http://192.168.50.25"
export CLAWHUB_REGISTRY="http://192.168.50.25"
export CLAWHUB_DISABLE_TELEMETRY=1

# 登录（打开浏览器进行认证）
npx clawhub@latest login
```

#### Docker 环境变量参考

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SITE_URL` | `http://localhost` | WiClawHub 的公开 URL（用于 CLI 发现、CORS、OAuth 回调） |
| `SECRET_KEY` | `change-me-in-production` | JWT 签名密钥 — **生产环境必须更改** |
| `POSTGRES_PASSWORD` | `wiclawhub` | PostgreSQL 密码（仅适用于 `docker-compose.postgres.yml`） |

#### 停止与清理

```bash
# 停止服务（保留数据）
docker compose down

# 停止并移除所有数据（重新开始）
docker compose down -v
```

---

### 方式 B：本地开发

适用于需要热重载（hot-reload）与调试的开发环境。

#### 前置需求

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) (Python 包管理)
- Node.js 20+ (前端)

#### 环境变量

复制 `.env.example` 为 `.env` 并修改：

```env
# 数据库（默认使用 SQLite）
DATABASE_URL=sqlite+aiosqlite:///./wiclawhub.db

# 切换为 PostgreSQL：
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/wiclawhub

# Auth
SECRET_KEY=your-secret-key

# Frontend URL（Vite 开发服务器）
FRONTEND_URL=http://localhost:5173

# OAuth - GitHub（在 GitHub Developer Settings 创建 OAuth App）
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=

# OAuth - Google（在 Google Cloud Console 创建 OAuth 2.0 凭证）
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
```

#### Backend 启动

```bash
# 启动虚拟环境
source .venv/bin/activate

# 安装 backend 依赖
cd backend
uv pip install -e ".[dev]"

# 执行数据库迁移
alembic upgrade head

# 启动开发服务器
uvicorn app.main:app --reload --port 8000
```

#### Frontend 启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行于 `http://localhost:5173`，并将 API 请求代理至后端的 `http://localhost:8000`。

## API 文档

启动后端后，访问：

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## API 端点概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/search` | 搜索技能 | - |
| GET | `/api/v1/resolve` | 依 hash 解析版本 | - |
| GET | `/api/v1/skills` | 列出技能 | - |
| POST | `/api/v1/skills` | 发布技能版本 | Bearer |
| GET | `/api/v1/skills/{slug}` | 获取技能 | - |
| DELETE | `/api/v1/skills/{slug}` | 软删除技能 | Bearer |
| POST | `/api/v1/skills/{slug}/undelete` | 恢复删除 | Bearer |
| GET | `/api/v1/skills/{slug}/versions` | 列出版本 | - |
| GET | `/api/v1/skills/{slug}/versions/{version}` | 获取特定版本 | - |
| GET | `/api/v1/skills/{slug}/moderation` | 获取审核信息 | - |
| GET | `/api/v1/skills/{slug}/scan` | 安全扫描详情 | - |
| GET | `/api/v1/skills/{slug}/file` | 获取原始文件 | - |
| GET | `/api/v1/download` | 下载 zip | - |
| GET | `/api/v1/whoami` | 当前用户 | Bearer |
| POST | `/api/v1/auth/register` | Email/密码注册 | - |
| POST | `/api/v1/auth/login` | Email/密码登录 | - |
| POST | `/api/v1/auth/refresh` | 刷新 access token | - |
| POST | `/api/v1/auth/logout` | 登出 (撤销 refresh token) | Bearer |
| GET | `/api/v1/auth/oauth/{provider}/authorize` | 开始 OAuth 流程 | - |
| GET | `/api/v1/auth/oauth/{provider}/callback` | OAuth 回调 | - |

## 项目结构

```
wiclawhub/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI 应用程序入口
│   │   ├── config.py          # 配置管理
│   │   ├── database.py        # 数据库连接
│   │   ├── models/            # SQLModel 数据模型
│   │   ├── schemas/           # Pydantic 请求/响应模型
│   │   ├── routers/           # API 路由
│   │   ├── services/          # 业务逻辑
│   │   └── auth/              # 认证
│   ├── tests/                 # 测试
│   ├── alembic/               # 数据库迁移
│   ├── Dockerfile             # Backend 容器镜像
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── routes/            # 页面路由
│   │   ├── components/        # React 组件
│   │   ├── lib/               # 工具函数
│   │   └── styles.css         # 全局样式
│   ├── Dockerfile             # Frontend 容器镜像（nginx）
│   ├── nginx.conf             # Nginx 反向代理配置
│   └── package.json
├── docs/
│   ├── assets/                # 图片与图表
│   ├── clawhub_cli.md         # ClawHub CLI 使用指南（英文）
│   └── zh-tw/                 # 繁体中文文档
│       └── clawhub_cli.md
├── docker-compose.yml         # Docker 部署（SQLite）
├── docker-compose.postgres.yml # Docker 部署（PostgreSQL）
├── .env.docker.example        # Docker 环境变量模板
├── .env.example               # 本地开发环境变量模板
├── CLAUDE.md                  # 开发说明
└── README.md                  # 本文件
```

## 授权

MIT License
