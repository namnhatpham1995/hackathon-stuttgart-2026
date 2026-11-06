---
name: reference-mcp-manual-auth
description: "MCP servers that need a PAT or interactive OAuth login (GitHub, Railway, …) need a one-time manual step from the user; never create or enter that credential"
metadata:
  type: reference
---

Examples: a remote GitHub MCP server with `Authorization: Bearer ${GITHUB_MCP_PAT}` needs a fine-grained token from github.com/settings/personal-access-tokens/new, set as an environment variable; the Railway MCP server (`railway mcp`) needs the Railway CLI and one interactive `railway login`. Keep `.mcp.json` untracked.

**Why:** entering credentials or completing an OAuth flow is the user's step only.

**How to apply:** if such a tool is not connected, check the env var or the CLI's `whoami` before blaming the config, then tell the user the exact one-time step (URL or command) instead of attempting it.
