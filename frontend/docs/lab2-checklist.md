# Laboratory II Frontend Checklist

Status checked 2026-10-08 against the lab PDF, frontend source, automated tests, and previously recorded live browser checks. `[x]` verified, `[~]` implemented in part or not fully demonstrated, `[ ]` still needs evidence/action.

## Project and API Integration

- [x] Separate React/Vite frontend under `frontend/`; Laravel remains the authoritative backend.
- [x] API base URL is configurable with `VITE_API_BASE_URL`; `.env.example` is present.
- [x] Shared API service sends the bearer token, parses JSON, preserves status/field errors, handles 401 expiry, and reports network failures.
- [x] Live browser login and dashboard use the seeded Laravel API; dashboard showed backend counts.
- [x] No frontend database connection or replacement backend.

## Authentication and Role-Aware Routes

- [x] Login, invalid-credential feedback, current-user bootstrap, and logout.
- [x] 401 clears client session and returns to login.
- [x] Protected routes and explicit access-denied/not-found views.
- [x] Navigation and actions adapt to administrator/registrar/staff, instructor, and student roles.
- [x] Student UI is read-only and displays only the student's server-scoped profile/records.
- [~] Bearer token is stored in local storage for this lab client. This is documented; for production, evaluate an HttpOnly cookie/session approach and XSS protections.

## Required Modules

- [x] Dashboard loads real role-appropriate API counts.
- [x] Students: list five records per page, create, edit, deactivate, academic record, search, program/year/status filters, sort, and backend-driven pagination. Compact icon actions keep rows short on narrow screens.
- [x] Programs: list and authorized create/edit/deactivate.
- [x] Courses: list and authorized create/edit/deactivate.
- [x] Academic Terms: list and authorized create/edit/deactivate.
- [x] Course Offerings: list/manage for managers; assigned offering and roster views for instructors. Instructor options come from API responses, not hardcoded IDs.
- [x] Enrollments: manager create/status changes; instructor assigned enrollments; student self-only list.
- [x] Grades: authorized create/edit and role-scoped viewing.
- [x] Academic Record: readable term-grouped display from the backend aggregate endpoint.
- [x] Profile displays authenticated identity and role.
- [x] Resource lists expose backend-backed search/filter/sort/pagination using each endpoint's supported query parameters; Students additionally has the required program/year/status filters.

## Forms, Errors, and Usability

- [x] Loading and empty states are present on data screens.
- [x] Backend student validation errors are shown next to relevant fields; other forms display API errors in their form alerts.
- [x] Duplicate/conflict and authorization responses are retained by the shared API error type and shown to the user.
- [x] Network failures have a controlled message; dashboard offers retry.
- [x] Destructive actions request confirmation.
- [x] Student academic record was checked at a 390px viewport; document width matched viewport after the responsive table fix.
- [~] Keyboard focus styling and semantic form labels exist, but a formal accessibility audit/test has not been run.

## Tests and Evidence

- [x] `npm test`: 2 test files passed, 9 tests passed. Covers API headers, 401/422/network handling, login/logout, role-protected routes, and server-driven student pagination.
- [x] `npm run build` completed successfully.
- [x] Live browser verification: administrator dashboard and seeded counts; student role navigation/self-only list; direct management-route denial; student academic record.
- [~] Capture and save screenshots of major modules, validation/forbidden states, and desktop/mobile views for submission.
- [~] Manually demonstrate a frontend duplicate enrollment, grade validation failure, and instructor grade update with the real API.
- [ ] Verify meaningful Git commit history and prepare to explain/modify the code during the technical defense.

## Required Frontend Documentation

- [x] Setup/run/build/test instructions: [README.md](../README.md).
- [x] Screen-to-endpoint-to-role map: [api-integration-map.md](api-integration-map.md).
- [x] AI tool, work summary, review, and evidence log: [ai-development-log.md](ai-development-log.md).
- [x] Architecture, routing, API client, authentication, and state strategy: [architecture.md](architecture.md).
- [x] Backend API contract: [OpenAPI document](../../docs/openapi.yaml).

## Suggested Live Demonstration Order

1. Start the API from the repository root with `php artisan serve`; confirm `/api/v1/health`.
2. Start the client from `frontend` with `npm run dev`; show `VITE_API_BASE_URL` from `.env`.
3. Show invalid login feedback, then sign in as `admin@example.com` with the local seed password `password`.
4. Show dashboard counts, then search/filter/sort/page the Students list.
5. Create a student, trigger duplicate/invalid input, edit it, and deactivate it.
6. Visit Programs, Courses, Academic Terms, Course Offerings, Enrollments, and Grades; show a roster and the academic record.
7. Sign in as `student@example.com`; show the own-profile/record experience and attempt a restricted route.
8. Sign in as an instructor; show assigned offerings, roster, and authorized grade editing.
9. Disconnect or stop the API briefly and show the network error; restore it and show the app recovers.
10. Run `npm test` and `npm run build`; explain the shared API client, auth state, route roles, and one test.
