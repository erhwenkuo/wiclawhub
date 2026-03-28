## Install the CLI

Pick one:

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```
## Environment variables

- `CLAWHUB_SITE`: Override the site URL.
- `CLAWHUB_REGISTRY`: Override the registry API URL.
- `CLAWHUB_CONFIG_PATH`: Override where the CLI stores the token/config.
- `CLAWHUB_WORKDIR`: Override the default workdir.
- `CLAWHUB_DISABLE_TELEMETRY=1`: Disable telemetry on sync.

```bash
export CLAWHUB_SITE="http://localhost:5173"
export CLAWHUB_REGISTRY="http://127.0.0.1:8000"
```

## CLI commands and parameters

Global options (apply to all commands):

- `--workdir <dir>`: Working directory (default: current dir; falls back to OpenClaw workspace).
- `--dir <dir>`: Skills directory, relative to workdir (default: skills).
- `--site <url>`: Site base URL (browser login).
- `--registry <url>`: Registry API base URL.
- `--no-input`: Disable prompts (non-interactive).
- `-V`, `--cli-version`: Print CLI version.

Auth:

- `clawhub login` (browser flow) or `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

---

# ClawHub CLI API Reference (clawhub@0.8.0)

All API endpoints the CLI calls, extracted from the npm package source code.

## 1. Discovery

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/clawhub.json` | GET | **Service discovery.** CLI fetches this from the `--site` URL to discover `apiBase` (registry URL) and `authBase` (browser auth base URL). Response: `{ "apiBase": "/api/v1", "authBase": "..." }` |

## 2. Authentication (Browser Flow)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cli/auth?redirect_uri=...&state=...&label_b64=...` | Browser | **Browser flow login page.** CLI opens this in the user's browser. The page authenticates the user and redirects to `redirect_uri` with `#token={api_token}&state={state}` in the URL hash fragment. `redirect_uri` must be a loopback address (`127.0.0.1` / `localhost`). |

## 3. Auth & Identity

| Endpoint | Method | Auth | CLI Command | Description |
|----------|--------|------|-------------|-------------|
| `/api/v1/whoami` | GET | Bearer | `clawhub login`, `clawhub whoami` | **Verify token & get current user.** Returns `{ user: { handle, displayName?, image? } }`. Called after login to confirm token validity, and by the `whoami` command. |

## 4. Skills CRUD

| Endpoint | Method | Auth | CLI Command | Description |
|----------|--------|------|-------------|-------------|
| `/api/v1/skills` | GET | Optional | `clawhub skills list` | **List all skills (paginated).** Query params: `limit`, `cursor`, `nonSuspiciousOnly`. Returns `{ items: [...], nextCursor }`. |
| `/api/v1/skills` | POST (multipart) | Bearer | `clawhub publish` | **Publish a skill or new version.** Multipart form with `payload` (JSON string) and file uploads. Payload contains: `slug`, `displayName`, `version`, `changelog`, `tags?`, `files[]`. Returns `{ ok: true, skillId, versionId }`. |
| `/api/v1/skills/{slug}` | GET | Optional | `clawhub inspect`, `clawhub install` | **Get skill details.** Returns `{ skill, latestVersion, owner, moderation }`. |
| `/api/v1/skills/{slug}` | DELETE | Bearer | `clawhub delete` | **Soft-delete a skill.** Returns `{ ok: true }`. |
| `/api/v1/skills/{slug}/undelete` | POST | Bearer | `clawhub undelete` | **Restore a deleted skill.** Returns `{ ok: true }`. |

## 5. Versions

| Endpoint | Method | Auth | CLI Command | Description |
|----------|--------|------|-------------|-------------|
| `/api/v1/skills/{slug}/versions` | GET | Optional | `clawhub inspect` | **List versions (paginated).** Returns `{ items: [{ version, createdAt, changelog, changelogSource }], nextCursor }`. |
| `/api/v1/skills/{slug}/versions/{version}` | GET | Optional | `clawhub inspect` | **Get version details.** Returns `{ version: { version, createdAt, changelog, files, ... }, skill }`. |

## 6. Files & Downloads

| Endpoint | Method | Auth | CLI Command | Description |
|----------|--------|------|-------------|-------------|
| `/api/v1/skills/{slug}/file?path=...&version=...` | GET | Optional | `clawhub inspect` | **Get single file content.** Returns file content as `text/plain`. |
| `/api/v1/download?slug=...&version=...` | GET | Optional | `clawhub install` | **Download skill as ZIP.** Returns binary ZIP archive of all skill files. |

