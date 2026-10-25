# Phase 2 Refactor — Prompt and AI Answer

## Prompt

For refactoring, clean up code duplication, optimize SQLite queries, and add robust error handling while keeping the entire test suite fully green.

## AI Answer

Phase 2 was refactored with optional `limit` (1–100) and nonnegative `offset` pagination for vehicle search. Pagination is applied after filtering, uses newest-first ordering, and preserves the existing unpaginated behavior when omitted. The vehicle service uses normalized payloads and cached prepared statements, and repeated route error handling was consolidated into a typed shared handler.

There are no vehicle model or controller files in this checkout; vehicle logic lives in the service and routes.

Verification: all 4 test suites passed (103/103). The server TypeScript check and `git diff --check` passed.

Suggested commit:

```text
refactor(vehicles): add cached queries and paginated search

Co-authored-by: Google Gemini <gemini@users.noreply.github.com>
```

For Phase 3, use `client/src/App.tsx` as the frontend entry point; it is currently a placeholder. Vite already proxies `/api` to the backend.
