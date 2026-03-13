## Purpose

This file defines how an AI coding agent should work in this repo.

## Project

A minimalist, distraction-free writing app inspired by *Morning Pages* ("The Artist's Way"). The intent is a digital blank page for brain-dump / writing-meditation — open it, type, nothing else. Not a note app, not a document editor.

- Accessible from PC and mobile browser (full mobile keyboard support required).
- Hosted on GitHub Pages (free, no backend, no accounts).
- Vanilla HTML/CSS/JS. No framework — current scope doesn't justify one.

Files:
- `index.html` — markup shell
- `styles.css` — all styling
- `script.js` — single `WritingApp` class with all logic

## Working Style

- Be concise. Do not over-explain.
- Do not jump into implementation before aligning on approach for open-ended tasks.
- Prefer simple, readable solutions. No abstractions for their own sake.
- Follow YAGNI and DRY.
- Challenge weak assumptions early.

## Default Workflow

### 1. Brainstorm First (open-ended tasks)

- Clarify the problem and what needs to change.
- Explore up to 3 alternative approaches if the direction is unclear.
- Recommend one with reasoning.
- Do not implement until direction is confirmed.

### 2. Plan

- Break work into small, concrete steps.
- Specify which file and roughly what changes.

### 3. Implement

- Execute task by task, verify each step.

### 4. Close the Loop

- After meaningful work, check if `PROJECT_CONTEXT.md` or `DEVLOG.md` need updating.
- Update or ask explicitly — do not leave it to Tal.

## Repo Memory

Lives in `RepoMemory/` at the project root.

### `PROJECT_CONTEXT.md`

Current state of the project: what it does, key design decisions, known issues.

Update after: new features, architectural decisions, significant changes.

### `DEVLOG.md`

Chronological log of work done.

Update after: any meaningful implementation session.

Format:
```
## YYYY-MM-DD — What was done
- bullet
- bullet
```
Newest entry at top.

### `DECISIONS.md`

Important technical or design decisions and their reasoning.

Update when: a meaningful tradeoff is resolved that future work should understand.

Format:
```
## YYYY-MM-DD — Decision title
Decision:
Reason:
Impact:
```
Newest entry at top.

## Design Document

`WritingAppDesign.md` lives at the project root. It tracks the intended experience, current behavior, open design questions, and a changelog of resolved decisions.

**At the start of any session involving UI, UX, layout, or feature direction:**
- Read `WritingAppDesign.md` before doing anything else.

**After a brainstorm produces an approved design direction:**
- Update the relevant section and add a Changelog entry. Set status to `Designed`.

**After implementation:**
- Check if the doc still reflects what was built. Update if needed. Set status to `Implemented` or `Partially Implemented`. Add a Changelog entry.

## Architecture

`script.js` contains three parts:

### `WritingApp` class
The core writing experience. Manages input, rendering, zoom, cursor, and sessions.

Key methods:
- `init` / `measureFont` / `updateViewportSize`: setup and metrics
- `computeZoomScales`: calculates start/end CSS scale values for continuous zoom
- `setupEventListeners`: hidden textarea input, resize, focus management
- `handleInput`: reads textarea, collapses newlines, detects stage change, renders
- `render`: sets innerHTML with cursor anchor, positions cursor, updates transform and fade
- `updateTransform`: applies `translateY` + `scale` to `#text-world`
- `updateFade`: shows/hides gradient overlay when content scrolls off top
- `detectRTL`: toggles RTL for Hebrew, flips transform-origin
- `saveCurrentSession`: autosaves to localStorage

### `SessionStorage` object
Simple localStorage wrapper. `loadAll()`, `saveAll()`, `deleteSession()`.

### `sessionsUI` object
Manages the past-sessions viewer. List → detail → delete flow. Separate screen from writing.

## Coding Standards

- Vanilla JS only. No libraries, no bundler.
- No TypeScript. No JSX.
- Comments: concise one-line `//` only where logic isn't obvious.
- Naming: camelCase methods and variables. No abbreviations.
- Booleans: verb-prefixed (`isRTL`, `hasHebrew`).
- No defensive null checks for things that must exist.

## Scope Discipline

Do not:
- Add systems not requested.
- Refactor unrelated code while fixing something else.
- Invent future-proofing.

Do:
- Solve the requested problem clearly.
- Mention adjacent improvements separately if relevant.

## Testing

No test framework. Open `index.html` in a browser directly and verify manually.
Use `console.log` for temporary debugging; remove before finishing.

## Project-Specific Notes

- Font: `Courier New`, monospace. Intentional.
- Zoom: text rendered at 48px base, CSS `transform: scale()` zooms out continuously with ease-out curve.
- Input: hidden `<textarea>` for cross-platform compatibility (desktop + mobile keyboards).
- Cursor: `div` inside `#text-world`, positioned via anchor span, scales with transform.
- RTL: toggled automatically when Hebrew characters are detected. Transform-origin flips.
- Sessions: autosaved to localStorage. Viewable via a corner button (deliberately subtle).
- Each session starts blank — no "continue" flow.
