# Full-Page Route Back Navigation Design

Date: 2026-08-15

## Problem

Several full-page routes (`/settings`, `/costs`, `/models`, `/packages`,
`/collections`, `/assets`, `/workspaces`, `/examples`, `/timeline/:sequenceId`,
`/sketch/:documentId`, `/graph/:workflowId`, `/chain/:workflowId`) render
without any navigation chrome: no back button, and Electron has no back
shortcut or gesture (`electron/src` has no history handling). Entering
`/settings` from the Studio top bar (`StudioShell.tsx:110-115`,
`navigate("/settings")`) is a navigation dead-end — the only way out is
restarting the app.

## Approach

Full page + back button (chosen over a settings drawer/overlay), applied
uniformly to every chrome-less full-page route.

## Components

### `BackablePage` (`web/src/components/BackablePage.tsx`)

A layout wrapper:

- Slim header row: back `EditorButton` (ArrowBackRoundedIcon + `common:back`
  label, same visual pattern as `StudioShell`'s back button) plus an optional
  `title` (`Text` secondary). Border-bottom divider, `SPACING` tokens only.
- Children render below in a flex column, full height, `minHeight: 0`.
- Back behavior: if the app has navigated in-session, `navigate(-1)`;
  otherwise (cold start landing on the page — the Electron common case)
  `navigate("/studio")`. Implemented with a module-level navigation counter
  bumped by a listener effect inside the component on location change;
  `canGoBack = counter > 0`.
- Keyboard shortcut: `Cmd/Ctrl+[` triggers the same back logic. Registered
  with `keydown` on `window` while the component is mounted; ignored when the
  event target is an input, textarea, select, or contentEditable element.
  Web-side implementation — works in both Electron and the browser without
  touching the Electron main process or menu.

### Route wiring (`web/src/index.tsx`)

Wrap the element of each chrome-less full-page route in
`<BackablePage title={...}>`: `/settings`, `/costs`, `/assets`,
`/collections`, `/examples`, `/models`, `/packages`, `/workspaces`,
`/graph/:workflowId`, `/chain/:workflowId`, `/timeline/:sequenceId`,
`/sketch/:documentId`.

Not touched (already have navigation affordances or their own chrome):

- `/studio/*` — `StudioShell` with `showBack`
- `/tutorials` — `TutorialsPage` has its own back button
- `/workspace`, `/editor/:workflow` — node editor with its own top bar
- `/login`, `/`, `/dashboard`, `/share/:token`, `/miniapp/:workflowId`,
  `/welcome`, `/chat/*` — redirect/auth/portal flows
- `/layouttest`, `/chatmarkdowntest`, `/code-editor-debug`, `/preview/*` —
  dev-only test pages

## Testing

`web/src/components/__tests__/BackablePage.test.tsx` (Jest + RTL):

- Renders the back button and optional title.
- With in-session history, clicking back calls `navigate(-1)`; on a cold
  first load it navigates to `/studio`.
- `Cmd/Ctrl+[` triggers back; ignored when focus is in a text input.

## Verification

`npm run typecheck`, `npm run lint`, `cd web && npm test` for the new test
file; then rebuild the Electron dmg/zip for manual testing.
