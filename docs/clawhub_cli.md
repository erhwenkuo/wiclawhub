# How to use ClawHub CLI

**ClawHub CLI** is the command-line interface for [ClawHub](https://clawhub.ai/), the public skill registry for the OpenClaw ecosystem. 

It functions similarly to npm for JavaScript but is specifically designed for AI agent capabilities, allowing developers and users to manage "Skills" and "Plugins" that extend what an AI agent can do.

**Core Functions**

The CLI facilitates the full lifecycle of AI agent capabilities, including:

- **Discovery & Installation**: Uses semantic search to find skills and allows for direct installation. Installed skills can be listed and updated via clawhub commands.
- **Plugin Management**: Supports native and "Nix" plugins, bundling binaries and configurations.
- **Developer Workflow**: Enables developers to publish skills containing SKILL.md files to the registry, with secure authentication.
- **Security & Maintenance**: Integrates with VirusTotal for malware scanning and works with openclaw doctor for environment health. 

## Install the CLI

Pick one:

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

Or run without installing:

```bash
npx clawhub@latest --help
```

## Environment variables

- `CLAWHUB_SITE`: Override the site URL.
- `CLAWHUB_REGISTRY`: Override the registry API URL.
- `CLAWHUB_CONFIG_PATH`: Override where the CLI stores the token/config.
- `CLAWHUB_WORKDIR`: Override the default workdir.
- `CLAWHUB_DISABLE_TELEMETRY=1`: Disable telemetry on sync.

Point the CLI to a self-hosted WiClawHub instance:

```bash
export CLAWHUB_SITE="http://localhost:5173"
export CLAWHUB_REGISTRY="http://localhost:8000"
export CLAWHUB_DISABLE_TELEMETRY=1
```

## CLI commands and parameters

Global options (apply to all commands):

- `--workdir <dir>`: Working directory (default: current dir; falls back to OpenClaw workspace).
- `--dir <dir>`: Skills directory, relative to workdir (default: skills).
- `--site <url>`: Site base URL (browser login).
- `--registry <url>`: Registry API base URL.
- `--no-input`: Disable prompts (non-interactive).
- `-V`, `--cli-version`: Print CLI version.

---

### login

Authenticate with the registry. Opens a browser by default, or use `--token` for headless/CI.

```bash
# Browser-based login (opens browser to complete auth)
clawhub login

# Token-based login (for CI/CD or headless environments)
clawhub login --token <your-api-token>
```

**Example output:**

```
- Verifying token
✔ OK. Logged in as @myuser.
```

### logout

Remove the stored authentication token.

```bash
clawhub logout
```

### whoami

Verify the stored token and display the current user.

```bash
clawhub whoami
```

**Example output:**

```
- Checking token
✔ myuser
```

---

### explore

Browse the latest updated skills from the registry.

```bash
# List the 10 most recently updated skills
clawhub explore --limit 10

# Sort by download count
clawhub explore --sort downloads --limit 5

# Output as JSON
clawhub explore --limit 3 --json
```

**Example output:**

```
- Fetching latest skills
test-skill  v0.6.0  2m ago
smart-parser-1  v2.8.1  1h ago  Automates parser tasks with minimal configuration.
fast-scanner-5  v1.0.3  3h ago  A lightweight fast tool for scanner operations.
```

### search

Search skills by keyword (name, slug, or summary).

```bash
# Search for skills matching "parser"
clawhub search parser

# Search with multiple terms
clawhub search json converter
```

**Example output:**

```
- Searching
smart-parser-1 v2.8.1  Smart Parser 1  (18.393)
auto-parser-42 v1.2.0  Auto Parser 42  (12.107)
```

### inspect

Fetch skill metadata without installing.

```bash
# Basic info
clawhub inspect my-skill

# Show all versions
clawhub inspect my-skill --versions

# Show files in the latest version
clawhub inspect my-skill --files

# Show a specific version
clawhub inspect my-skill --version 1.0.0

# View a specific file's content
clawhub inspect my-skill --file SKILL.md

# Output as JSON
clawhub inspect my-skill --json
```

**Example output (basic):**

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

**Example output (--files):**

```
Files:
SKILL.md  199B  6781090cbc...  text/markdown
main.py   101B  4c7938ec0d...  text/plain
```

**Example output (--versions):**

```
Versions:
0.6.0  2026-03-28T12:00:00.000Z
0.5.0  2026-03-28T11:30:00.000Z
0.1.0  2026-03-28T10:30:00.000Z
```

---

### publish

Publish a skill or a new version from a local directory. The directory must contain a `SKILL.md` file with frontmatter.

```bash
# Publish a skill at version 1.0.0
clawhub publish ./my-skill --version 1.0.0

# Publish a new version with a changelog message
clawhub publish ./my-skill --version 1.1.0 --changelog "Added new feature X"

# Non-interactive mode (for CI/CD)
clawhub publish ./my-skill --version 1.0.0 --no-input
```

**Tip:** The `--version` flag is optional if your `SKILL.md` frontmatter includes a `version` field:

```markdown
---
name: My Skill
version: 1.0.0
description: A tool that does amazing things.
---
```

```bash
# Version read from SKILL.md frontmatter — no --version needed
clawhub publish "$(pwd)/my-skill"

# Or override with --version flag
clawhub publish "$(pwd)/my-skill" --version 2.0.0
```

If neither is provided, the CLI will error with `--version must be valid semver`.

**Important:** The CLI resolves relative paths against `--workdir`, not your shell's current directory. Use an absolute path or set `--workdir` explicitly:

```bash
# This may fail with "Error: Path must be a folder"
clawhub publish ./my-skill --version 1.0.0

# Use absolute path instead
clawhub publish "$(pwd)/my-skill" --version 1.0.0

# Or set --workdir to current directory
clawhub publish ./my-skill --version 1.0.0 --workdir .
```

**SKILL.md frontmatter example:**

```markdown
---
slug: my-skill
name: My Skill
version: 1.0.0
description: A tool that does amazing things.
---

# My Skill

Detailed description here...
```

**Example output:**

```
- Preparing my-skill@1.0.0
✔ OK. Published my-skill@1.0.0 (a1b2c3d4-e5f6-7890-abcd-ef1234567890)
```

---

### install

Install a skill from the registry into the local workspace.

```bash
# Install latest version
clawhub install my-skill

# Install a specific version
clawhub install my-skill --version 1.0.0

# Install into a custom workspace
clawhub install my-skill --workdir ./my-project

# Install to a custom subdirectory
clawhub install my-skill --dir tools
```

**Example output:**

```
- Resolving my-skill
✔ OK. Installed my-skill -> ./skills/my-skill
```

**Resulting directory structure:**

```
skills/
  my-skill/
    .clawhub/
      origin.json     # Install metadata
    SKILL.md
    main.py
```

### update

Update installed skills to the latest version.

```bash
# Update a specific skill
clawhub update my-skill

# Update all installed skills
clawhub update --all

# Force update even if local files were modified
clawhub update my-skill --force
```

### uninstall

Remove a locally installed skill.

```bash
# Uninstall with confirmation prompt
clawhub uninstall my-skill

# Skip confirmation
clawhub uninstall my-skill --yes
```

### list

List all locally installed skills (reads from the lockfile).

```bash
clawhub list
```

**Example output:**

```
my-skill  1.0.0
fast-scanner-5  2.1.0
```

---

### delete / hide

Soft-delete (hide) a skill you own.

```bash
# With confirmation prompt
clawhub delete my-skill

# Skip confirmation
clawhub delete my-skill --yes

# "hide" is an alias for "delete"
clawhub hide my-skill --yes
```

**Example output:**

```
- Deleting my-skill
✔ OK. Deleted my-skill
```

### undelete / unhide

Restore a previously deleted (hidden) skill.

```bash
# With confirmation prompt
clawhub undelete my-skill

# Skip confirmation
clawhub undelete my-skill --yes

# "unhide" is an alias for "undelete"
clawhub unhide my-skill --yes
```

**Example output:**

```
- Undeleting my-skill
✔ OK. Undeleted my-skill
```

---

### star

Add a skill to your highlights.

```bash
clawhub star my-skill --yes
```

**Example output:**

```
- Starring my-skill
✔ OK. Starred my-skill
```

### unstar

Remove a skill from your highlights.

```bash
clawhub unstar my-skill --yes
```

**Example output:**

```
- Unstarring my-skill
✔ OK. Unstarred my-skill
```

---

### transfer

Transfer skill ownership to another user.

```bash
# Request a transfer
clawhub transfer request my-skill target-user --message "Taking over maintenance"

# List incoming transfer requests
clawhub transfer list

# List outgoing transfer requests
clawhub transfer list --outgoing

# Accept a transfer
clawhub transfer accept my-skill --yes

# Reject a transfer
clawhub transfer reject my-skill --yes

# Cancel an outgoing transfer
clawhub transfer cancel my-skill --yes
```

### skill rename

Rename a skill (creates a redirect alias from the old slug).

```bash
clawhub skill rename old-slug new-slug --yes
```

### skill merge

Merge one skill into another (source becomes an alias).

```bash
clawhub skill merge source-skill target-skill --yes
```

---

### sync

Scan local skill directories and publish new or updated ones.

```bash
# Dry run - show what would be published
clawhub sync --dry-run

# Publish all changed skills
clawhub sync --all

# Publish from a specific root
clawhub sync --root ./my-skills

# Auto-bump patch version and add changelog
clawhub sync --bump patch --changelog "Bug fixes"
```

---

### Admin Commands

These require moderator or admin roles.

```bash
# Ban a user (deletes their skills)
clawhub ban-user baduser --reason "Spam" --yes

# Set a user's role
clawhub set-role someuser moderator --yes
```

---

# ClawHub CLI API Reference (clawhub@0.9.0)

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
| `/api/v1/skills` | GET | Optional | `clawhub explore` | **List all skills (paginated).** Query params: `limit`, `cursor`, `nonSuspiciousOnly`. Returns `{ items: [...], nextCursor }`. |
| `/api/v1/skills` | POST (multipart) | Bearer | `clawhub publish` | **Publish a skill or new version.** Multipart form with `payload` (JSON string) and file uploads. Payload contains: `slug`, `displayName`, `version`, `changelog`, `tags?`. Returns `{ ok: true, skillId, versionId }`. |
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
| `/api/v1/stars/{slug}` POST | ✅ | Verified with CLI |
| `/api/v1/stars/{slug}` DELETE | ✅ | Verified with CLI |
| `/api/v1/skills/{slug}/transfer` POST | ❌ | Not implemented |
| `/api/v1/transfers/incoming` GET | ❌ | Not implemented |
| `/api/v1/transfers/outgoing` GET | ❌ | Not implemented |
| `/api/v1/skills/{slug}/transfer/{action}` POST | ❌ | Not implemented |
| `/api/v1/users` GET | ❌ | Not implemented |
| `/api/v1/users/ban` POST | ❌ | Not implemented |
| `/api/v1/users/role` POST | ❌ | Not implemented |
