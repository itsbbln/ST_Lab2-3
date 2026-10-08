# Student Information Management System

A student information management application built for the AI-assisted REST API and frontend integration laboratory activities. It contains two separate applications:

- **Backend:** Laravel 12 REST API, Sanctum bearer-token authentication, and PostgreSQL.
- **Frontend:** React 18/Vite browser client that consumes the API. It has no direct database connection.

The backend is authoritative for stored data, validation, authentication, and authorization. API routes are versioned under `/api/v1`.

## Technology and Prerequisites

| Area | Technology | Requirements |
| --- | --- | --- |
| Backend | PHP, Laravel, Sanctum | PHP 8.2+, Composer, and PHP `pdo_pgsql`/`pgsql` extensions |
| Database | PostgreSQL | PostgreSQL 14+ and a local database/user |
| Frontend | React, Vite, Vitest | Node.js 20+ and npm |
| API testing | Postman | Import the collection at `postman/collections/student-information-api.postman_collection.json` |

## Features

- Authentication: login, logout/token revocation, current-user endpoint, hashed passwords, and active-account enforcement.
- User and role administration: administrators can list, create, view, update, and deactivate accounts. Student accounts must link to one student profile; passwords are never returned. The final active administrator cannot be demoted or deactivated.
- Academic resources: students, programs, courses, academic terms, course offerings, enrollments, grades, and term-grouped academic records.
- Server-side role and object-level access control for administrators, registrars, staff, instructors, and students.
- Validated CRUD and academic transactions, duplicate-enrollment conflict handling, and referential integrity.
- Backend-supported search, filters, allowlisted sorting, and bounded pagination.
- Role-aware frontend screens, protected routes, loading/empty/error states, form feedback, and responsive layouts.

## Run the Backend

Run these commands from the repository root in PowerShell.

### 1. Install dependencies and configure the environment

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Create a PostgreSQL database named `student_information` (for example, `createdb -U postgres student_information`). Set `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` in `.env` to match your local PostgreSQL setup. Keep `.env` private and never commit database credentials or tokens.

### 2. Apply the schema and load demonstration data

```powershell
php artisan migrate --seed
```

The seeder creates the minimum demonstration quantities or more: 6 user accounts, 3 programs, 100 students, 20 courses, 2 academic terms, 20 course offerings, 200 enrollments, and 100 grades. To rebuild all data, use `php artisan migrate:fresh --seed` **only** with a disposable database because this command drops its tables.

### 3. Start and check the API

```powershell
php artisan serve
```

The default API base URL is `http://127.0.0.1:8000/api/v1`; its health endpoint is `GET /health`. For example:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```

## Run the Frontend

Keep the backend running, open a second PowerShell terminal, and run:

```powershell
Set-Location frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`. `VITE_API_BASE_URL` in `frontend/.env` configures the API origin and defaults to `http://127.0.0.1:8000/api/v1`. This is public client configuration, not a place for secrets. If the frontend and backend use different origins, allow the development frontend origin in the backend's CORS configuration; do not disable CORS security globally.

## Demonstration Accounts

After seeding, these local demonstration accounts use the password `password`:

| Email | Role |
| --- | --- |
| `admin@example.com` | Administrator |
| `registrar@example.com` | Registrar |
| `staff@example.com` | Staff |
| `instructor1@example.com` | Instructor |
| `instructor2@example.com` | Instructor |
| `student@example.com` | Student |

These are seeded local accounts only. Do not use the sample password or accounts in a deployed environment.

## API Overview and Access

All resource paths below are relative to `/api/v1`. Protected routes require `Authorization: Bearer <token>`; obtain a token from `POST /auth/login`.

