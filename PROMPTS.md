# Car Dealership Inventory System — PROMPTS.md

> Raw, unedited AI chat logs for this project.
> All prompts are preserved verbatim as required by the submission guidelines.

---

## Session 1 — 2026-10-25

### Prompt 1 — Project Audit & Planning

**User:**
> i have attached the car dealership investory system document. i have also attached a payment gateway project in the project folder. before making any changes make a audit of the existing project and check if it can be converted to the car dealership project.
> also read the doc carefully and get all functional ,technical,git,documentation,submission requirements
> give a suitable architecture for the car delership inventory system
> give a phased implementation plan that prioritizes automated testing and test driven development
> list the exact tests needed and explain how we can demonstarte the red green refctor cycle and maintain a git history
> identify ll the deliverables needed like readme.md prompts.md test_report.md screenshots and ai use disclosure

**AI (Google Gemini / Antigravity):**

Performed a full audit of the existing payment gateway project (`server/index.ts`, `server/db.ts`, `src/App.tsx`, `src/styles.css`, `src/main.tsx`, `server/vendor.d.ts`). Extracted requirements from the attached DOCX document.

**Audit Finding:** The existing project is a Payment Gateway Marketplace ("Northstar Payments") built with Node.js/TypeScript/Express/SQLite/React. It can be converted to the Car Dealership Inventory System with medium refactoring — the structural mapping is almost 1:1 (products → vehicles, checkout → purchase, restock → restock). Auth, middleware, and transaction logic transfer directly.

**Key gaps identified:**
- No `package.json` or `tsconfig.json` present
- Zero tests exist — full TDD greenfield required
- Single-file backend (`index.ts`) needs splitting for testability
- `node:sqlite` should be replaced with `better-sqlite3` for Jest compatibility
- Custom CSS must be replaced with Tailwind as required by the spec

**Requirements extracted:**
- 10 API endpoints (auth + vehicles CRUD + purchase/restock)
- JWT authentication with role-based access (user/admin)
- Vehicle schema: id, make, model, category, price, quantity
- React + Tailwind + HTML5/CSS3 frontend
- TDD with visible Red-Green-Refactor in git history
- AI co-author trailer on every AI-assisted commit
- Deliverables: README.md (with "My AI Usage"), PROMPTS.md (raw logs), test report, screenshots, public git repo

**Architecture proposed:** Layered monorepo with `server/src/{app.ts, server.ts, db/, middleware/, routes/, services/, validators/, types/}` and `client/src/`.

**TDD phases:** 5 phases — scaffold → auth → vehicles CRUD → inventory ops → frontend.

**Tests listed:** 61 tests total (25 unit + 36 integration).

---

### Prompt 2 — Scaffolding & Architecture Setup

**User:**
> alr then lets proceed with scaffolding and architecture setup
> recreate package.json with all necessary dependencies
> setup tsconfig.json and tailwind css config
> structure backend entry point by splitting into app.ts and server.ts
> leave existing files clean and ready for tdd
> also i have attached the prompts.md file into the folder. keep updating it with each prompt with user input and your output

**AI (Google Gemini / Antigravity):**

Created the complete project scaffold:

**Config files created:**
- `package.json` — all dependencies (express, better-sqlite3, jsonwebtoken, bcryptjs, zod, cors, dotenv) + devDependencies (jest, ts-jest, supertest, typescript, vite, tailwindcss, autoprefixer, postcss, @vitejs/plugin-react, concurrently + all @types)
- `tsconfig.json` — ESNext/Bundler moduleResolution, strict mode
- `jest.config.ts` — ts-jest ESM preset, tests in `server/tests/`, coverage from `server/src/`
- `tailwind.config.js` — content points to `client/src/`, custom dealer colour palette
- `postcss.config.js` — Tailwind + Autoprefixer
- `vite.config.ts` — root: client/, proxy /api → :4000, builds to client/dist
- `.env.example` — PORT, JWT_SECRET, DATABASE_PATH, TEST_DATABASE_PATH=:memory:
- `.gitignore` — node_modules, dist, .env, *.db, coverage

**Backend structure created (all clean stubs ready for TDD):**
- `server/src/db/database.ts` — `createDatabase()` factory (supports :memory: for tests) + singleton export
- `server/src/types/index.ts` — all shared types + custom error classes (AppError, NotFoundError, ValidationError, OutOfStockError, ConflictError, UnauthorizedError, ForbiddenError)
- `server/src/validators/vehicle.schema.ts` — Zod schemas for vehicles, auth, search, restock
- `server/src/middleware/auth.ts` — `requireAuth`, `requireAdmin`, `signToken`
- `server/src/services/auth.service.ts` — STUB (all functions throw 'Not implemented')
- `server/src/services/vehicle.service.ts` — STUB (all functions throw 'Not implemented')
- `server/src/routes/auth.routes.ts` — thin route handlers wired to auth service
- `server/src/routes/vehicles.routes.ts` — thin route handlers wired to vehicle service
- `server/src/app.ts` — Express app factory (no listen — enables supertest)
- `server/src/server.ts` — entry point (only file that calls listen)

**Test infrastructure created:**
- `server/tests/helpers/db.ts` — `createTestDb()` + `seedUser()` + `seedVehicle()`
- `server/tests/helpers/auth.ts` — `userToken()` + `adminToken()` helpers
- `server/tests/unit/auth.service.test.ts` — 16 unit tests (all RED)
- `server/tests/unit/vehicle.service.test.ts` — 28 unit tests (all RED)
- `server/tests/integration/auth.routes.test.ts` — 11 integration tests (all RED)
- `server/tests/integration/vehicles.routes.test.ts` — 25 integration tests (all RED)

**Frontend scaffold:**
- `client/index.html` — HTML entry with Inter font
- `client/src/main.tsx` — React root with StrictMode
- `client/src/index.css` — Tailwind directives
- `client/src/App.tsx` — placeholder holding page

**Total tests written: 80 tests (all expected to be RED before service implementations)**
