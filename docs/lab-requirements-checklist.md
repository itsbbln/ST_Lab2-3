# Laboratory Requirements Checklist

Status reflects the source and tests in this repository on 2026-10-08. “Implemented” means the behavior or artifact is present; it does not mean every role/path has exhaustive automated coverage.

| Laboratory requirement | Status | Evidence / remaining work |
| --- | --- | --- |
| Backend-only REST API with versioned resource routes | Implemented | Laravel routes are under `/api/v1`; the separate frontend is not needed for the lab. |
| Relational database, migrations, keys, constraints, indexes | Implemented | PostgreSQL config and migrations define foreign keys, unique student/course codes, unique enrollment pairs, unique grade per enrollment, and search indexes. |
| Minimum demo seed data | Implemented | `DatabaseSeeder` creates 6 users (above the minimum of 5), 3 programs, 100 students, 20 courses, 2 terms, 20 offerings, 200 enrollments, and 100 grades. |
| Authentication: login, logout, current user, password hashing | Implemented | Sanctum bearer tokens; hashed `password` attribute; invalid credentials and missing auth return 401; logout deletes the current token. |
| Users and Roles administration | Implemented | Administrator-only account list/create/detail/update/deactivate endpoints manage allowed roles and status; student accounts require a unique linked profile, passwords are hashed/hidden, and the last active administrator is protected. Role values use the accepted `role` field rather than a separate roles table. |
| Role-based and object-level authorization | Implemented; verify per guide | Admin/registrar/staff management, instructor assignment scope, and student self-only enrollment/grade/profile access. Regression tests cover student and instructor boundaries. |
| Students CRUD, validation, and self-only profile access | Implemented | Unique student numbers, program FK, field validation, soft deactivation, partial PATCH, and list search/filter/sort/page. |
| Programs, courses, academic terms CRUD | Implemented | Versioned list/create/detail/update/deactivate routes with validation. |
| Offerings, enrollments, grades, nested views, academic record | Implemented | Domain routes and relationships are present; duplicate enrollment is rejected with 409 and grades are limited to 0-100. |
| Search, filters, sorting, pagination | Implemented | Students, programs, courses, terms, offerings, enrollments, grades, and offering rosters support bounded pagination and allowlisted sorting; applicable lists support search/filter parameters. |
| Consistent validation and HTTP error responses | Implemented, with production configuration caveat | API validation/auth/HTTP errors use JSON. Set `APP_DEBUG=false` outside local development so unexpected errors do not expose internals. |
| Automated tests for critical security/domain flows | Implemented; expand edge-case coverage as needed | `php artisan test` covers authentication, student create/update and validation, role/object-level access, collection query features, enrollment conflicts, grade validation, not-found responses, and administrator-only user account management. |
| OpenAPI contract | Implemented as a static contract | See [openapi.yaml](openapi.yaml). It documents the versioned endpoint groups and bearer authentication; no interactive Swagger UI route is configured. |
| Importable Postman collection | Implemented | Import [student-information-api.postman_collection.json](../postman/collections/student-information-api.postman_collection.json); use the seeded-data workflow in the guide. |
| ERD | Implemented | See [erd.md](erd.md). |
| Safe environment template and setup instructions | Implemented | `.env.example` contains placeholders; [README.md](../README.md) and [verification-guide.md](verification-guide.md) explain setup and use. |
| Meaningful Git history and live technical demonstration | Not verified | Repository history and the student's ability to explain the system must be demonstrated by the student. |

## Key Verification Commands

```powershell
php artisan migrate --seed
php artisan test
php artisan route:list --path=api/v1
```

Use `php artisan migrate:fresh --seed` only against a disposable database; it drops all tables first.

Follow [verification-guide.md](verification-guide.md) for the role-by-role API walkthrough and explanation prompts.