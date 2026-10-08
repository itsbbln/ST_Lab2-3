# Verification and Learning Guide

This walkthrough uses PowerShell and the seeded PostgreSQL database. It tests expected results and gives a short explanation prompt for each system area.

## 1. Configure and Start

Prerequisites: PHP 8.2+, Composer, PostgreSQL, and the PHP `pdo_pgsql` extension.

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Create the `student_information` database, then set `DB_USERNAME` and `DB_PASSWORD` in `.env`. Keep `.env` private. Apply migrations and load the demonstration data:

```powershell
php artisan migrate --seed
php artisan serve
```

To reset all data and rebuild the demonstration database, use `php artisan migrate:fresh --seed` only after confirming the configured database is disposable. `migrate:fresh` drops every table in that database.

The last command keeps running in that terminal. The API base URL is `http://127.0.0.1:8000/api/v1`.

## 2. Check Server and Database

In another PowerShell window:

```powershell
$base = 'http://127.0.0.1:8000/api/v1'
Invoke-RestMethod "$base/health"
```

Expected: `success` is `True`, and the service identifies version `v1`. A successful health response checks that Laravel is serving requests; successful `migrate:fresh --seed` is the evidence that the configured database accepted schema/data operations.

**Explain:** What does `/api/v1` version, and why does the health response not prove every database query is healthy?

## 3. Inspect Seed Data and Documentation

The seeder creates five role accounts and the required entity counts. Open [openapi.yaml](openapi.yaml), [erd.md](erd.md), and import the Postman collection at [student-information-api.postman_collection.json](../postman/collections/student-information-api.postman_collection.json). The sample password for these local-only seeded accounts is `password`.

Accounts: `admin@example.com`, `registrar@example.com`, `staff@example.com`, `instructor1@example.com`, `instructor2@example.com`, and `student@example.com`.

## 4. Authenticate and Test the 401 Boundary

```powershell
$login = Invoke-RestMethod -Method Post "$base/auth/login" -ContentType 'application/json' -Body (@{ email = 'admin@example.com'; password = 'password' } | ConvertTo-Json)
$token = $login.data.token
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod "$base/auth/me" -Headers $headers
```

The response includes a bearer token and user without a password hash. `GET /students` without `$headers` must return HTTP 401. A wrong password at `/auth/login` must also return 401; missing/malformed required fields are validation errors (422).

**Explain:** Sanctum identifies the caller from the token. Authentication answers “who are you?”; it does not itself decide whether that role can mutate a resource.

## 5. Create, Validate, Search, and Partially Update a Student

```powershell
$program = Invoke-RestMethod "$base/programs?search=BSIT" -Headers $headers
$programId = $program.data[0].id
$studentBody = @{ student_number = 'DEMO-90001'; first_name = 'Ada'; last_name = 'Lovelace'; program_id = $programId; year_level = 1; email = 'ada.demo@example.test' } | ConvertTo-Json
$student = Invoke-RestMethod -Method Post "$base/students" -Headers $headers -ContentType 'application/json' -Body $studentBody
$studentId = $student.data.id
Invoke-RestMethod "$base/students?search=ada&program_id=$programId&sort=last_name&page=1&per_page=10" -Headers $headers
Invoke-RestMethod -Method Patch "$base/students/$studentId" -Headers $headers -ContentType 'application/json' -Body (@{ year_level = 2 } | ConvertTo-Json)
```

Expected: creation returns 201; search/filter/sort/page returns a `data` list plus `meta`; the one-field PATCH returns 200. Repeating the create with the same student number or sending an invalid email returns 422 and does not create a duplicate.

**Explain:** Request validation prevents invalid input; the unique database constraint independently protects integrity even if another code path bypassed validation.

## 6. Verify Role and Object-Level Access

Try `POST /programs` as `student@example.com`: expected 403. Then log in as the seeded student and request `/students/1/academic-record` and `/students/2/academic-record`: the seeded student account is linked to its own first student profile, so its own record succeeds and the other student's record returns 403. As `instructor1@example.com`, `/course-offerings` only lists offerings assigned to that instructor; requesting another instructor's offering detail must return 403.

Use the Postman collection or replace `$token` in `$headers` after each role's login. Do not infer permission from a hidden UI control: call the API directly.

**Explain:** Which controller query scopes collection results, and which check protects a detail URL when an attacker changes an ID?

## 7. Verify Course, Term, Offering, Enrollment, and Grade Flow

Use `GET /courses`, `GET /academic-terms`, and `GET /course-offerings` to inspect seeded IDs. An instructor ID can be obtained from an offering's `instructor.id`. Use admin/registrar for setup writes:

1. Create a course and academic term if you need a clean demonstration pair.
2. Create a course offering using valid `course_id`, `academic_term_id`, and an instructor account ID.
3. Enroll a student using `student_id` and the new `course_offering_id`.
4. Repeat that enrollment. Expected: 409 Conflict, with one enrollment row only.
5. Submit a grade for that enrollment. Values outside 0-100 return 422; a valid grade returns 201.
6. As the assigned instructor, update that grade. As a different instructor, attempt the same update and expect 403.
7. Retrieve `/students/{id}/academic-record` and inspect the term-grouped enrollment/grade data.

The API will not accept nonexistent foreign-key IDs (422), duplicate enrollments (409), or a full/closed offering (409).

**Explain:** What is the database unique key for enrollments? Why is the grade attached to an enrollment rather than directly to a student/course pair?

## 8. Verify Pagination, Sorting, and Failure Responses

Use requests such as:

```text
GET /students?search=demo&status=active&sort=-last_name&page=2&per_page=10
GET /courses?search=information&status=active&sort=course_code&per_page=5
GET /students/999999
```

Expected: pagination metadata includes current page, page size, total, and last page; unsupported sort fields return 422; a missing model returns 404; unauthenticated and forbidden requests return 401 and 403. `per_page` is bounded to 1-100.

**Explain:** Why is sort input allowlisted instead of concatenated directly into SQL? What is the difference between 401, 403, 404, 409, and 422?

## 9. Run the Automated Tests

In the project terminal:

```powershell
php artisan test
```

The test configuration uses an in-memory SQLite database, so these tests do not modify the PostgreSQL demo data. The tests exercise authentication, student CRUD validation, role/object access, collection search/filter/page, enrollment conflicts, grade validation, logout, and not-found responses.

## 10. Explain the Main Code Path

Trace one request end-to-end while you demonstrate it:

1. `routes/api.php` maps `/api/v1/...` and applies Sanctum and role middleware.
2. A controller validates input and checks the caller's role/resource ownership.
3. Eloquent models express relationships and persist through parameterized ORM operations.
4. Migrations define the durable constraints; the seeder supplies repeatable demonstration rows.
5. Feature tests issue HTTP requests and assert both status and persisted/returned data.
6. `docs/openapi.yaml`, the ERD, and the Postman collection describe and exercise the external contract.

Before the demonstration, be ready to explain one security check and one database constraint, then make a small change (for example, add a filter or a validation rule) and rerun the related test.