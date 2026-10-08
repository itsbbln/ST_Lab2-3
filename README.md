# Student Information Management API

Backend-only REST API for the AI-assisted framework-based REST API laboratory, built with Laravel 12, Sanctum, and PostgreSQL.

## Current Implementation

- Laravel project scaffold with PostgreSQL configuration.
- Sanctum token authentication foundation.
- Versioned routes under `/api/v1`.
- Normalized migrations for users, programs, students, courses, academic terms, course offerings, enrollments, and grades.
- Programs and Students CRUD endpoints with validation, search, filtering, sorting, and pagination.
- Courses, academic terms, course offerings, enrollments, grades, and academic-record endpoints.
- Role and object-level authorization for administrators, registrars, instructors, and students.
- Deterministic seed data meeting the laboratory demonstration counts.
- Case-insensitive search, allowlisted filters and sort fields, and bounded pagination on collections.
- OpenAPI contract, importable Postman collection, ERD, lab checklist, and a role-by-role verification guide.

## Prerequisites

- PHP 8.2 or newer with `pdo_pgsql` and `pgsql` enabled.
- Composer.
- PostgreSQL 14 or newer.

## Setup

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Create the `student_information` PostgreSQL database, then set `DB_USERNAME` and `DB_PASSWORD` in `.env`. Do not commit `.env`. Apply migrations and load seed data with:

```powershell
php artisan migrate --seed
php artisan serve
```

The API health check is available at `GET http://127.0.0.1:8000/api/v1/health`.

API documentation is available in [docs/openapi.yaml](docs/openapi.yaml). The importable Postman collection is [postman/collections/student-information-api.postman_collection.json](postman/collections/student-information-api.postman_collection.json). The schema diagram is [docs/erd.md](docs/erd.md), the requirement status is [docs/lab-requirements-checklist.md](docs/lab-requirements-checklist.md), and the hands-on test and explanation walkthrough is [docs/verification-guide.md](docs/verification-guide.md).

## API Routes

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `api/v1/programs` CRUD
- `api/v1/students` CRUD
- `api/v1/courses` CRUD
- `api/v1/academic-terms` CRUD
- `api/v1/course-offerings` CRUD
- `api/v1/enrollments` and nested enrollment views
- `api/v1/grades` and nested grade views
- `api/v1/students/{id}/academic-record`

Protected routes require `Authorization: Bearer <token>`. Students can access their own profile and academic records only; instructors can access offerings and grades assigned to them; administrators and registrars manage records. Collection routes use `page` and `per_page` (maximum 100), `sort` (prefix `-` for descending), and resource-specific filters/search.

Seeded accounts use the password `password`:

- `admin@example.com` (administrator)
- `registrar@example.com` (registrar)
- `staff@example.com` (staff)
- `instructor1@example.com` (instructor)
- `instructor2@example.com` (instructor)
- `student@example.com` (student)

Run the automated suite (tests use in-memory SQLite and do not modify your PostgreSQL demo data) with:

```powershell
php artisan test
```

## Lab Deliverables and Walkthrough

- Requirements status: [docs/lab-requirements-checklist.md](docs/lab-requirements-checklist.md)
- API contract: [docs/openapi.yaml](docs/openapi.yaml)
- ERD: [docs/erd.md](docs/erd.md)
- Postman collection: [postman/collections/student-information-api.postman_collection.json](postman/collections/student-information-api.postman_collection.json)
- Step-by-step API tests and explanation prompts: [docs/verification-guide.md](docs/verification-guide.md)

## Development Notes

AI assistance is used for bounded scaffolding, schema review, validation patterns, and test planning. Generated code is reviewed, syntax-checked, and validated through Laravel route and migration checks before acceptance.

---


<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
