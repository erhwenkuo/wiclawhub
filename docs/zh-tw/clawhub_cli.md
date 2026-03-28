# 如何使用 ClawHub CLI

**ClawHub CLI** 是 [ClawHub](https://clawhub.ai/) 的命令列介面工具，ClawHub 是 OpenClaw 生態系統的公開技能註冊平台。

它的功能類似於 JavaScript 的 npm，但專為 AI 代理人能力而設計，讓開發者和使用者可以管理擴展 AI 代理人功能的「技能」（Skills）和「外掛」（Plugins）。

**核心功能**

CLI 支援 AI 代理人能力的完整生命週期管理，包括：

- **探索與安裝**：使用語意搜尋尋找技能，並支援直接安裝。已安裝的技能可透過 clawhub 指令列出與更新。
- **外掛管理**：支援原生和「Nix」外掛，可打包二進位檔案與設定。
- **開發者工作流程**：讓開發者可以將包含 SKILL.md 檔案的技能發布到 Registry，並提供安全的身份驗證。
- **安全與維護**：整合 VirusTotal 進行惡意軟體掃描，並可搭配 openclaw doctor 進行環境健康檢查。

## 安裝 CLI

擇一安裝：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

或免安裝直接執行：

```bash
npx clawhub@latest --help
```

## 環境變數

- `CLAWHUB_SITE`：覆寫站台 URL。
- `CLAWHUB_REGISTRY`：覆寫 Registry API URL。
- `CLAWHUB_CONFIG_PATH`：覆寫 CLI 存放 token/設定檔的路徑。
- `CLAWHUB_WORKDIR`：覆寫預設工作目錄。
- `CLAWHUB_DISABLE_TELEMETRY=1`：停用 sync 時的遙測回報。

將 CLI 指向自建的 WiClawHub 實例：

```bash
export CLAWHUB_SITE="http://localhost:5173"
export CLAWHUB_REGISTRY="http://localhost:8000"
export CLAWHUB_DISABLE_TELEMETRY=1
```

## CLI 指令與參數

全域選項（適用於所有指令）：

- `--workdir <dir>`：工作目錄（預設：當前目錄；若有設定 OpenClaw workspace 則回退至該路徑）。
- `--dir <dir>`：技能目錄，相對於 workdir（預設：skills）。
- `--site <url>`：站台基底 URL（瀏覽器登入用）。
- `--registry <url>`：Registry API 基底 URL。
- `--no-input`：停用互動式提示。
- `-V`, `--cli-version`：顯示 CLI 版本。

---

### login

向 Registry 進行身份驗證。預設開啟瀏覽器，或使用 `--token` 進行無介面/CI 登入。

```bash
# 瀏覽器登入（開啟瀏覽器完成驗證）
clawhub login

# Token 登入（適用於 CI/CD 或無介面環境）
clawhub login --token <your-api-token>
```

**範例輸出：**

```
- Verifying token
✔ OK. Logged in as @myuser.
```

### logout

移除已儲存的認證 token。

```bash
clawhub logout
```

### whoami

驗證已儲存的 token 並顯示當前使用者。

```bash
clawhub whoami
```

**範例輸出：**

```
- Checking token
✔ myuser
```

---

### explore

瀏覽 Registry 中最近更新的技能。

```bash
# 列出最近更新的 10 個技能
clawhub explore --limit 10

# 依下載次數排序
clawhub explore --sort downloads --limit 5

# 以 JSON 格式輸出
clawhub explore --limit 3 --json
```

**範例輸出：**

```
- Fetching latest skills
test-skill  v0.6.0  2m ago
smart-parser-1  v2.8.1  1h ago  Automates parser tasks with minimal configuration.
fast-scanner-5  v1.0.3  3h ago  A lightweight fast tool for scanner operations.
```

### search

依關鍵字搜尋技能（名稱、slug 或摘要）。

```bash
# 搜尋包含 "parser" 的技能
clawhub search parser

# 多關鍵字搜尋
clawhub search json converter
```

**範例輸出：**

```
- Searching
smart-parser-1 v2.8.1  Smart Parser 1  (18.393)
auto-parser-42 v1.2.0  Auto Parser 42  (12.107)
```

### inspect

擷取技能的中繼資料（不安裝）。

```bash
# 基本資訊
clawhub inspect my-skill

# 顯示所有版本
clawhub inspect my-skill --versions

# 顯示最新版本的檔案清單
clawhub inspect my-skill --files

# 查看特定版本
clawhub inspect my-skill --version 1.0.0

# 查看特定檔案內容
clawhub inspect my-skill --file SKILL.md

# 以 JSON 格式輸出
clawhub inspect my-skill --json
```

**範例輸出（基本）：**

```
- Fetching skill
my-skill  My Skill
Owner: myuser
Created: 2026-03-28T10:30:00.000Z
Updated: 2026-03-28T12:00:00.000Z
Latest: 0.6.0
License: MIT-0 (Free to use, modify, and redistribute. No attribution required.)
Tags: latest=latest
```

**範例輸出（--files）：**

```
Files:
SKILL.md  199B  6781090cbc...  text/markdown
main.py   101B  4c7938ec0d...  text/plain
```

**範例輸出（--versions）：**

```
Versions:
0.6.0  2026-03-28T12:00:00.000Z
0.5.0  2026-03-28T11:30:00.000Z
0.1.0  2026-03-28T10:30:00.000Z
```

---

### publish

從本機目錄發布技能或新版本。目錄中必須包含帶有 frontmatter 的 `SKILL.md` 檔案。

```bash
# 發布 1.0.0 版技能
clawhub publish ./my-skill --version 1.0.0

# 發布新版本並附帶 changelog 訊息
clawhub publish ./my-skill --version 1.1.0 --changelog "Added new feature X"

# 非互動模式（適用於 CI/CD）
clawhub publish ./my-skill --version 1.0.0 --no-input
```

**提示：** 如果 `SKILL.md` frontmatter 中包含 `version` 欄位，則 `--version` 參數可以省略：

```markdown
---
name: My Skill
version: 1.0.0
description: A tool that does amazing things.
---
```

```bash
# 版本從 SKILL.md frontmatter 讀取 — 不需要 --version
clawhub publish "$(pwd)/my-skill"

# 或用 --version 覆寫
clawhub publish "$(pwd)/my-skill" --version 2.0.0
```

若兩者皆未提供，CLI 會報錯 `--version must be valid semver`。

**注意：** CLI 解析相對路徑時是以 `--workdir` 為基準，而非 shell 的當前目錄。請使用絕對路徑或明確指定 `--workdir`：

```bash
# 這可能會失敗並顯示 "Error: Path must be a folder"
clawhub publish ./my-skill --version 1.0.0

# 改用絕對路徑
clawhub publish "$(pwd)/my-skill" --version 1.0.0

# 或將 --workdir 設為當前目錄
clawhub publish ./my-skill --version 1.0.0 --workdir .
```

**SKILL.md frontmatter 範例：**

```markdown
---
slug: my-skill
name: My Skill
version: 1.0.0
description: A tool that does amazing things.
---

# My Skill

詳細說明寫在這裡...
```

**範例輸出：**

```
- Preparing my-skill@1.0.0
✔ OK. Published my-skill@1.0.0 (a1b2c3d4-e5f6-7890-abcd-ef1234567890)
```

---

### install

從 Registry 安裝技能到本機工作區。

```bash
# 安裝最新版本
clawhub install my-skill

# 安裝特定版本
clawhub install my-skill --version 1.0.0

# 安裝到自訂工作區
clawhub install my-skill --workdir ./my-project

# 安裝到自訂子目錄
clawhub install my-skill --dir tools
```

**範例輸出：**

```
- Resolving my-skill
✔ OK. Installed my-skill -> ./skills/my-skill
```

**安裝後的目錄結構：**

```
skills/
  my-skill/
    .clawhub/
      origin.json     # 安裝中繼資料
    SKILL.md
    main.py
```

### update

更新已安裝的技能至最新版本。

```bash
# 更新特定技能
clawhub update my-skill

# 更新所有已安裝的技能
clawhub update --all

# 強制更新（即使本機檔案已被修改）
clawhub update my-skill --force
```

### uninstall

移除本機已安裝的技能。

```bash
# 移除（含確認提示）
clawhub uninstall my-skill

# 跳過確認
clawhub uninstall my-skill --yes
```

### list

列出所有本機已安裝的技能（從 lockfile 讀取）。

```bash
clawhub list
```

**範例輸出：**

```
my-skill  1.0.0
fast-scanner-5  2.1.0
```

---

### delete / hide

軟刪除（隱藏）自己擁有的技能。

```bash
# 含確認提示
clawhub delete my-skill

# 跳過確認
clawhub delete my-skill --yes

# "hide" 是 "delete" 的別名
clawhub hide my-skill --yes
```

**範例輸出：**

```
- Deleting my-skill
✔ OK. Deleted my-skill
```

### undelete / unhide

恢復先前刪除（隱藏）的技能。

```bash
# 含確認提示
clawhub undelete my-skill

# 跳過確認
clawhub undelete my-skill --yes

# "unhide" 是 "undelete" 的別名
clawhub unhide my-skill --yes
```

**範例輸出：**

```
- Undeleting my-skill
✔ OK. Undeleted my-skill
```

---

### star

將技能加入收藏。

```bash
clawhub star my-skill --yes
```

**範例輸出：**

```
- Starring my-skill
✔ OK. Starred my-skill
```

### unstar

將技能從收藏中移除。

```bash
clawhub unstar my-skill --yes
```

**範例輸出：**

```
- Unstarring my-skill
✔ OK. Unstarred my-skill
```

---

### transfer

轉移技能所有權給其他使用者。

```bash
# 發起轉移請求
clawhub transfer request my-skill target-user --message "Taking over maintenance"

# 列出收到的轉移請求
clawhub transfer list

# 列出發出的轉移請求
clawhub transfer list --outgoing

# 接受轉移
clawhub transfer accept my-skill --yes

# 拒絕轉移
clawhub transfer reject my-skill --yes

# 取消已發出的轉移
clawhub transfer cancel my-skill --yes
```

### skill rename

重新命名技能（從舊 slug 建立重新導向別名）。

```bash
clawhub skill rename old-slug new-slug --yes
```

### skill merge

合併兩個技能（來源技能變為別名）。

```bash
clawhub skill merge source-skill target-skill --yes
```

---

### sync

掃描本機技能目錄並發布新增或更新的技能。

```bash
# 模擬執行 — 顯示將會發布的內容
clawhub sync --dry-run

# 發布所有已變更的技能
clawhub sync --all

# 從特定根目錄發布
clawhub sync --root ./my-skills

# 自動遞增 patch 版號並附加 changelog
clawhub sync --bump patch --changelog "Bug fixes"
```

---

### 管理員指令

需要 moderator 或 admin 角色。

```bash
# 封鎖使用者（同時刪除其技能）
clawhub ban-user baduser --reason "Spam" --yes

# 變更使用者角色
clawhub set-role someuser moderator --yes
```

---

# ClawHub CLI API 參考文件（clawhub@0.9.0）

以下為 CLI 所呼叫的所有 API 端點，擷取自 npm 套件原始碼。

## 1. 服務探索

| 端點 | 方法 | 說明 |
|------|------|------|
| `/.well-known/clawhub.json` | GET | **服務探索。** CLI 從 `--site` URL 擷取此檔案以取得 `apiBase`（Registry URL）和 `authBase`（瀏覽器認證基底 URL）。回應格式：`{ "apiBase": "...", "authBase": "...", "minCliVersion": "0.1.0", "registry": "..." }` |

## 2. 認證（瀏覽器流程）

| 端點 | 方法 | 說明 |
|------|------|------|
| `/cli/auth?redirect_uri=...&state=...&label_b64=...` | 瀏覽器 | **瀏覽器登入頁面。** CLI 在使用者瀏覽器中開啟此頁面。頁面完成認證後，重新導向至 `redirect_uri` 並在 URL hash fragment 中附帶 `#token={api_token}&state={state}`。`redirect_uri` 必須為 loopback 位址（`127.0.0.1` / `localhost`）。 |

## 3. 認證與身份

| 端點 | 方法 | 認證 | CLI 指令 | 說明 |
|------|------|------|----------|------|
| `/api/v1/whoami` | GET | Bearer | `clawhub login`, `clawhub whoami` | **驗證 token 並取得當前使用者。** 回應：`{ user: { handle, displayName?, image? } }`。登入後呼叫以確認 token 有效性，也用於 `whoami` 指令。 |

## 4. 技能 CRUD

| 端點 | 方法 | 認證 | CLI 指令 | 說明 |
|------|------|------|----------|------|
| `/api/v1/skills` | GET | 選用 | `clawhub explore` | **列出所有技能（分頁）。** 查詢參數：`limit`, `cursor`, `nonSuspiciousOnly`。回應：`{ items: [...], nextCursor }`。 |
| `/api/v1/skills` | POST (multipart) | Bearer | `clawhub publish` | **發布技能或新版本。** Multipart 表單含 `payload`（JSON 字串）和檔案上傳。Payload 包含：`slug`, `displayName`, `version`, `changelog`, `tags?`。回應：`{ ok: true, skillId, versionId }`。 |
| `/api/v1/skills/{slug}` | GET | 選用 | `clawhub inspect`, `clawhub install` | **取得技能詳情。** 回應：`{ skill, latestVersion, owner, moderation }`。 |
| `/api/v1/skills/{slug}` | DELETE | Bearer | `clawhub delete` | **軟刪除技能。** 回應：`{ ok: true }`。 |
| `/api/v1/skills/{slug}/undelete` | POST | Bearer | `clawhub undelete` | **恢復已刪除的技能。** 回應：`{ ok: true }`。 |

## 5. 版本

| 端點 | 方法 | 認證 | CLI 指令 | 說明 |
|------|------|------|----------|------|
| `/api/v1/skills/{slug}/versions` | GET | 選用 | `clawhub inspect` | **列出版本（分頁）。** 回應：`{ items: [{ version, createdAt, changelog, changelogSource }], nextCursor }`。 |
| `/api/v1/skills/{slug}/versions/{version}` | GET | 選用 | `clawhub inspect` | **取得版本詳情。** 回應：`{ version: { version, createdAt, changelog, files, ... }, skill }`。 |

## 6. 檔案與下載

| 端點 | 方法 | 認證 | CLI 指令 | 說明 |
|------|------|------|----------|------|
| `/api/v1/skills/{slug}/file?path=...&version=...` | GET | 選用 | `clawhub inspect` | **取得單一檔案內容。** 回傳 `text/plain` 格式的檔案內容。 |
| `/api/v1/download?slug=...&version=...` | GET | 選用 | `clawhub install` | **以 ZIP 下載技能。** 回傳包含所有技能檔案的 ZIP 壓縮檔。 |

## 7. 搜尋與解析

| 端點 | 方法 | 認證 | CLI 指令 | 說明 |
|------|------|------|----------|------|
| `/api/v1/search?q=...&limit=...` | GET | 選用 | `clawhub search` | **搜尋技能。** 回應：`{ results: [{ slug, displayName, summary?, version, score, updatedAt? }] }`。 |
| `/api/v1/resolve?slug=...&hash=...` | GET | 選用 | `clawhub install` | **依檔案 hash 解析版本。** 回應：`{ match: { version } | null, latestVersion: { version } | null }`。用於檢查本機安裝版本是否與 Registry 一致。 |

## 8. 收藏

| 端點 | 方法 | 認證 | CLI 指令 | 說明 |
|------|------|------|----------|------|
| `/api/v1/stars/{slug}` | POST | Bearer | `clawhub star` | **收藏技能。** 回應：`{ ok: true, starred: boolean, alreadyStarred: boolean }`。 |
| `/api/v1/stars/{slug}` | DELETE | Bearer | `clawhub unstar` | **取消收藏。** 回應：`{ ok: true, unstarred: boolean, alreadyUnstarred: boolean }`。 |

## 9. 轉移（所有權轉移）

| 端點 | 方法 | 認證 | CLI 指令 | 說明 |
|------|------|------|----------|------|
| `/api/v1/skills/{slug}/transfer` | POST | Bearer | `clawhub transfer request` | **發起所有權轉移。** Body：`{ toUserHandle, message? }`。回應：`{ ok, transferId, toUserHandle, expiresAt }`。 |
| `/api/v1/skills/{slug}/transfer/{accept\|reject}` | POST | Bearer | `clawhub transfer accept/reject` | **接受或拒絕轉移請求。** 回應：`{ ok, skillSlug? }`。 |
| `/api/v1/transfers/incoming` | GET | Bearer | `clawhub transfer list` | **列出收到的轉移請求。** 回應：`{ transfers: [...] }`。 |
| `/api/v1/transfers/outgoing` | GET | Bearer | `clawhub transfer list --outgoing` | **列出發出的轉移請求。** 回應：`{ transfers: [...] }`。 |

## 10. 使用者與審核（管理員）

| 端點 | 方法 | 認證 | CLI 指令 | 說明 |
|------|------|------|----------|------|
| `/api/v1/users?q=...` | GET | Bearer | `clawhub mod search-users` | **搜尋使用者。** 回應：`{ items: [{ userId, handle, displayName, role }], total }`。 |
| `/api/v1/users/ban` | POST | Bearer | `clawhub mod ban` | **封鎖使用者並刪除其技能。** Body：`{ handle }`。回應：`{ ok, alreadyBanned, deletedSkills }`。 |
| `/api/v1/users/role` | POST | Bearer | `clawhub mod set-role` | **變更使用者角色。** Body：`{ handle, role }`。回應：`{ ok, role }`。 |

---

## 摘要

**共 21 個端點**（1 個服務探索 + 1 個瀏覽器認證 + 19 個 API）：

| 類別 | 數量 | 端點 |
|------|------|------|
| 服務探索 | 1 | `/.well-known/clawhub.json` |
| 瀏覽器認證 | 1 | `/cli/auth` |
| 身份驗證 | 1 | `whoami` |
| 技能 CRUD | 5 | 列出、發布、取得、刪除、恢復 |
| 版本 | 2 | 列出、取得詳情 |
| 檔案 | 2 | 取得內容、下載 zip |
| 搜尋/解析 | 2 | 搜尋、解析 |
| 收藏 | 2 | 收藏、取消收藏 |
| 轉移 | 4 | 發起、接受/拒絕、列出收到/發出 |
| 管理員 | 3 | 搜尋使用者、封鎖、設定角色 |

---

## WiClawHub 實作狀態

| 端點 | 狀態 | 備註 |
|------|------|------|
| `/.well-known/clawhub.json` | ✅ | |
| `/cli/auth` | ✅ | |
| `/api/v1/whoami` | ✅ | |
| `/api/v1/skills` GET | ✅ | |
| `/api/v1/skills` POST | ✅ | |
| `/api/v1/skills/{slug}` GET | ✅ | |
| `/api/v1/skills/{slug}` DELETE | ✅ | |
| `/api/v1/skills/{slug}/undelete` | ✅ | |
| `/api/v1/skills/{slug}/versions` GET | ✅ | |
| `/api/v1/skills/{slug}/versions/{version}` GET | ✅ | |
| `/api/v1/skills/{slug}/file` GET | ✅ | |
| `/api/v1/download` GET | ✅ | |
| `/api/v1/search` GET | ✅ | |
| `/api/v1/resolve` GET | ✅ | |
| `/api/v1/stars/{slug}` POST | ✅ | 已透過 CLI 驗證 |
| `/api/v1/stars/{slug}` DELETE | ✅ | 已透過 CLI 驗證 |
| `/api/v1/skills/{slug}/transfer` POST | ❌ | 尚未實作 |
| `/api/v1/transfers/incoming` GET | ❌ | 尚未實作 |
| `/api/v1/transfers/outgoing` GET | ❌ | 尚未實作 |
| `/api/v1/skills/{slug}/transfer/{action}` POST | ❌ | 尚未實作 |
| `/api/v1/users` GET | ❌ | 尚未實作 |
| `/api/v1/users/ban` POST | ❌ | 尚未實作 |
| `/api/v1/users/role` POST | ❌ | 尚未實作 |
