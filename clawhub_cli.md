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

`clawhub login --token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNWYxOWFmMS04YTQ5LTQ5YjYtOTJhMC04NGNlOTZiYzQ1YTYiLCJleHAiOjE3NzM5MzcxNjksInR5cGUiOiJhY2Nlc3MifQ.bFhAdxToB7fB_n6zTC1RD5GcxhNDH2wKSLd-puqmTJA