## 7. Search & Resolve

| Endpoint | Method | Auth | CLI Command | Description |
|----------|--------|------|-------------|-------------|
| `/api/v1/search?q=...&limit=...` | GET | Optional | `clawhub search` | **Search skills.** Returns `{ results: [{ slug, displayName, summary?, version, score, updatedAt? }] }`. |
| `/api/v1/resolve?slug=...&hash=...` | GET | Optional | `clawhub install` | **Resolve version by file hash.** Returns `{ match: { version } | null, latestVersion: { version } | null }`. Used to check if a locally installed version matches the registry. |

## 8. Stars

| Endpoint | Method | Auth | CLI Command | Description |
|----------|--------|------|-------------|-------------|
| `/api/v1/stars/{slug}` | POST | Bearer | `clawhub star` | **Star a skill.** Returns `{ ok: true, starred: boolean, alreadyStarred: boolean }`. |
| `/api/v1/stars/{slug}` | DELETE | Bearer | `clawhub unstar` | **Unstar a skill.** Returns `{ ok: true, unstarred: boolean, alreadyUnstarred: boolean }`. |

## 9. Transfers (Ownership Transfer)

| Endpoint | Method | Auth | CLI Command | Description |
|----------|--------|------|-------------|-------------|
| `/api/v1/skills/{slug}/transfer` | POST | Bearer | `clawhub transfer request` | **Request ownership transfer.** Body: `{ toUserHandle, message? }`. Returns `{ ok, transferId, toUserHandle, expiresAt }`. |
| `/api/v1/skills/{slug}/transfer/{accept\|reject}` | POST | Bearer | `clawhub transfer accept/reject` | **Accept or reject a transfer request.** Returns `{ ok, skillSlug? }`. |
| `/api/v1/transfers/incoming` | GET | Bearer | `clawhub transfer list` | **List incoming transfer requests.** Returns `{ transfers: [...] }`. |
| `/api/v1/transfers/outgoing` | GET | Bearer | `clawhub transfer list --outgoing` | **List outgoing transfer requests.** Returns `{ transfers: [...] }`. |

## 10. Users & Moderation (Admin)

| Endpoint | Method | Auth | CLI Command | Description |
|----------|--------|------|-------------|-------------|
| `/api/v1/users?q=...` | GET | Bearer | `clawhub mod search-users` | **Search users.** Returns `{ items: [{ userId, handle, displayName, role }], total }`. |
| `/api/v1/users/ban` | POST | Bearer | `clawhub mod ban` | **Ban a user and delete their skills.** Body: `{ handle }`. Returns `{ ok, alreadyBanned, deletedSkills }`. |
| `/api/v1/users/role` | POST | Bearer | `clawhub mod set-role` | **Set a user's role.** Body: `{ handle, role }`. Returns `{ ok, role }`. |

---

## Summary

**Total: 21 endpoints** (1 discovery + 1 browser auth + 19 API):

| Category | Count | Endpoints |
|----------|-------|-----------|
| Discovery | 1 | `/.well-known/clawhub.json` |
| Browser Auth | 1 | `/cli/auth` |
| Identity | 1 | `whoami` |
| Skills CRUD | 5 | list, publish, get, delete, undelete |
| Versions | 2 | list, get detail |
| Files | 2 | get content, download zip |
| Search/Resolve | 2 | search, resolve |
| Stars | 2 | star, unstar |
| Transfers | 4 | request, accept/reject, list incoming/outgoing |
| Admin | 3 | search users, ban, set role |

---

## WiClawHub Implementation Status

| Endpoint | Status | Notes |
|----------|--------|-------|
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
| `/api/v1/stars/{slug}` POST | ⚠️ | Path differs: currently at `/api/v1/skills/{slug}/star` |
| `/api/v1/stars/{slug}` DELETE | ⚠️ | Path differs: currently at `/api/v1/skills/{slug}/star` |
| `/api/v1/skills/{slug}/transfer` POST | ❌ | Not implemented |
| `/api/v1/transfers/incoming` GET | ❌ | Not implemented |
| `/api/v1/transfers/outgoing` GET | ❌ | Not implemented |
| `/api/v1/skills/{slug}/transfer/{action}` POST | ❌ | Not implemented |
| `/api/v1/users` GET | ❌ | Not implemented |
| `/api/v1/users/ban` POST | ❌ | Not implemented |
| `/api/v1/users/role` POST | ❌ | Not implemented |
