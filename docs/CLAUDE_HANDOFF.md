# Claude Code Handoff

## Start every session

Give Claude Code this instruction:

> Read `CLAUDE.md`, `docs/CLAUDE_HANDOFF.md`, `docs/UPSTREAM.md`, and the current
> design spec before changing code. Continue the first incomplete item. Preserve
> the AI Canvas product layer and do not replace it with upstream defaults. Run
> the focused tests for every changed package, then report changed files,
> commands, and remaining risks. Do not commit or push unless I ask.

Then run:

```bash
nvm use
./start.sh doctor
git status --short
```

Do not run Codex and Claude Code against this worktree at the same time. Both
agents can edit and restart the same files and processes, which makes hot reload
appear unstable and can overwrite unfinished work. Use a separate Git worktree
when parallel work is necessary.

## Product invariants

- The creator entry is `/studio`; the separate admin entry is `/admin.html`.
- API keys are server-only. Never add a secret to `VITE_*`, frontend source,
  fixtures, screenshots, logs, or GitHub workflow output.
- Admin pages are not a security boundary. Every admin operation must call a
  backend procedure that checks `requireAdmin`.
- MiniMax is the default image provider. Seedance through KIE is the default
  video provider until a different purchased API gateway is specified.
- Alibaba OSS uses `NODETOOL_STORAGE_BACKEND=s3` and
  `S3_FORCE_PATH_STYLE=false`.
- Keep NodeTool's runtime and persistent job model. Do not add Redis/BullMQ
  unless a measured distributed-worker requirement is approved.
- Use the existing UI primitives and design tokens. Do not import raw MUI UI
  components into product pages.
- Keep the NodeTool copyright notices and AGPL-3.0 license.

## Working sequence

1. Inspect `git status --short` and do not discard changes you did not create.
2. Select one bounded feature from the design spec.
3. Add or update tests with the implementation.
4. Run package-specific checks before the full suite.
5. Run `git diff --check` and document any test that cannot run.
6. Leave the app bootable with `./start.sh full`.

Useful focused checks:

```bash
npm run typecheck --workspace=web
npm run lint:design --workspace=web
npm run test --workspace=packages/config
npm run test --workspace=packages/storage
npm run test --workspace=packages/websocket -- admin-auth.test.ts
npm run build --workspace=web
./start.sh health
```

## Upstream updates

Read `docs/UPSTREAM.md`. Merge an upstream commit into a dedicated branch or
worktree. Resolve product-layer conflicts intentionally, run focused tests, and
only then merge into the main product branch. Never copy a new upstream tree
over this checkout.
