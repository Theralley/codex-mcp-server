# Codex MCP server

This fork exposes Codex CLI tools to standard MCP clients, including Claude Code and Qwen Code.

## Current local compatibility

The 2026-11-20 update supports Codex CLI 0.171.0 while retaining the six existing
MCP tools. The source launcher is `scripts/start-local.mjs`; it needs the checkout's
npm dependencies and runs TypeScript through `tsx` without relying on generated
`dist/` files. The package version is now used in the MCP server handshake.

The execution tool supports current model descriptions, max/ultra reasoning where
available, images, live search, output schemas, profiles and ephemeral execution.
Review accepts reasoning effort and validates mutually exclusive targets and
custom prompts before dispatch. `fullAuto` maps to supported sandbox and approval
configuration. `help` accepts version and command-specific help requests.

Verification: 43 focused tests, TypeScript typecheck, changed-file lint and format,
MCP tool discovery, ping, version and a real minimal Codex request passed. Full CI
and a production build were unavailable because the remote build server was not
reachable. Code changes remain local pending review; this page describes the
local checkout rather than a published release.
