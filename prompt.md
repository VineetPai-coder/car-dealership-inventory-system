# Initial Project Planning — Before Phase 0

## Prompt

I have attached an assignment document in the project folder for a car dealership inventory system. Make a plan such that the frontend, backend, and APIs can be done in different phases and tested and built as given in the document.

## AI Output

Here is a structured, phase-by-phase development and testing plan tailored for a Car Dealership Inventory System. This plan splits the backend, APIs, database, and frontend into distinct, manageable milestones following a strict Test-Driven Development (TDD) and clean architecture approach.

## Car Dealership Inventory System — Phased Development & Testing Plan

### Phase 0: Project Scaffolding, Architecture & Test Harness

*Objective: Establish project foundation, folder structure, and testing infrastructure.*

- **Backend Scaffolding:** Initialize Node.js, TypeScript, and Express. Split entry points into `src/app.ts` (middleware and routes) and `src/server.ts` (server listener).
- **Database Setup:** Initialize `node:sqlite` for local, lightweight persistent data storage.
- **Testing Harness:** Configure Jest and Supertest with ESM support for integration testing.
- **Deliverables:** Working server startup, configured `tsconfig.json`, `package.json`, and passing baseline test runner.

### Phase 1: User Authentication & Security Module

*Objective: Implement secure user registration, login, and JWT-based authorization.*

- **TDD Step - RED:** Write unit and integration tests (`auth.test.ts`) covering:
  - Successful user registration with Zod validation and email normalization.
  - Hashing passwords using `bcryptjs`.
  - Login credential verification and JWT token issuance.
  - Rejection of invalid credentials or duplicate emails.
  - *Confirm all tests fail cleanly.*
- **TDD Step - GREEN:** Implement minimum code in `src/models/user.model.ts`, `src/services/auth.service.ts`, and `src/controllers/auth.controller.ts` to make tests pass.
- **TDD Step - REFACTOR:** Clean up helper functions, extract constants, and ensure 100% test pass rate.
- **Deliverables:** Secure `/api/auth/register` and `/api/auth/login` endpoints with complete test coverage.

### Phase 2: Vehicle Inventory & CRUD Operations API

*Objective: Build core vehicle management endpoints linked to authenticated users.*

- **TDD Step - RED:** Write integration tests (`vehicle.test.ts`) covering:
  - Retrieving all vehicles (`GET /api/vehicles`) with filtering and pagination.
  - Adding a new vehicle (`POST /api/vehicles`) with required fields (make, model, year, price, mileage, VIN) and Zod validation.
  - Updating vehicle details (`PUT /api/vehicles/:id`).
  - Deleting a vehicle (`DELETE /api/vehicles/:id`).
  - Unauthorized access checks (ensuring unauthenticated users cannot modify inventory).
  - *Confirm all tests fail cleanly.*
- **TDD Step - GREEN:** Implement `src/models/vehicle.model.ts`, `src/services/vehicle.service.ts`, and `src/controllers/vehicle.controller.ts` using SQLite and Zod.
- **TDD Step - REFACTOR:** Optimize database queries, error handling, and JSDoc documentation.
- **Deliverables:** Fully operational CRUD API endpoints backed by a robust, passing test suite.

### Phase 3: Frontend Integration & Tailwind UI Polish

*Objective: Build user-facing views and wire them up to the backend REST APIs.*

- **Frontend Scaffolding:** Set up Tailwind CSS for modern, responsive styling.
- **Client-Side Auth Flow:** Build login and registration forms that store and manage JWT tokens securely in browser storage.
- **Vehicle Dashboard UI:** Create interactive dashboard views allowing users to:
  - Browse available car listings in real time.
  - Add new vehicle inventory via modal or form.
  - Filter and search listings by make, model, or price.
  - Edit or delete existing listings.
- **End-to-End Verification:** Run full integration checks and generate test coverage reports.

### Phase 4: Documentation, AI Usage & Production Deployment

*Objective: Prepare deliverables, documentation, and cloud hosting.*

- **Documentation:** Finalize `PROMPTS.md` with all development prompts and responses. Complete `README.md` with setup instructions, API specs, and the mandatory **My AI Usage** reflection.
- **Deployment:** Configure build and start scripts (`npm run build`, `npm start`) and deploy the full-stack system to cloud hosting (e.g., Render).

Would you like to adjust any of these phases or dive straight into a specific task?

---

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

---

# Phase 3 RED — Prompt and AI Output

## Prompt

Begin Phase 3 using strict TDD. Write frontend tests for login and registration forms submitting to the backend endpoints, plus a protected vehicle inventory dashboard that renders car listings, search filters, and CRUD action buttons. Run the tests and confirm that the frontend tests fail. Record this prompt and the AI output in `prompt.md`.

## AI Output

Added React and React DOM, Testing Library, user-event, and Jest's jsdom environment, and updated Jest to discover the client tests and transform TSX. Added eight frontend tests covering login, registration, unauthenticated access, admin inventory rendering, search submission, vehicle creation, vehicle updates, and vehicle deletion.

RED verification: the combined test run reports 5 suites total, 8 frontend tests failing and 103 existing backend tests passing (111 total). The failures are expected because `client/src/App.tsx` is still the placeholder and has no auth forms or inventory dashboard. The frontend is ready for the GREEN implementation step.

---

# Phase 3 GREEN — Prompt and AI Output

## Prompt

Implement the GREEN step for Phase 3: build a minimal Tailwind frontend with login and registration forms that submit to the backend and store the JWT, plus a protected vehicle dashboard that loads, displays, creates, updates, and deletes vehicles through the backend API. Update `prompt.md` with this prompt and the AI output.

## AI Output

Replaced the client placeholder with accessible sign-in and registration forms, a responsive vehicle inventory dashboard, search filters, inventory cards, and admin-only create/edit/delete actions. Added an API service that sends stored JWTs as bearer tokens, persists tokens returned from login and registration, validates session state through `/api/auth/me`, and calls the existing vehicle endpoints. Added minimal responsive Tailwind styling.

Verification: all 5 test suites pass (111/111). The Vite client production build and strict client TypeScript check pass. The client tests also pass with Jest open-handle detection enabled.

---

# Phase 3 REFACTOR — Prompt and AI Output

## Prompt

Refactor the frontend to remove duplicated code, modularize the components, improve responsive Tailwind styling, and provide proper error and loading states while keeping all tests green. Update `prompt.md` with this input and the AI output.

## AI Output

Split the client UI into focused authentication, inventory dashboard, filter, vehicle card, and vehicle editor components. Shared form styling now uses common Tailwind class constants. Improved small-screen spacing, dashboard grids, and modal scrolling. Separated authentication, inventory loading, search, save, and delete states; added visible API error feedback for sign-in, search, and vehicle saves. Added coverage for pending inventory loads, failed sign-in, search errors, and editor save errors.

Verification: all 5 test suites pass (115/115), the full Jest run exits cleanly with open-handle detection, the Vite production build succeeds, and the client TypeScript check passes.