| Resource | Endpoints | Access summary |
| --- | --- | --- |
| Authentication | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | Login is public; the other routes require authentication. |
| Users | `GET/POST /users`, `GET/PATCH/PUT/DELETE /users/{id}` | Administrator only. DELETE deactivates the account. |
| Students | `/students` and `/students/{id}` | Management roles manage records; students and instructors have restricted, server-scoped reads. |
| Programs | `/programs` and `/programs/{id}` | Management roles manage records. |
| Courses | `/courses` and `/courses/{id}` | Management roles manage records. |
| Academic terms | `/academic-terms` and `/academic-terms/{id}` | Management roles manage records. |
| Course offerings | `/course-offerings`, `/course-offerings/{id}`, `/course-offerings/{id}/students` | Management roles manage offerings; instructors see assigned offerings and rosters. |
| Enrollments | `/enrollments`, `/enrollments/{id}`, `/students/{id}/enrollments` | Management roles manage enrollment; instructors and students see only authorized records. |
| Grades | `/grades`, `/grades/{id}`, `/students/{id}/grades` | Management roles and assigned instructors may write grades; reads are role-scoped. |
| Academic record | `/students/{id}/academic-record` | Managers and the authorized student/instructor may read the requested record. |

Collections use `page` and `per_page` (maximum 100), allowlisted `sort` fields (prefix a field with `-` for descending order), and resource-specific search/filter parameters. Server-side authorization remains in force even when frontend navigation hides a route or action.

### Authenticate and call a protected endpoint

The API hashes passwords, issues a Sanctum bearer token after a successful login, returns the current account at `GET /auth/me`, and revokes the current token at `POST /auth/logout`. For example, with the API running:

```powershell
$base = 'http://127.0.0.1:8000/api/v1'
$login = Invoke-RestMethod -Method Post "$base/auth/login" `
  -ContentType 'application/json' `
  -Body (@{ email = 'admin@example.com'; password = 'password' } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.data.token)" }
Invoke-RestMethod "$base/auth/me" -Headers $headers
Invoke-RestMethod "$base/students?page=1&per_page=10" -Headers $headers
```

The API responds with JSON for API errors: `401` for missing or invalid authentication, `403` for a forbidden action, `404` for a missing resource, `409` for a conflicting operation (such as duplicate enrollment), and `422` for validation failures. Set `APP_DEBUG=false` in production and configure CORS to allow only the frontend origins that should access the API.

The frontend stores the Sanctum token in browser local storage for this laboratory client and clears it when the API returns `401`. Local storage is accessible to JavaScript; for a production deployment, evaluate a secure HttpOnly cookie/session design and appropriate XSS protections. The backend remains responsible for authorization.

## Database and Design

Migrations define the users, programs, students, courses, academic terms, course offerings, enrollments, and grades tables. Foreign keys preserve relationships; student numbers, course codes, enrollment pairs, and grade-to-enrollment links are unique. Eloquent models and controllers handle persistence and validation, while role middleware, policies, and scoped queries enforce permissions.

## Testing and Production Build

From the repository root, run the backend suite:

```powershell
php artisan test
```

Backend tests use in-memory SQLite and do not alter the PostgreSQL demonstration database. From the `frontend` directory, run frontend tests and create the production build:

```powershell
npm test
npm run build
```

The frontend build output is written to `frontend/dist/`. The automated tests cover authentication, validation, role and object-level access, collection queries, enrollment conflicts, user administration, frontend API error handling, authentication flows, protected routes, and server-driven student pagination.

## Lab Documentation and Deliverables

- [Backend requirement checklist](docs/lab-requirements-checklist.md)
- [OpenAPI contract](docs/openapi.yaml)
- [Entity relationship diagram](docs/erd.md)
- [Postman collection](postman/collections/student-information-api.postman_collection.json)
- [Backend verification and demonstration guide](docs/verification-guide.md)
- [Frontend setup README](frontend/README.md)
- [Frontend API integration map](frontend/docs/api-integration-map.md)
- [Frontend architecture note](frontend/docs/architecture.md)
- [Frontend AI development log](frontend/docs/ai-development-log.md)
- [Frontend requirement checklist and demonstration order](frontend/docs/lab2-checklist.md)

The verification guide and checklists distinguish implementation and automated test evidence from activities that still need to be demonstrated live, such as frontend/backend walkthroughs, screenshots, and the student's technical explanation.

## AI-Assisted Development and Verification

AI assistance was used for bounded scaffolding, schema and authorization review, API/client integration, validation and test planning, and documentation. Generated changes were reviewed against the laboratory requirements and the existing API behavior, then verified with Laravel feature tests, Vitest, PHP formatting checks, route checks, and the frontend production build. The task-specific record and human verification notes are in the [AI development log](frontend/docs/ai-development-log.md).
